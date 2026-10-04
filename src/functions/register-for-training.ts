/**
 * register-for-training — REST sidecar (F0.3b) Lambda, X5. POST
 * `{ trainingEventId, personId, companyId?, dietaryRequirements?, notes? }`
 * with bearer REGISTRATION_TOKEN; the RegisterForTrainingButton on the
 * Training Event record page calls it.
 *
 *   1. The event and the person must exist (404).
 *   2. The event must not have passed (409 event_passed; an event without a
 *      date is open).
 *   3. The person must not hold a registration for it already (409
 *      already_registered, with its id). A CANCELLED one does not count.
 *   4. Create the TrainingRegistration: REGISTERED, registrationDate now,
 *      company from the payload or else the person's own company.
 *
 * Responds 201 `{ registrationId, eventTitle, eventDate }`. Not yet: the
 * confirmation e-mail (confirmationSentAt stays empty until SES is wired).
 *
 * REGISTRATION_TOKEN is its own secret, not OPS_TOKEN: the front component
 * holds it (as an app variable), so it must only ever be able to register.
 * API Gateway's CORS settings must allow the Twenty origin.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (an API key whose role can read
 * trainingEvents / people and write trainingRegistrations), REGISTRATION_TOKEN.
 */
import { z } from 'zod';

import { TwentyApiError, configFromEnv, createRecord, eq, findRecords, type TwentyConfig } from '../../ops/lib/twenty-api';
import { eventHasPassed, isActiveRegistration, registrationName } from '../../shared/training.mjs';
import { json, readAuthorisedJson, type HttpEvent, type HttpResult } from './lib/sidecar';

export const RegistrationPayload = z.object({
  trainingEventId: z.uuid(),
  personId: z.uuid(),
  companyId: z.uuid().nullish(),
  dietaryRequirements: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type RegistrationPayload = z.infer<typeof RegistrationPayload>;

export type RegistrationResult = { registrationId: string; eventTitle: string; eventDate: string | null };

export class RegistrationError extends Error {
  constructor(
    readonly code: 'event_not_found' | 'person_not_found' | 'event_passed' | 'already_registered',
    readonly status: number,
    readonly detail: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = 'RegistrationError';
  }
}

export async function registerForTraining(config: TwentyConfig, p: RegistrationPayload, now = new Date()): Promise<RegistrationResult> {
  const [event] = await findRecords(config, 'trainingEvents', { filter: eq('id', p.trainingEventId), limit: 1 });
  if (!event) throw new RegistrationError('event_not_found', 404);
  const [person] = await findRecords(config, 'people', { filter: eq('id', p.personId), limit: 1 });
  if (!person) throw new RegistrationError('person_not_found', 404);

  const eventTitle = String(event.name ?? '');
  const eventDate = typeof event.date === 'string' ? event.date : null;
  if (eventHasPassed(eventDate, now)) throw new RegistrationError('event_passed', 409, { eventTitle, eventDate });

  const existing = await findRecords(config, 'trainingRegistrations', {
    filter: `and(${eq('trainingEventId', p.trainingEventId)},${eq('personId', p.personId)})`,
    limit: 20,
  });
  const active = existing.find(isActiveRegistration);
  if (active) throw new RegistrationError('already_registered', 409, { registrationId: active.id, eventTitle, eventDate });

  const companyId = p.companyId ?? (typeof person.companyId === 'string' ? person.companyId : null);
  const registration = await createRecord(config, 'trainingRegistrations', {
    name: registrationName(eventTitle, person.name as { firstName?: string; lastName?: string } | null),
    trainingEventId: p.trainingEventId,
    personId: p.personId,
    ...(companyId ? { companyId } : {}),
    status: 'REGISTERED',
    registrationDate: now.toISOString(),
    ...(p.dietaryRequirements ? { dietaryRequirements: p.dietaryRequirements } : {}),
    ...(p.notes ? { notes: p.notes } : {}),
  });
  return { registrationId: registration.id, eventTitle, eventDate };
}

export const handler = async (event: HttpEvent): Promise<HttpResult> => {
  const request = readAuthorisedJson(event, process.env.REGISTRATION_TOKEN);
  if ('error' in request) return request.error;
  const parsed = RegistrationPayload.safeParse(request.body);
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  try {
    return json(201, await registerForTraining(configFromEnv(), parsed.data));
  } catch (error) {
    if (error instanceof RegistrationError) return json(error.status, { error: error.code, ...error.detail });
    console.error('[register-for-training]', error instanceof TwentyApiError ? { message: error.message, body: error.body } : error);
    return json(502, { error: 'crm_unavailable' });
  }
};

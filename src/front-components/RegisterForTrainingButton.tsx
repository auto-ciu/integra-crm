/**
 * RegisterForTrainingButton — top of the Training Event record page (X5).
 *
 * STUB: staff type the attendee's e-mail, the component finds that Person and
 * POSTs to the register-for-training sidecar function. The button reads
 * "已报名 · Registered" once that person holds a registration. The full
 * flow (person picker, modal, confirmation e-mail) comes later.
 *
 * The endpoint comes from the app variables SIDECAR_URL and
 * REGISTRATION_TOKEN (src/index.ts). REGISTRATION_TOKEN can only register,
 * nothing else (see register-for-training.ts).
 */
import { useEffect, useState, type FormEvent } from 'react';
import { getApplicationVariable, useRecordId } from 'twenty-sdk/front-component';

import { defineFrontComponent } from '../lib/sdk';
import { IDS } from '../ids';
import { fetchTrainingEvent, findActiveRegistration, findPersonByEmail, type TrainingEventRecord } from '../lib/data';
import { card, font, muted } from '../lib/theme';
import { eventHasPassed } from '../../shared/training.mjs';

type State =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'registered'; who: string; eventTitle: string; eventDate: string | null }
  | { kind: 'already'; who: string }
  | { kind: 'error'; message: string };

type RegisterResponse = { registrationId?: string; eventTitle?: string; eventDate?: string | null; error?: string };

/** POST to <SIDECAR_URL>/register-for-training. */
async function postRegistration(body: { trainingEventId: string; personId: string; companyId: string | null }) {
  const baseUrl = (getApplicationVariable('SIDECAR_URL') ?? '').replace(/\/+$/, '');
  const token = getApplicationVariable('REGISTRATION_TOKEN');
  if (!baseUrl || !token) return { status: 0, json: { error: 'not_configured' } as RegisterResponse };
  const response = await fetch(`${baseUrl}/register-for-training`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: ((await response.json().catch(() => ({}))) ?? {}) as RegisterResponse };
}

const fullName = (name: { firstName: string | null; lastName: string | null } | null, fallback: string) =>
  [name?.firstName, name?.lastName].filter(Boolean).join(' ') || fallback;

export const RegisterForTrainingButton = () => {
  const recordId = useRecordId();
  const [event, setEvent] = useState<TrainingEventRecord | null>(null);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  useEffect(() => {
    if (!recordId) return;
    fetchTrainingEvent(recordId).then(setEvent, () => setEvent(null));
  }, [recordId]);

  const passed = eventHasPassed(event?.date ?? null);
  const done = state.kind === 'registered' || state.kind === 'already';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!recordId || !address || state.kind === 'busy') return;
    setState({ kind: 'busy' });
    try {
      const person = await findPersonByEmail(address);
      if (!person) {
        setState({ kind: 'error', message: `No contact with the e-mail ${address}. Add the person first.` });
        return;
      }
      const who = fullName(person.name, address);
      if (await findActiveRegistration(recordId, person.id)) {
        setState({ kind: 'already', who });
        return;
      }
      const { status, json } = await postRegistration({ trainingEventId: recordId, personId: person.id, companyId: person.companyId });
      if (status === 201) {
        setState({ kind: 'registered', who, eventTitle: json.eventTitle ?? event?.name ?? '', eventDate: json.eventDate ?? event?.date ?? null });
      } else if (json.error === 'already_registered') {
        setState({ kind: 'already', who });
      } else if (json.error === 'event_passed') {
        setState({ kind: 'error', message: 'This event has already taken place.' });
      } else if (json.error === 'not_configured') {
        setState({ kind: 'error', message: 'Registration is not set up yet (SIDECAR_URL / REGISTRATION_TOKEN).' });
      } else {
        setState({ kind: 'error', message: `Registration failed (${json.error ?? `HTTP ${status}`}).` });
      }
    } catch {
      setState({ kind: 'error', message: 'Registration failed: the CRM or the registration service is unreachable.' });
    }
  };

  const disabled = !recordId || passed || done || state.kind === 'busy';

  return (
    <form
      data-testid="register-for-training"
      onSubmit={submit}
      style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
    >
      <input
        type="email"
        required
        placeholder="Attendee e-mail · 参加者邮箱"
        value={email}
        disabled={passed || state.kind === 'busy'}
        onChange={(e) => {
          setEmail(e.target.value);
          if (state.kind !== 'busy') setState({ kind: 'idle' });
        }}
        style={{
          fontFamily: font.body,
          fontSize: 'var(--t-font-size-md, 13px)',
          color: 'var(--t-font-color-primary)',
          background: 'var(--t-background-primary)',
          border: '1px solid var(--t-border-color-medium)',
          borderRadius: 'var(--t-border-radius-sm, 4px)',
          padding: '6px 8px',
          minWidth: 220,
        }}
      />
      <button
        type="submit"
        disabled={disabled}
        style={{
          fontFamily: font.body,
          fontSize: 'var(--t-font-size-md, 13px)',
          fontWeight: 500,
          color: done ? 'var(--t-color-green11)' : 'var(--t-font-color-inverted)',
          background: done ? 'var(--t-color-green1)' : 'var(--t-color-blue)',
          border: `1px solid ${done ? 'var(--t-color-green9)' : 'var(--t-color-blue)'}`,
          borderRadius: 'var(--t-border-radius-sm, 4px)',
          padding: '6px 12px',
          cursor: disabled ? 'default' : 'pointer',
          opacity: passed ? 0.5 : 1,
        }}
      >
        {done ? '已报名 · Registered' : state.kind === 'busy' ? 'Registering…' : 'Register for Training'}
      </button>
      <span role="status" style={muted}>
        {passed && 'This event has already taken place.'}
        {!passed && state.kind === 'registered' &&
          `${state.who} is registered for ${state.eventTitle}${state.eventDate ? ` on ${state.eventDate}` : ''}${event?.location ? ` (${event.location})` : ''}.`}
        {!passed && state.kind === 'already' && `${state.who} is already registered for this event.`}
        {!passed && state.kind === 'error' && state.message}
      </span>
    </form>
  );
};

export default defineFrontComponent({
  universalIdentifier: IDS.frontComponents.registerForTrainingButton,
  name: 'RegisterForTrainingButton',
  description: 'Register a contact for this training event (stub)',
  component: RegisterForTrainingButton,
});

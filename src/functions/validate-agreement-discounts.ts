/**
 * validate-agreement-discounts — REST sidecar (F0.3b) Lambda, C2. POST
 * `{ clientPriceAgreementId }` with bearer OPS_TOKEN or DISCOUNT_CHECK_TOKEN;
 * the ValidateDiscountsButton on the agreement's Validation tab calls it.
 *
 * Loads the agreement, its lines, the price list and the active Discount
 * Rules, then for each line (shared/agreement-pricing.mjs):
 *   - standard price = the price point's annualFeeEur, less the AR + DPP
 *     bundle discount (15%) when the agreement holds both;
 *   - actual discount = agreed price vs that standard price (a line without
 *     an agreed price is at the standard price less its discountPercent);
 *   - the governing rule = the offering's own rule, else a global one, for
 *     agreements worth at least its minAgreementValueEur; above its
 *     maxDiscountPercent the rule's approver must approve.
 *
 * Read-only: it writes nothing. Responds 200 `{ clientPriceAgreementId,
 * agreementCode, agreementValueEur, violations: [{ lineName,
 * maxAllowedPercent, actualPercent, requiresApprover, … }], requiresApproval,
 * unchecked, problems, lines }`; 404 agreement_not_found.
 *
 * DISCOUNT_CHECK_TOKEN, not OPS_TOKEN, is what the front component holds (as
 * an app variable every CRM user's browser can read), so this function must
 * stay read-only. API Gateway's CORS settings must allow the Twenty origin.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (an API key whose role can read
 * clientPriceAgreements, agreementLines, offerings, pricePoints, bundleItems,
 * discountRules and workspaceMembers), OPS_TOKEN, DISCOUNT_CHECK_TOKEN.
 */
import { z } from 'zod';

import { TwentyApiError, configFromEnv, eq, findAllRecords, findRecords, type TwentyConfig, type TwentyRecord } from '../../ops/lib/twenty-api';
import { validateAgreementDiscounts } from '../../shared/agreement-pricing.mjs';
import { json, readAuthorisedJson, type HttpEvent, type HttpResult } from './lib/sidecar';

export const ValidatePayload = z.object({ clientPriceAgreementId: z.uuid() });
export type ValidatePayload = z.infer<typeof ValidatePayload>;

type Validation = ReturnType<typeof validateAgreementDiscounts>;

export type ValidationResult = Omit<Validation, 'lines'> & {
  clientPriceAgreementId: string;
  agreementCode: string | null;
  lines: Array<Pick<Validation['lines'][number], 'lineName' | 'offeringCode' | 'listPriceEur' | 'standardPriceEur' | 'agreedPriceEur' | 'discountPercent' | 'quantity'>>;
};

export class ValidateError extends Error {
  constructor(readonly code: 'agreement_not_found', readonly status: number) {
    super(code);
    this.name = 'ValidateError';
  }
}

export async function validateAgreement(config: TwentyConfig, p: ValidatePayload): Promise<ValidationResult> {
  const [agreement] = await findRecords(config, 'clientPriceAgreements', { filter: eq('id', p.clientPriceAgreementId), limit: 1 });
  if (!agreement) throw new ValidateError('agreement_not_found', 404);

  const [lines, offerings, pricePoints, bundleItems, rules] = await Promise.all([
    findAllRecords(config, 'agreementLines', { filter: eq('agreementId', agreement.id) }),
    findAllRecords(config, 'offerings'),
    findAllRecords(config, 'pricePoints'),
    findAllRecords(config, 'bundleItems'),
    findAllRecords(config, 'discountRules'),
  ]);
  const activeRules = rules.filter((r) => r.isActive !== false);
  const approverIds = [...new Set(activeRules.map((r) => r.approverId).filter((id): id is string => typeof id === 'string'))];
  const members: TwentyRecord[] = approverIds.length
    ? await findRecords(config, 'workspaceMembers', { filter: `id[in]:${JSON.stringify(approverIds)}`, limit: approverIds.length })
    : [];

  const result = validateAgreementDiscounts({ lines, offerings, pricePoints, bundleItems, rules: activeRules, members });
  return {
    clientPriceAgreementId: agreement.id,
    agreementCode: typeof agreement.agreementCode === 'string' ? agreement.agreementCode : null,
    ...result,
    lines: result.lines.map(({ lineName, offeringCode, listPriceEur, standardPriceEur, agreedPriceEur, discountPercent, quantity }) => ({
      lineName,
      offeringCode,
      listPriceEur,
      standardPriceEur,
      agreedPriceEur,
      discountPercent,
      quantity,
    })),
  };
}

export const handler = async (event: HttpEvent): Promise<HttpResult> => {
  const request = readAuthorisedJson(event, [process.env.DISCOUNT_CHECK_TOKEN, process.env.OPS_TOKEN]);
  if ('error' in request) return request.error;
  const parsed = ValidatePayload.safeParse(request.body);
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  try {
    return json(200, await validateAgreement(configFromEnv(), parsed.data));
  } catch (error) {
    if (error instanceof ValidateError) return json(error.status, { error: error.code });
    console.error('[validate-agreement-discounts]', error instanceof TwentyApiError ? { message: error.message, body: error.body } : error);
    return json(502, { error: 'crm_unavailable' });
  }
};

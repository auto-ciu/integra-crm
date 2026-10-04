/**
 * ValidateDiscountsButton — the Validation tab of the Client Price Agreement
 * record page (C2).
 *
 * "Check discounts" POSTs the agreement to the validate-agreement-discounts
 * sidecar function and shows the result: compliant, or each line over its
 * Discount Rule with the allowed and actual discount and who must approve.
 * Lines that could not be checked (no list price) and data problems (a price
 * point of another offering, …) are listed under it. Nothing is written.
 *
 * The endpoint comes from the app variables SIDECAR_URL and
 * DISCOUNT_CHECK_TOKEN (src/index.ts). DISCOUNT_CHECK_TOKEN can only run this
 * read-only check.
 */
import { useState } from 'react';
import { getApplicationVariable, useRecordId } from 'twenty-sdk/front-component';

import { defineFrontComponent } from '../lib/sdk';
import { IDS } from '../ids';
import { card, font, headline, label, muted } from '../lib/theme';

type Violation = { lineName: string; maxAllowedPercent: number; actualPercent: number; requiresApprover: string | null; ruleName: string };
type ValidateResponse = {
  agreementCode?: string | null;
  agreementValueEur?: number;
  violations?: Violation[];
  requiresApproval?: boolean;
  unchecked?: Array<{ lineName: string; reason: string }>;
  problems?: Array<{ lineName: string; problem: string }>;
  lines?: unknown[];
  error?: string;
};

type State =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'done'; result: ValidateResponse; at: Date }
  | { kind: 'error'; message: string };

/** POST to <SIDECAR_URL>/validate-agreement-discounts. */
async function postValidation(clientPriceAgreementId: string) {
  const baseUrl = (getApplicationVariable('SIDECAR_URL') ?? '').replace(/\/+$/, '');
  const token = getApplicationVariable('DISCOUNT_CHECK_TOKEN');
  if (!baseUrl || !token) return { status: 0, json: { error: 'not_configured' } as ValidateResponse };
  const response = await fetch(`${baseUrl}/validate-agreement-discounts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientPriceAgreementId }),
  });
  return { status: response.status, json: ((await response.json().catch(() => ({}))) ?? {}) as ValidateResponse };
}

const pct = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2)}%`;
const eur = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);

const cell = { padding: '4px 8px', borderBottom: '1px solid var(--t-border-color-light)', textAlign: 'left' as const };

export const ValidateDiscountsButton = () => {
  const recordId = useRecordId();
  const [state, setState] = useState<State>({ kind: 'idle' });

  const run = async () => {
    if (!recordId || state.kind === 'busy') return;
    setState({ kind: 'busy' });
    try {
      const { status, json } = await postValidation(recordId);
      if (status === 200) setState({ kind: 'done', result: json, at: new Date() });
      else if (json.error === 'not_configured') setState({ kind: 'error', message: 'Discount checks are not set up yet (SIDECAR_URL / DISCOUNT_CHECK_TOKEN).' });
      else if (json.error === 'agreement_not_found') setState({ kind: 'error', message: 'The sidecar cannot find this agreement.' });
      else setState({ kind: 'error', message: `Check failed (${json.error ?? `HTTP ${status}`}).` });
    } catch {
      setState({ kind: 'error', message: 'Check failed: the discount service is unreachable.' });
    }
  };

  const result = state.kind === 'done' ? state.result : null;
  const violations = result?.violations ?? [];

  return (
    <div data-testid="validate-discounts" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={run}
          disabled={!recordId || state.kind === 'busy'}
          style={{
            fontFamily: font.body,
            fontSize: 'var(--t-font-size-md, 13px)',
            fontWeight: 500,
            color: 'var(--t-font-color-inverted)',
            background: 'var(--t-color-blue)',
            border: '1px solid var(--t-color-blue)',
            borderRadius: 'var(--t-border-radius-sm, 4px)',
            padding: '6px 12px',
            cursor: state.kind === 'busy' ? 'default' : 'pointer',
          }}
        >
          {state.kind === 'busy' ? 'Checking…' : 'Check discounts · 检查折扣'}
        </button>
        <span role="status" style={muted}>
          {state.kind === 'idle' && 'Checks every line against the active discount rules. Nothing is changed.'}
          {state.kind === 'error' && state.message}
          {state.kind === 'done' &&
            `Checked ${state.at.toLocaleTimeString()}: ${result?.lines?.length ?? 0} line(s), agreement worth ${eur(result?.agreementValueEur ?? 0)}.`}
        </span>
      </div>

      {result && (
        <div style={headline}>
          {result.requiresApproval
            ? `${violations.length} line(s) need approval · 需要审批`
            : 'Within the discount rules · 符合折扣规则'}
        </div>
      )}

      {violations.length > 0 && (
        <table style={{ borderCollapse: 'collapse', fontFamily: font.body, fontSize: 'var(--t-font-size-md, 13px)', color: 'var(--t-font-color-primary)' }}>
          <thead>
            <tr style={label}>
              <th style={cell}>Line</th>
              <th style={cell}>Allowed</th>
              <th style={cell}>Actual</th>
              <th style={cell}>Approver</th>
              <th style={cell}>Rule</th>
            </tr>
          </thead>
          <tbody>
            {violations.map((v, i) => (
              <tr key={`${v.lineName}-${i}`}>
                <td style={cell}>{v.lineName}</td>
                <td style={cell}>{pct(v.maxAllowedPercent)}</td>
                <td style={{ ...cell, color: 'var(--t-color-tomato11)' }}>{pct(v.actualPercent)}</td>
                <td style={cell}>{v.requiresApprover ?? '—'}</td>
                <td style={cell}>{v.ruleName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(result?.unchecked?.length ?? 0) > 0 && (
        <div style={muted}>
          Not checked: {result?.unchecked?.map((u) => `${u.lineName} (${u.reason})`).join('; ')}
        </div>
      )}
      {(result?.problems?.length ?? 0) > 0 && (
        <div style={{ ...muted, color: 'var(--t-color-orange11)' }}>
          Fix: {result?.problems?.map((p) => `${p.lineName}: ${p.problem}`).join('; ')}
        </div>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: IDS.frontComponents.validateDiscountsButton,
  name: 'ValidateDiscountsButton',
  description: 'Check this agreement’s lines against the discount rules',
  component: ValidateDiscountsButton,
});

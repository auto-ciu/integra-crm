/**
 * RenewalBanner — top of the AR Mandate record page (Overview tab).
 *
 * Shows `Renews 14 Mar 2027 · 178 days` tinted by urgency: green (none),
 * neutral (watch), gold fill / gold11 text (due), tomato (overdue).
 *
 * Contract with crm/e2e/journey.spec.ts: the root element carries
 * data-testid="renewal-banner" and is rendered in EVERY state (loading, no
 * date, data error), so the journey can assert visibility as soon as the
 * component mounts. verify-model.mjs asserts the test id is present here.
 */
import { useEffect, useState } from 'react';
import { useRecordId } from 'twenty-sdk/front-component';

import { defineFrontComponent } from '../lib/sdk';
import { IDS } from '../ids';
import { fetchMandate, type MandateRecord } from '../lib/data';
import { card, font, label, muted, tints } from '../lib/theme';
import { daysUntil, renewalLine, urgencyForDays } from '../../shared/urgency.mjs';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; mandate: MandateRecord | null }
  | { kind: 'error'; message: string };

const URGENCY_COPY: Record<string, string> = {
  NONE: 'On track',
  WATCH: 'Watch',
  DUE: 'Renewal due',
  OVERDUE: 'Overdue',
};

export const RenewalBanner = () => {
  const recordId = useRecordId();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    if (!recordId) {
      setState({ kind: 'ready', mandate: null });
      return;
    }
    fetchMandate(recordId)
      .then((mandate) => !cancelled && setState({ kind: 'ready', mandate }))
      .catch((error: unknown) =>
        !cancelled && setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) }),
      );
    return () => {
      cancelled = true;
    };
  }, [recordId]);

  const renewalDate = state.kind === 'ready' ? state.mandate?.renewalDate ?? null : null;
  const days = daysUntil(renewalDate);
  // Prefer the nightly-computed urgency when present; fall back to live maths
  // so a mandate edited today is tinted correctly before the job runs.
  const urgency =
    (state.kind === 'ready' && state.mandate?.urgency && state.mandate.urgency !== 'NONE'
      ? state.mandate.urgency
      : urgencyForDays(days)) as keyof typeof tints;
  const tint = tints[urgency] ?? tints.NONE;

  const line =
    state.kind === 'loading'
      ? 'Loading renewal…'
      : state.kind === 'error'
        ? 'Renewal data unavailable'
        : renewalLine(renewalDate);

  return (
    <div
      data-testid="renewal-banner"
      data-urgency={urgency}
      role="status"
      style={{
        ...card,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: tint.background,
        borderColor: tint.border,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: tint.glyph,
          flex: '0 0 auto',
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ ...label, color: tint.text }}>{URGENCY_COPY[urgency] ?? 'Renewal'}</span>
        <span
          style={{
            fontFamily: font.headline,
            fontSize: 'var(--t-font-size-lg, 16px)',
            fontWeight: 600,
            color: tint.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {line}
        </span>
        {state.kind === 'error' && (
          <span style={muted} title={state.message}>
            Check the AR Mandate’s renewal date field.
          </span>
        )}
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: IDS.frontComponents.renewalBanner,
  name: 'RenewalBanner',
  description: 'Renewal countdown with urgency tint for an AR Mandate',
  component: RenewalBanner,
});

/**
 * RenewalCountWidget — Today dashboard.
 *
 * Headline number: mandates whose renewal date falls within the next 90 days.
 * Below it, the two clocks the business runs on: Canton Fair launch (Oct 2026)
 * and the Battery DPP mandate (18 Feb 2027).
 *
 * Contract with crm/e2e/journey.spec.ts: root carries
 * data-testid="renewal-count-widget" and the title reads "Renewals < 90 days"
 * (the spec also accepts that text as a fallback). Rendered in every state.
 */
import { useEffect, useState } from 'react';

import { defineFrontComponent } from '../lib/sdk';
import { IDS } from '../ids';
import { fetchMandatesWithRenewalDate, type MandateRecord } from '../lib/data';
import { card, font, headline, label, muted, tints } from '../lib/theme';
import {
  DUE_WINDOW_DAYS,
  KEY_DATES,
  daysUntil,
  formatDayMonthYear,
  renewsWithin,
  urgencyForDays,
} from '../../shared/urgency.mjs';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; mandates: MandateRecord[] }
  | { kind: 'error'; message: string };

const Countdown = ({ iso, title }: { iso: string; title: string }) => {
  const days = daysUntil(iso);
  const tint = tints[urgencyForDays(days)];
  const copy =
    days === null ? '—' : days < 0 ? `${-days} days ago` : days === 0 ? 'today' : `${days} days`;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '8px 12px',
        borderRadius: 'var(--t-border-radius-sm, 4px)',
        background: tint.background,
        border: '1px solid var(--t-border-color-light)',
        minWidth: 0,
      }}
    >
      <span style={label}>{title}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          aria-hidden="true"
          style={{ width: 8, height: 8, borderRadius: '50%', background: tint.glyph, flex: '0 0 auto' }}
        />
        <span style={{ fontFamily: font.headline, fontWeight: 600, color: tint.text }}>{copy}</span>
      </span>
      <span style={muted}>{formatDayMonthYear(iso)}</span>
    </div>
  );
};

export const RenewalCountWidget = () => {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchMandatesWithRenewalDate()
      .then((mandates) => !cancelled && setState({ kind: 'ready', mandates }))
      .catch((error: unknown) =>
        !cancelled && setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) }),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  const due = state.kind === 'ready' ? state.mandates.filter((m) => renewsWithin(m.renewalDate, DUE_WINDOW_DAYS)) : [];
  const overdue =
    state.kind === 'ready' ? state.mandates.filter((m) => (daysUntil(m.renewalDate) ?? 0) < 0).length : 0;
  const tint = due.length > 0 || overdue > 0 ? tints.DUE : tints.NONE;

  return (
    <div data-testid="renewal-count-widget" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={label}>Renewals &lt; {DUE_WINDOW_DAYS} days</span>
        {overdue > 0 && (
          <span style={{ ...label, color: tints.OVERDUE.text }}>
            {overdue} overdue
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          aria-hidden="true"
          style={{ width: 12, height: 12, borderRadius: '50%', background: tint.glyph, flex: '0 0 auto' }}
        />
        <span style={{ ...headline, fontSize: 'var(--t-font-size-xxl, 28px)' }}>
          {state.kind === 'ready' ? due.length : state.kind === 'loading' ? '…' : '—'}
        </span>
        <span style={muted}>
          {state.kind === 'ready'
            ? `of ${state.mandates.length} mandate${state.mandates.length === 1 ? '' : 's'} with a renewal date`
            : state.kind === 'loading'
              ? 'Counting…'
              : 'Renewal data unavailable'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
        <Countdown iso={KEY_DATES.cantonFair.iso} title={KEY_DATES.cantonFair.label} />
        <Countdown iso={KEY_DATES.batteryDppMandate.iso} title={KEY_DATES.batteryDppMandate.label} />
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: IDS.frontComponents.renewalCountWidget,
  name: 'RenewalCountWidget',
  description: 'Count of AR mandates renewing within 90 days + Canton Fair / DPP-mandate countdowns',
  component: RenewalCountWidget,
});

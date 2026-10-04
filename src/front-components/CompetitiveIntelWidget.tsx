/**
 * CompetitiveIntelWidget — Product Stream record page, Competitive Intel tab.
 *
 * The latest price observations (competitor, our offering, price, date) of the
 * stream's competitors, newest first. Rendered in every state.
 */
import { useEffect, useState } from 'react';
import { useRecordId } from 'twenty-sdk/front-component';

import { defineFrontComponent } from '../lib/sdk';
import { IDS } from '../ids';
import { fetchStreamObservations, type StreamObservationRecord } from '../lib/data';
import { card, label, muted } from '../lib/theme';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; observations: StreamObservationRecord[] }
  | { kind: 'error'; message: string };

const price = (o: StreamObservationRecord) =>
  o.competitorPriceEur === null
    ? '—'
    : new Intl.NumberFormat('en-GB', { style: 'currency', currency: o.currencyCode ?? 'EUR' }).format(o.competitorPriceEur);

export const CompetitiveIntelWidget = () => {
  const recordId = useRecordId();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    if (!recordId) return;
    let cancelled = false;
    setState({ kind: 'loading' });
    fetchStreamObservations(recordId)
      .then((observations) => !cancelled && setState({ kind: 'ready', observations }))
      .catch((error: unknown) =>
        !cancelled && setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) }),
      );
    return () => {
      cancelled = true;
    };
  }, [recordId]);

  return (
    <div data-testid="competitive-intel-widget" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={label}>Latest price observations</span>
      {state.kind === 'loading' && <span style={muted}>Loading…</span>}
      {state.kind === 'error' && <span style={muted}>Price observations unavailable</span>}
      {state.kind === 'ready' && state.observations.length === 0 && <span style={muted}>No price observations yet</span>}
      {state.kind === 'ready' && state.observations.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, color: 'var(--t-font-color-primary)' }}>
          {state.observations.map((o) => (
            <li key={o.id}>
              {o.competitorName ?? 'Unknown'} — {price(o)}{' '}
              <span style={muted}>
                · {o.observedAt ?? 'undated'}
                {o.offeringName ? ` · vs ${o.offeringName}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: IDS.frontComponents.competitiveIntelWidget,
  name: 'CompetitiveIntelWidget',
  description: 'Latest competitor price observations for the stream',
  component: CompetitiveIntelWidget,
});

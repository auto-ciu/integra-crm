/**
 * StreamKpiWidget — Product Stream record page, Pipeline tab.
 *
 * Four stat cards over the stream's active OpportunityLines: weighted pipeline
 * value (estimatedValueEur × probability), open opportunities, deals in
 * progress by stage, and weighted value expected to close this quarter.
 * Rendered in every state (loading / error show "…" / "—").
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useRecordId } from 'twenty-sdk/front-component';

import { defineFrontComponent } from '../lib/sdk';
import { IDS } from '../ids';
import { fetchStreamLines, type StreamLineRecord } from '../lib/data';
import { card, headline, label, muted } from '../lib/theme';
import { computeStreamKpis } from '../../shared/stream-kpis.mjs';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; lines: StreamLineRecord[] }
  | { kind: 'error'; message: string };

const eur = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const Stat = ({ title, children, note }: { title: string; children: ReactNode; note?: string }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: '10px 12px',
      border: '1px solid var(--t-border-color-light)',
      borderRadius: 'var(--t-border-radius-sm, 4px)',
      minWidth: 0,
    }}
  >
    <span style={label}>{title}</span>
    <span style={headline}>{children}</span>
    {note && <span style={muted}>{note}</span>}
  </div>
);

export const StreamKpiWidget = () => {
  const recordId = useRecordId();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    if (!recordId) return;
    let cancelled = false;
    setState({ kind: 'loading' });
    fetchStreamLines(recordId)
      .then((lines) => !cancelled && setState({ kind: 'ready', lines }))
      .catch((error: unknown) =>
        !cancelled && setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) }),
      );
    return () => {
      cancelled = true;
    };
  }, [recordId]);

  const kpis = state.kind === 'ready' ? computeStreamKpis(state.lines) : null;
  const pending = state.kind === 'loading' ? '…' : '—';

  return (
    <div data-testid="stream-kpi-widget" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
        <Stat title="Pipeline value" note="Σ value × probability">
          {kpis ? eur(kpis.pipelineValueEur) : pending}
        </Stat>
        <Stat title="Open opportunities" note="with an active line">
          {kpis ? kpis.openOpportunities : pending}
        </Stat>
        <Stat title="Expected close this quarter" note="probability-weighted">
          {kpis ? eur(kpis.expectedThisQuarterEur) : pending}
        </Stat>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={label}>Deals in progress</span>
        {kpis && kpis.dealsByStage.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
            {kpis.dealsByStage.map((s) => (
              <Stat key={s.stageName} title={s.stageName}>
                {s.count}
              </Stat>
            ))}
          </div>
        ) : (
          <span style={muted}>
            {state.kind === 'ready' ? 'No active deals' : state.kind === 'loading' ? 'Loading…' : 'Pipeline data unavailable'}
          </span>
        )}
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: IDS.frontComponents.streamKpiWidget,
  name: 'StreamKpiWidget',
  description: 'Stream pipeline KPIs: weighted value, open opportunities, deals by stage, expected close this quarter',
  component: StreamKpiWidget,
});

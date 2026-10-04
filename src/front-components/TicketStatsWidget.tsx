/**
 * TicketStatsWidget — Today dashboard (E3).
 *
 * Open tickets, My tickets, Overdue, Avg first response (last 30 days) and
 * Resolved today. Overdue turns tomato when above zero. Rendered in every
 * state: a failed query shows dashes, not an empty card.
 */
import { useEffect, useState } from 'react';
import { useUserId } from 'twenty-sdk/front-component';

import { defineFrontComponent } from '../lib/sdk';
import { IDS } from '../ids';
import { fetchTicketStats, type TicketStats } from '../lib/data';
import { card, headline, label, muted, tints } from '../lib/theme';

type State = { kind: 'loading' } | { kind: 'ready'; stats: TicketStats } | { kind: 'error' };

const formatHours = (hours: number | null) =>
  hours === null ? '—' : hours < 1 ? `${Math.round(hours * 60)} min` : `${hours.toFixed(1)} h`;

const Stat = ({ title, value, alert = false }: { title: string; value: string; alert?: boolean }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      padding: '8px 12px',
      borderRadius: 'var(--t-border-radius-sm, 4px)',
      background: alert ? tints.OVERDUE.background : 'var(--t-background-secondary)',
      border: `1px solid ${alert ? tints.OVERDUE.border : 'var(--t-border-color-light)'}`,
      minWidth: 0,
    }}
  >
    <span style={label}>{title}</span>
    <span style={{ ...headline, color: alert ? tints.OVERDUE.text : headline.color }}>{value}</span>
  </div>
);

export const TicketStatsWidget = () => {
  const userId = useUserId();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchTicketStats(userId)
      .then((stats) => !cancelled && setState({ kind: 'ready', stats }))
      .catch(() => !cancelled && setState({ kind: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const s = state.kind === 'ready' ? state.stats : null;
  const num = (n: number | undefined) => (s ? String(n) : state.kind === 'loading' ? '…' : '—');

  return (
    <div data-testid="ticket-stats-widget" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={label}>Tickets</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
        <Stat title="Open" value={num(s?.open)} />
        <Stat title="Mine" value={num(s?.mine)} />
        <Stat title="Overdue" value={num(s?.overdue)} alert={(s?.overdue ?? 0) > 0} />
        <Stat title="Avg response" value={s ? formatHours(s.avgFirstResponseHours) : state.kind === 'loading' ? '…' : '—'} />
        <Stat title="Resolved today" value={num(s?.resolvedToday)} />
      </div>
      {state.kind === 'error' && <span style={muted}>Ticket data unavailable</span>}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: IDS.frontComponents.ticketStatsWidget,
  name: 'TicketStatsWidget',
  description: 'Open / my / overdue tickets, average first response time, resolved today',
  component: TicketStatsWidget,
});

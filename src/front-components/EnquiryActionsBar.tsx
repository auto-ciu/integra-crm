/**
 * EnquiryActionsBar — top of the Enquiry record page's Thread tab (E3).
 *
 * "Assign to me" sets assignedTo to the signed-in user's workspace member.
 * "Resolve" asks for a one-line resolution, then sets status CLOSED, closedAt
 * now and the resolution text.
 */
import { useState } from 'react';
import { useRecordId, useUserId } from 'twenty-sdk/front-component';

import { defineFrontComponent } from '../lib/sdk';
import { IDS } from '../ids';
import { assignEnquiryToMe, resolveEnquiry } from '../lib/data';
import { card, font, muted } from '../lib/theme';

type State = { kind: 'idle' } | { kind: 'busy' } | { kind: 'done'; message: string } | { kind: 'error'; message: string };

const button = (colour: string, enabled: boolean) => ({
  fontFamily: font.body,
  fontSize: 'var(--t-font-size-md, 13px)',
  fontWeight: 500,
  color: 'var(--t-font-color-inverted)',
  background: `var(--t-color-${colour})`,
  border: `1px solid var(--t-color-${colour})`,
  borderRadius: 'var(--t-border-radius-sm, 4px)',
  padding: '6px 12px',
  cursor: enabled ? 'pointer' : 'default',
  opacity: enabled ? 1 : 0.6,
});

export const EnquiryActionsBar = () => {
  const recordId = useRecordId();
  const userId = useUserId();
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [resolving, setResolving] = useState(false);
  const [resolution, setResolution] = useState('');
  const busy = state.kind === 'busy';

  const run = async (work: () => Promise<void>, message: string) => {
    setState({ kind: 'busy' });
    try {
      await work();
      setState({ kind: 'done', message });
    } catch (error) {
      setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <div data-testid="enquiry-actions" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={!recordId || !userId || busy}
          onClick={() => recordId && userId && run(() => assignEnquiryToMe(recordId, userId), 'Assigned to you.')}
          style={button('blue', Boolean(recordId && userId) && !busy)}
        >
          Assign to me
        </button>
        <button
          type="button"
          disabled={!recordId || busy}
          onClick={() => setResolving((open) => !open)}
          style={button('green', Boolean(recordId) && !busy)}
        >
          Resolve
        </button>
        {state.kind === 'done' && <span role="status" style={muted}>{state.message} Refresh the record to see it.</span>}
        {state.kind === 'error' && <span role="alert" style={muted}>Failed: {state.message}</span>}
      </div>
      {resolving && (
        <form
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!recordId || !resolution.trim()) return;
            run(() => resolveEnquiry(recordId, resolution.trim()), 'Resolved and closed.').then(() => setResolving(false));
          }}
        >
          <input
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="How was it resolved?"
            aria-label="Resolution"
            style={{ flex: '1 1 240px', fontFamily: font.body, padding: '6px 8px' }}
          />
          <button type="submit" disabled={!resolution.trim() || busy} style={button('green', Boolean(resolution.trim()) && !busy)}>
            Close ticket
          </button>
        </form>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: IDS.frontComponents.enquiryActionsBar,
  name: 'EnquiryActionsBar',
  description: 'Assign to me / Resolve quick actions for an enquiry',
  component: EnquiryActionsBar,
});

/**
 * ApplyMacroPanel — the Enquiry record page's Macros tab (E3).
 *
 * Lists the ticket macros that suit this enquiry (service interest empty or
 * equal to its category; internal-action macros excluded), previews the
 * rendered reply, and on "Send" records it as an OUTBOUND Enquiry Message and
 * moves the ticket to PENDING. Nothing is e-mailed yet: SES sending is not
 * wired, the same limit as the E2 auto-reply.
 */
import { useEffect, useState } from 'react';
import { useRecordId } from 'twenty-sdk/front-component';

import { defineFrontComponent } from '../lib/sdk';
import { IDS } from '../ids';
import { fetchTicket, fetchTicketMacros, recordOutboundReply, type TicketForActions, type TicketMacroRecord } from '../lib/data';
import { card, font, label, muted } from '../lib/theme';
import { macroApplies, renderMacro } from '../../shared/ticket-macros.mjs';

type State = { kind: 'loading' } | { kind: 'ready' } | { kind: 'sent'; macro: string } | { kind: 'busy' } | { kind: 'error'; message: string };

const asMacro = (m: TicketMacroRecord) => ({
  responseTemplate: m.responseTemplate?.markdown ?? '',
  category: m.category,
  appendSignature: m.appendSignature,
  serviceInterest: m.serviceInterest,
});

export const ApplyMacroPanel = () => {
  const recordId = useRecordId();
  const [ticket, setTicket] = useState<TicketForActions | null>(null);
  const [macros, setMacros] = useState<TicketMacroRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    if (!recordId) return;
    Promise.all([fetchTicket(recordId), fetchTicketMacros()]).then(
      ([t, m]) => {
        setTicket(t);
        setMacros(m);
        setState({ kind: 'ready' });
      },
      (error: unknown) => setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) }),
    );
  }, [recordId]);

  const available = ticket ? macros.filter((m) => macroApplies(asMacro(m), { category: ticket.category })) : [];
  const selected = available.find((m) => m.id === selectedId) ?? null;
  const preview =
    selected && ticket
      ? renderMacro(asMacro(selected), {
          reference: ticket.reference,
          name: [ticket.person?.name?.firstName, ticket.person?.name?.lastName].filter(Boolean).join(' '),
          company: ticket.company?.name,
          category: ticket.category,
          language: ticket.language,
        })
      : '';

  const send = async () => {
    if (!ticket || !selected || !preview) return;
    setState({ kind: 'busy' });
    try {
      await recordOutboundReply(ticket, selected.name ?? 'macro', preview);
      setState({ kind: 'sent', macro: selected.name ?? 'macro' });
    } catch (error) {
      setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <div data-testid="apply-macro" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={label}>Macros · 快捷回复</span>
      {state.kind === 'loading' && <span style={muted}>Loading macros…</span>}
      {state.kind !== 'loading' && available.length === 0 && state.kind !== 'error' && (
        <span style={muted}>No macros for this enquiry. Run the macro seed or add Ticket Macros.</span>
      )}
      {available.length > 0 && (
        <select
          value={selectedId}
          aria-label="Macro"
          onChange={(e) => {
            setSelectedId(e.target.value);
            setState({ kind: 'ready' });
          }}
          style={{ fontFamily: font.body, padding: '6px 8px' }}
        >
          <option value="">Choose a macro…</option>
          {available.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.shortcut ? ` (${m.shortcut})` : ''}
            </option>
          ))}
        </select>
      )}
      {preview && (
        <>
          <pre style={{ ...muted, whiteSpace: 'pre-wrap', fontFamily: font.body, margin: 0 }}>{preview}</pre>
          <div>
            <button
              type="button"
              onClick={send}
              disabled={state.kind === 'busy'}
              style={{
                fontFamily: font.body,
                fontSize: 'var(--t-font-size-md, 13px)',
                fontWeight: 500,
                color: 'var(--t-font-color-inverted)',
                background: 'var(--t-color-blue)',
                border: '1px solid var(--t-color-blue)',
                borderRadius: 'var(--t-border-radius-sm, 4px)',
                padding: '6px 12px',
                cursor: 'pointer',
              }}
            >
              Send reply
            </button>
          </div>
        </>
      )}
      {state.kind === 'sent' && (
        <span role="status" style={muted}>
          “{state.macro}” recorded as a reply and the ticket set to Pending. E-mail delivery is not connected yet, so nothing was sent to the requester.
        </span>
      )}
      {state.kind === 'error' && <span role="alert" style={muted}>Failed: {state.message}</span>}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: IDS.frontComponents.applyMacroPanel,
  name: 'ApplyMacroPanel',
  description: 'Pick a ticket macro and record it as the reply to an enquiry',
  component: ApplyMacroPanel,
});

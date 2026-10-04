/**
 * StreamContentWidget — Product Stream record page, Updates tab.
 *
 * The stream's published StreamUpdates (isPublished) as a simple list: title,
 * content category and a link to the public page. Only integrascientific.com
 * https URLs are rendered as links. Rendered in every state.
 */
import { useEffect, useState } from 'react';
import { useRecordId } from 'twenty-sdk/front-component';

import { defineFrontComponent } from '../lib/sdk';
import { IDS } from '../ids';
import { fetchPublishedUpdates, type PublishedUpdateRecord } from '../lib/data';
import { card, label, muted } from '../lib/theme';
import { integraUrl } from '../../shared/stream-content.mjs';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; updates: PublishedUpdateRecord[] }
  | { kind: 'error'; message: string };

export const StreamContentWidget = () => {
  const recordId = useRecordId();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    if (!recordId) return;
    let cancelled = false;
    setState({ kind: 'loading' });
    fetchPublishedUpdates(recordId)
      .then((updates) => !cancelled && setState({ kind: 'ready', updates }))
      .catch((error: unknown) =>
        !cancelled && setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) }),
      );
    return () => {
      cancelled = true;
    };
  }, [recordId]);

  return (
    <div data-testid="stream-content-widget" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={label}>Published content</span>
      {state.kind === 'loading' && <span style={muted}>Loading…</span>}
      {state.kind === 'error' && <span style={muted}>Published content unavailable</span>}
      {state.kind === 'ready' && state.updates.length === 0 && <span style={muted}>Nothing published yet</span>}
      {state.kind === 'ready' && state.updates.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, color: 'var(--t-font-color-primary)' }}>
          {state.updates.map((u) => {
            const href = integraUrl(u.publishUrl?.primaryLinkUrl ?? '');
            return (
              <li key={u.id}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {u.name ?? 'Untitled'}
                  </a>
                ) : (
                  (u.name ?? 'Untitled')
                )}{' '}
                <span style={muted}>· {u.contentCategory ?? 'Uncategorised'}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: IDS.frontComponents.streamContentWidget,
  name: 'StreamContentWidget',
  description: 'Published stream updates with content category and public link',
  component: StreamContentWidget,
});

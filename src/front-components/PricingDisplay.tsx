/**
 * PricingDisplay (C1 stub) — CRM-internal preview of how the public website
 * shows a pricing strategy. The real rendering lives on integra-web; this
 * only lets staff check a strategy before publishing.
 *
 * `PricingDisplay` renders the pricing.json shape (shared/pricing.mjs
 * buildPublicPricing — the same transform ops/publish-pricing.mjs runs), by
 * displayMode:
 *   SHOW_FROM_PRICE (ADD_ON)        → "from €950"
 *   SHOW_EXACT_TOTAL (FLAT)         → "€950/yr"
 *   SHOW_PER_OPTION (TIERED/BUNDLE) → tier table, Boss "On request"
 *   HIDE (QUOTE_ONLY/CUSTOM)        → "On request"
 *
 * twenty-sdk 2.41 exports no UI primitives to front components, so `Text` and
 * `Tag` below are minimal stand-ins styled with the --t-* tokens.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useRecordId } from 'twenty-sdk/front-component';

import { defineFrontComponent } from '../lib/sdk';
import { IDS } from '../ids';
import { fetchPricingStrategy } from '../lib/data';
import { card, font, label, muted, tints, type Tint } from '../lib/theme';
import {
  buildPublicPricing,
  isLive,
  itemPriceLabel,
  strategyHeadline,
} from '../../shared/pricing.mjs';

/** One entry of pricing.json `strategies`. */
export type PublicPricingItem = {
  correlationId: string | null;
  name: string | null;
  tier: string | null;
  tierLabel: string | null;
  annualFeeEur: number | null;
  setupFeeEur: number | null;
  currency: string;
  isHighlighted: boolean;
  isOnRequest: boolean;
};

export type PublicPricingStrategy = {
  id: string | null;
  name: string | null;
  type: string | null;
  description: string;
  displayMode: string;
  items: PublicPricingItem[];
};

// ------------------------------------------------------------- primitives

const TEXT_VARIANTS: Record<'title' | 'body' | 'muted' | 'label', CSSProperties> = {
  title: { fontFamily: font.headline, fontSize: 'var(--t-font-size-lg, 16px)', fontWeight: 600 },
  body: { fontSize: 'var(--t-font-size-md, 14px)' },
  muted,
  label,
};

const Text = ({
  variant = 'body',
  style,
  children,
}: {
  variant?: keyof typeof TEXT_VARIANTS;
  style?: CSSProperties;
  children: ReactNode;
}) => <span style={{ ...TEXT_VARIANTS[variant], ...style }}>{children}</span>;

const Tag = ({ tint = tints.WATCH, children }: { tint?: Tint; children: ReactNode }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '1px 8px',
      borderRadius: 'var(--t-border-radius-sm, 4px)',
      fontSize: 'var(--t-font-size-xs, 11px)',
      fontWeight: 500,
      background: tint.background,
      border: `1px solid ${tint.border}`,
      color: tint.text,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </span>
);

// --------------------------------------------------------------- display

const cell: CSSProperties = {
  padding: '6px 8px',
  borderTop: '1px solid var(--t-border-color-light)',
  textAlign: 'left',
};

const TierTable = ({ items }: { items: PublicPricingItem[] }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <tbody>
      {items.map((item) => (
        <tr key={item.correlationId ?? item.name}>
          <td style={cell}>
            <Text>{item.tierLabel ?? item.name}</Text>{' '}
            {item.isHighlighted && <Tag tint={tints.DUE}>Featured</Tag>}
          </td>
          <td style={{ ...cell, textAlign: 'right' }}>
            {item.isOnRequest ? (
              <Tag>{itemPriceLabel(item)}</Tag>
            ) : (
              <Text style={{ fontWeight: 600 }}>{itemPriceLabel(item)}</Text>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const PricingDisplay = ({ strategies }: { strategies: PublicPricingStrategy[] }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {strategies.map((s) => {
      const headline = strategyHeadline(s);
      return (
        <section key={s.id ?? s.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text variant="title">{s.name}</Text>
            {s.type && <Tag>{s.type}</Tag>}
          </div>
          {s.description && <Text variant="muted">{s.description}</Text>}
          {headline === null ? (
            <TierTable items={s.items} />
          ) : (
            <Text variant="title" style={{ color: tints.DUE.text }}>{headline}</Text>
          )}
        </section>
      );
    })}
  </div>
);

// ------------------------------------------- record-page preview wrapper

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; strategy: PublicPricingStrategy | null; live: boolean }
  | { kind: 'error'; message: string };

export const PricingStrategyPreview = () => {
  const recordId = useRecordId();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    if (!recordId) {
      setState({ kind: 'ready', strategy: null, live: false });
      return;
    }
    fetchPricingStrategy(recordId)
      .then(({ strategy, items }) => {
        if (cancelled) return;
        if (!strategy) return setState({ kind: 'ready', strategy: null, live: false });
        const now = new Date();
        const live = isLive(strategy, now.toISOString().slice(0, 10));
        // Preview even when not live, so staff can check before activating.
        const asLive = { ...strategy, isActive: true, validFrom: null, validUntil: null };
        const [preview] = buildPublicPricing([asLive], items, now).strategies;
        setState({ kind: 'ready', strategy: preview as PublicPricingStrategy, live });
      })
      .catch((error: unknown) =>
        !cancelled && setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) }),
      );
    return () => {
      cancelled = true;
    };
  }, [recordId]);

  return (
    <div data-testid="pricing-display" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <Text variant="label">Website preview</Text>
        {state.kind === 'ready' && state.strategy && !state.live && (
          <Tag tint={tints.OVERDUE}>Not published — inactive or outside validity</Tag>
        )}
      </div>
      {state.kind === 'loading' && <Text variant="muted">Loading…</Text>}
      {state.kind === 'error' && <Text variant="muted">Pricing data unavailable</Text>}
      {state.kind === 'ready' &&
        (state.strategy ? (
          <PricingDisplay strategies={[state.strategy]} />
        ) : (
          <Text variant="muted">No pricing strategy</Text>
        ))}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: IDS.frontComponents.pricingDisplay,
  name: 'PricingDisplay',
  description: 'Preview of how the website shows this pricing strategy (from €… / €…/yr / tier table / On request)',
  component: PricingStrategyPreview,
});

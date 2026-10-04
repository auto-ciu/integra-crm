/**
 * PricingDisplay (C1 stub) — CRM-internal preview of how the public website
 * shows an offering. The real rendering lives on integra-web; this only lets
 * staff check an offering before publishing.
 *
 * `PricingDisplay` renders the pricing.json shape (shared/public-pricing.mjs
 * buildPublicPricing — the same transform ops/publish-pricing.mjs runs), by
 * displayFormat:
 *   PRICE_CARD (FLAT)                      → "€500/yr"
 *   ADD_ON_LIST (ADD_ON)                   → "from €1,500/yr" (fromPrefix)
 *   TIER_TABLE / BUNDLE_COMPARISON         → tier table, Boss "On request"
 *   SEAT_PRICING (PER_SEAT)                → seat table, "€150/seat"
 *   CONTACT_CTA / HIDDEN (QUOTE_ONLY, …)   → "On request"
 *
 * twenty-sdk 2.41 exports no UI primitives to front components, so `Text` and
 * `Tag` below are minimal stand-ins styled with the --t-* tokens.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useRecordId } from 'twenty-sdk/front-component';

import { defineFrontComponent } from '../lib/sdk';
import { IDS } from '../ids';
import { fetchOffering } from '../lib/data';
import { card, font, label, muted, tints, type Tint } from '../lib/theme';
import {
  buildPublicPricing,
  isLive,
  offeringHeadline,
  pricePointLabel,
  tierLabel,
} from '../../shared/public-pricing.mjs';

/** One price point of a pricing.json offering (PublicPricingV1). */
export type PublicPricePoint = {
  correlationId: string;
  tier: string | null;
  annualFeeEur: number | null;
  currency: string;
  isOnRequest: boolean;
  isHighlighted: boolean;
  description: string;
};

/** One entry of pricing.json `offerings` (PublicPricingV1). */
export type PublicOffering = {
  offeringCode: string;
  name: string;
  strategyType: string;
  displayFormat: string;
  fromPrefix: boolean;
  description: string;
  features: string[];
  pricePoints: PublicPricePoint[];
  bundleOf: string[];
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

const TierTable = ({ offering }: { offering: PublicOffering }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <tbody>
      {offering.pricePoints.map((point) => (
        <tr key={point.correlationId}>
          <td style={cell}>
            <Text>{tierLabel(point.tier) ?? (point.description || point.correlationId)}</Text>{' '}
            {point.isHighlighted && <Tag tint={tints.DUE}>Featured</Tag>}
          </td>
          <td style={{ ...cell, textAlign: 'right' }}>
            {point.isOnRequest ? (
              <Tag>{pricePointLabel(point, offering.strategyType)}</Tag>
            ) : (
              <Text style={{ fontWeight: 600 }}>{pricePointLabel(point, offering.strategyType)}</Text>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const PricingDisplay = ({ offerings }: { offerings: PublicOffering[] }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {offerings.map((o) => {
      const headline = offeringHeadline(o);
      return (
        <section key={o.offeringCode} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text variant="title">{o.name}</Text>
            <Tag>{o.strategyType}</Tag>
          </div>
          {o.description && <Text variant="muted">{o.description}</Text>}
          {o.bundleOf.length > 0 && <Text variant="muted">Includes: {o.bundleOf.join(' + ')}</Text>}
          {o.features.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {o.features.map((feature) => (
                <li key={feature}>
                  <Text>{feature}</Text>
                </li>
              ))}
            </ul>
          )}
          {headline === null ? (
            <TierTable offering={o} />
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
  | { kind: 'ready'; offering: PublicOffering | null; live: boolean }
  | { kind: 'error'; message: string };

export const OfferingPreview = () => {
  const recordId = useRecordId();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    if (!recordId) {
      setState({ kind: 'ready', offering: null, live: false });
      return;
    }
    fetchOffering(recordId)
      .then(({ offering, pricePoints, bundleItems, components }) => {
        if (cancelled) return;
        if (!offering) return setState({ kind: 'ready', offering: null, live: false });
        const now = new Date();
        const live = isLive(offering, now.toISOString().slice(0, 10));
        // Preview even when not live, so staff can check before activating; the
        // components are forced live too, so bundleOf lists them.
        const asLive = (o: object) => ({ ...o, isActive: true, validFrom: null, validUntil: null });
        const published = buildPublicPricing(
          { offerings: [asLive(offering), ...components.map(asLive)], pricePoints, bundleItems },
          { now, version: 'preview' },
        );
        const preview = published.offerings.find((o: PublicOffering) => o.offeringCode === offering.offeringCode);
        setState({ kind: 'ready', offering: (preview ?? null) as PublicOffering | null, live });
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
        {state.kind === 'ready' && state.offering && !state.live && (
          <Tag tint={tints.OVERDUE}>Not published — inactive or outside validity</Tag>
        )}
      </div>
      {state.kind === 'loading' && <Text variant="muted">Loading…</Text>}
      {state.kind === 'error' && <Text variant="muted">Pricing data unavailable</Text>}
      {state.kind === 'ready' &&
        (state.offering ? (
          <PricingDisplay offerings={[state.offering]} />
        ) : (
          <Text variant="muted">No offering</Text>
        ))}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: IDS.frontComponents.pricingDisplay,
  name: 'PricingDisplay',
  description: 'Preview of how the website shows this offering (from €… / €…/yr / tier table / On request)',
  component: OfferingPreview,
});

/**
 * Styling primitives for the front components.
 *
 * Everything resolves through Twenty's public `--t-*` custom properties, so the
 * components inherit the workspace theme (crm/theme/integra-theme.css maps the
 * Integra palette onto those tokens). The only literal hexes are the brand
 * gold pair, used as FALLBACKS inside var(): gold9 #C5A059 is fill/border only
 * and gold11 #775A19 is the one gold allowed as text (≈6.4:1 on white).
 * Overdue borrows Twenty's stock tomato ramp, as the theme prescribes.
 */
import type { CSSProperties } from 'react';

export const font = {
  body: 'var(--t-font-family, Inter, sans-serif)',
  headline: 'var(--integra-font-headline, Manrope, sans-serif)',
};

export type Tint = {
  background: string;
  border: string;
  text: string;
  glyph: string;
};

export const tints: Record<'NONE' | 'WATCH' | 'DUE' | 'OVERDUE', Tint> = {
  NONE: {
    background: 'var(--t-color-green1)',
    border: 'var(--t-color-green9)',
    text: 'var(--t-color-green11)',
    glyph: 'var(--t-color-green9)',
  },
  WATCH: {
    background: 'var(--t-background-tertiary)',
    border: 'var(--t-border-color-strong)',
    text: 'var(--t-font-color-secondary)',
    glyph: 'var(--t-font-color-tertiary)',
  },
  DUE: {
    background: 'var(--t-color-gold3)',
    border: 'var(--t-color-gold9, #C5A059)',
    text: 'var(--t-color-gold11, #775A19)',
    glyph: 'var(--t-color-gold9, #C5A059)',
  },
  OVERDUE: {
    background: 'var(--t-color-tomato3)',
    border: 'var(--t-color-tomato9)',
    text: 'var(--t-color-tomato11)',
    glyph: 'var(--t-color-tomato9)',
  },
};

export const card: CSSProperties = {
  fontFamily: font.body,
  color: 'var(--t-font-color-primary)',
  background: 'var(--t-background-primary)',
  border: '1px solid var(--t-border-color-medium)',
  borderRadius: 'var(--t-border-radius-md, 8px)',
  padding: '12px 16px',
  boxSizing: 'border-box',
  width: '100%',
};

export const label: CSSProperties = {
  fontSize: 'var(--t-font-size-xs, 11px)',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--t-font-color-tertiary)',
};

export const headline: CSSProperties = {
  fontFamily: font.headline,
  fontSize: 'var(--t-font-size-xl, 20px)',
  fontWeight: 600,
  lineHeight: 1.2,
  color: 'var(--t-font-color-primary)',
};

export const muted: CSSProperties = {
  fontSize: 'var(--t-font-size-sm, 13px)',
  color: 'var(--t-font-color-secondary)',
};

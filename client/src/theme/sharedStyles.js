import { BRAND_COLORS } from '../utils/constants.js';

/**
 * Shared inline style objects (AGENTS.md §11: inline `style={}` only, no CSS files).
 * Component-specific styles live at the top of each component file.
 */

/** Font stack for headings (Space Grotesk, loaded in index.html). */
export const HEADING_FONT = "'Space Grotesk', Inter, sans-serif";

/**
 * Builds a heading style at the given size.
 * @param {number} fontSize - Font size in px.
 * @param {import('react').CSSProperties} [extra] - Extra style overrides.
 * @returns {import('react').CSSProperties} Heading style.
 */
export const headingStyle = (fontSize, extra = {}) => ({
  margin: 0,
  fontFamily: HEADING_FONT,
  fontSize,
  fontWeight: 600,
  color: BRAND_COLORS.text,
  ...extra,
});

/** Styles shared by the login and registration side panels. */
export const AUTH_ASIDE_STYLES = {
  title: {
    margin: 0,
    flexShrink: 0,
    fontFamily: HEADING_FONT,
    fontSize: 32,
    lineHeight: 1.15,
    fontWeight: 600,
    color: '#FFFFFF',
  },
  lead: {
    margin: 0,
    flexShrink: 0,
    fontSize: 15,
    lineHeight: 1.6,
    color: 'rgba(255, 255, 255, 0.82)',
  },
  /** Grows/shrinks to fill the space left in the panel (never causes scrolling). */
  illustration: {
    display: 'block',
    flex: '1 1 0',
    minHeight: 0,
    width: '100%',
    maxWidth: 440,
    maxHeight: 280,
    objectFit: 'contain',
    objectPosition: 'left center',
  },
};

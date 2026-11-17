import { Grid } from 'antd';

import { BrandMark } from '../common/BrandMark.jsx';
import { BRAND_COLORS, SCHOOL } from '../../utils/constants.js';

const STYLES = {
  root: {
    display: 'flex',
    background: BRAND_COLORS.pageBg,
  },
  aside: {
    boxSizing: 'border-box',
    background: BRAND_COLORS.navy,
    color: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  asideBody: {
    flex: '1 1 auto',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 14,
    maxWidth: 520,
  },
  accent: {
    display: 'block',
    flexShrink: 0,
    width: 56,
    height: 4,
    borderRadius: 2,
    background: BRAND_COLORS.gold,
  },
  footnote: { margin: 0, flexShrink: 0, fontSize: 12, color: 'rgba(255, 255, 255, 0.72)' },
  main: {
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    boxSizing: 'border-box',
    background: '#FFFFFF',
    border: `1px solid ${BRAND_COLORS.border}`,
    borderRadius: 20,
    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)',
    margin: 'auto 0',
  },
};

/**
 * Two-column layout for login and registration: navy brand panel + form card.
 * On desktop it is exactly one screen tall (no page scroll): the illustration in the navy panel
 * shrinks to the space left. On phones only the logo bar is shown above the form.
 * @param {Object} props
 * @param {import('react').ReactNode} props.aside - Content of the navy panel (below the brand).
 * @param {import('react').ReactNode} props.children - Form card content.
 * @returns {JSX.Element}
 */
export const AuthSplitLayout = ({ aside, children }) => {
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.md);

  const rootStyle = isDesktop
    ? { ...STYLES.root, height: '100vh', overflow: 'hidden' }
    : { ...STYLES.root, minHeight: '100vh', flexDirection: 'column' };

  const asideStyle = isDesktop
    ? { ...STYLES.aside, flex: '1 1 50%', padding: '28px 40px', overflow: 'hidden' }
    : { ...STYLES.aside, padding: '24px 20px' };

  const mainStyle = isDesktop
    ? { ...STYLES.main, flex: '1 1 50%', padding: '20px 32px', overflowY: 'auto' }
    : { ...STYLES.main, padding: '24px 16px' };

  return (
    <div style={rootStyle}>
      <section style={asideStyle}>
        <BrandMark size={isDesktop ? 'large' : 'small'} />
        {isDesktop && (
          <div style={STYLES.asideBody}>
            <span aria-hidden="true" style={STYLES.accent} />
            {aside}
          </div>
        )}
        {isDesktop && (
          <p style={STYLES.footnote}>
            {SCHOOL.name} · {SCHOOL.location} · Est. {SCHOOL.established}
          </p>
        )}
      </section>
      <main style={mainStyle}>
        <div style={{ ...STYLES.card, padding: isDesktop ? '28px 36px' : '24px 20px' }}>
          {children}
        </div>
      </main>
    </div>
  );
};

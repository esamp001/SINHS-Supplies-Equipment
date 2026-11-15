import { Typography } from 'antd';

import { headingStyle } from '../../theme/sharedStyles.js';
import { BRAND_COLORS } from '../../utils/constants.js';

const STYLES = {
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    padding: '28px 32px',
    borderRadius: 16,
    background: BRAND_COLORS.blueSoft,
  },
  body: { flex: '1 1 360px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 },
  text: { display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 640 },
  description: { fontSize: 15 },
  illustration: { maxWidth: '100%', height: 'auto' },
};

/**
 * Light-blue page banner with title, description, optional extras and an illustration.
 * @param {Object} props
 * @param {import('react').ReactNode} [props.eyebrow] - Content above the title (tag or breadcrumb).
 * @param {string} props.title - Page title.
 * @param {string} [props.description] - Supporting text.
 * @param {import('react').ReactNode} [props.children] - Extra content, e.g. action buttons.
 * @param {string} [props.illustrationUrl] - Decorative illustration URL.
 * @param {number} [props.illustrationWidth=300] - Illustration width in px.
 * @returns {JSX.Element}
 */
export const PageHero = ({
  eyebrow,
  title,
  description,
  children,
  illustrationUrl,
  illustrationWidth = 300,
}) => (
  <section style={STYLES.root}>
    <div style={STYLES.body}>
      <div style={STYLES.text}>
        {eyebrow}
        <h1 style={headingStyle(32)}>{title}</h1>
        {description && (
          <Typography.Text type="secondary" style={STYLES.description}>
            {description}
          </Typography.Text>
        )}
      </div>
      {children}
    </div>
    {illustrationUrl && (
      <img
        src={illustrationUrl}
        alt=""
        style={{
          ...STYLES.illustration,
          width: illustrationWidth,
          flex: `0 1 ${illustrationWidth}px`,
        }}
      />
    )}
  </section>
);

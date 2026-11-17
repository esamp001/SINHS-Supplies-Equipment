import sealUrl from '../../assets/images/sinhsSeal.png';
import { HEADING_FONT } from '../../theme/sharedStyles.js';
import { SCHOOL } from '../../utils/constants.js';

const STYLES = {
  root: { display: 'flex', alignItems: 'center', gap: 12 },
  seal: { flexShrink: 0, objectFit: 'contain' },
  name: { fontFamily: HEADING_FONT, fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.2 },
  tagline: { color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.3 },
};

/**
 * School seal with the "SINHS" name and system tagline. Used on auth pages and the header.
 * The seal (`sinhsSeal.png`) has a transparent background, so it sits on the navy header and
 * the auth side panel without a white box.
 * @param {Object} props
 * @param {'large' | 'small'} [props.size='large'] - Large on auth pages, small in the header.
 * @param {string} [props.tagline] - Text under the name (empty hides it). Defaults to the system name.
 * @returns {JSX.Element}
 */
export const BrandMark = ({ size = 'large', tagline = SCHOOL.systemName }) => {
  const isLarge = size === 'large';
  const sealSize = isLarge ? 72 : 44;

  return (
    <div style={STYLES.root}>
      <img
        style={STYLES.seal}
        src={sealUrl}
        alt={`${SCHOOL.name} seal`}
        width={sealSize}
        height={sealSize}
      />
      <div>
        <div style={{ ...STYLES.name, fontSize: isLarge ? 24 : 18 }}>{SCHOOL.shortName}</div>
        {tagline && <div style={{ ...STYLES.tagline, fontSize: isLarge ? 14 : 12 }}>{tagline}</div>}
      </div>
    </div>
  );
};

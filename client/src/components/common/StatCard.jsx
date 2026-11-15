import { Card, Typography } from 'antd';

import { HEADING_FONT } from '../../theme/sharedStyles.js';
import { BRAND_COLORS } from '../../utils/constants.js';

const STYLES = {
  body: { padding: 20, display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 13 },
  value: {
    fontFamily: HEADING_FONT,
    fontSize: 32,
    fontWeight: 600,
    color: BRAND_COLORS.navy,
    lineHeight: 1.2,
  },
  note: { fontSize: 12 },
};

/**
 * Summary number card for the dashboard.
 * @param {Object} props
 * @param {string} props.label - Stat label.
 * @param {number} props.value - Stat value.
 * @param {string} [props.note] - Small helper text.
 * @returns {JSX.Element}
 */
export const StatCard = ({ label, value, note }) => (
  <Card styles={{ body: STYLES.body }}>
    <Typography.Text strong type="secondary" style={STYLES.label}>
      {label}
    </Typography.Text>
    <span style={STYLES.value}>{value}</span>
    {note && (
      <Typography.Text type="secondary" style={STYLES.note}>
        {note}
      </Typography.Text>
    )}
  </Card>
);

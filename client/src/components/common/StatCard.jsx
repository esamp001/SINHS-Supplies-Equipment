import { Card, Skeleton, Typography } from 'antd';

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
  skeleton: { width: 60, height: 38 },
};

/**
 * Summary number card for the dashboard.
 * @param {Object} props
 * @param {string} props.label - Stat label.
 * @param {number | undefined} props.value - Stat value (from the API).
 * @param {string} [props.note] - Small helper text.
 * @param {boolean} [props.loading=false] - Shows a skeleton while the value loads.
 * @returns {JSX.Element}
 */
export const StatCard = ({ label, value, note, loading = false }) => (
  <Card styles={{ body: STYLES.body }}>
    <Typography.Text strong type="secondary" style={STYLES.label}>
      {label}
    </Typography.Text>
    {loading ? (
      <Skeleton.Input active size="small" style={STYLES.skeleton} />
    ) : (
      <span style={STYLES.value}>{value ?? 0}</span>
    )}
    {note && (
      <Typography.Text type="secondary" style={STYLES.note}>
        {note}
      </Typography.Text>
    )}
  </Card>
);

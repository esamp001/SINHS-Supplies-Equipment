import { Card, Empty, Typography } from 'antd';
import { Link } from 'react-router-dom';

import { StatusTag } from './StatusTag.jsx';

const STYLES = {
  body: { padding: 0 },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '14px 20px',
    borderBottom: '1px solid #F1F5F9',
  },
  text: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  sub: { fontSize: 13 },
  empty: { padding: 20 },
};

/**
 * Card with a short list of rows (main text, sub text, status tag) and a "View all" link.
 * @param {Object} props
 * @param {string} props.title - Panel title.
 * @param {string} props.viewAllPath - Route for the "View all" link.
 * @param {import('../../utils/types.js').PanelRow[]} props.rows - Rows to show.
 * @returns {JSX.Element}
 */
export const ListPanel = ({ title, viewAllPath, rows }) => (
  <Card title={title} extra={<Link to={viewAllPath}>View all</Link>} styles={{ body: STYLES.body }}>
    {rows.length === 0 && (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing here" style={STYLES.empty} />
    )}
    {rows.map((row) => (
      <div key={row.id} style={STYLES.row}>
        <div style={STYLES.text}>
          <Typography.Text strong>{row.main}</Typography.Text>
          <Typography.Text type="secondary" style={STYLES.sub}>
            {row.sub}
          </Typography.Text>
        </div>
        <StatusTag status={row.status} />
      </div>
    ))}
  </Card>
);

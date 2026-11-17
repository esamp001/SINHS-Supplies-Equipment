import { Tag } from 'antd';

import { STATUS_TAGS } from '../../utils/constants.js';

/**
 * Colored status tag using the shared STATUS_TAGS config (consistent colors app-wide).
 * @param {Object} props
 * @param {string} props.status - Key of STATUS_TAGS, e.g. "pending".
 * @param {string} [props.label] - Overrides the default label.
 * @returns {JSX.Element}
 */
export const StatusTag = ({ status, label }) => {
  const config = STATUS_TAGS[status] || { label: status, color: 'default' };

  return (
    <Tag color={config.color} variant="filled" style={{ marginInlineEnd: 0, fontWeight: 600 }}>
      {label || config.label}
    </Tag>
  );
};

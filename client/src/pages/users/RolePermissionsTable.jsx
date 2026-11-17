import { Table, Typography } from 'antd';
import { CheckOutlined } from '@ant-design/icons';

import { ROLE_LABELS, ROLES } from '../../utils/constants.js';

/** Permission values: allowed, allowed as fallback (admin acting as custodian), not allowed. */
const ACCESS = Object.freeze({ YES: 'yes', FALLBACK: 'fallback', NO: 'no' });

/** Capability matrix from AGENTS.md §10. */
const CAPABILITIES = [
  ['View available items', ACCESS.YES, ACCESS.YES, ACCESS.YES],
  ['Create and cancel own supply and borrow requests', ACCESS.YES, ACCESS.YES, ACCESS.YES],
  ['View own request and borrow history', ACCESS.YES, ACCESS.YES, ACCESS.YES],
  ['Approve or reject requests (incl. partial approval)', ACCESS.FALLBACK, ACCESS.YES, ACCESS.NO],
  ['Release approved items', ACCESS.FALLBACK, ACCESS.YES, ACCESS.NO],
  ['Issue and receive borrowed equipment', ACCESS.FALLBACK, ACCESS.YES, ACCESS.NO],
  ['Manage items and stock (stock-in, adjustments)', ACCESS.FALLBACK, ACCESS.YES, ACCESS.NO],
  ['Manage item types and custom fields', ACCESS.YES, ACCESS.YES, ACCESS.NO],
  ['Reports and exports (Excel, PDF)', ACCESS.YES, ACCESS.YES, ACCESS.NO],
  ['Approve or reject self-registered accounts', ACCESS.YES, ACCESS.NO, ACCESS.NO],
  ['Manage users, roles and password resets', ACCESS.YES, ACCESS.NO, ACCESS.NO],
  ['Master data (categories, units, locations, positions)', ACCESS.YES, ACCESS.NO, ACCESS.NO],
  ['Audit log (read-only)', ACCESS.YES, ACCESS.NO, ACCESS.NO],
].map(([label, admin, custodian, staff]) => ({
  key: label,
  label,
  [ROLES.ADMIN]: admin,
  [ROLES.CUSTODIAN]: custodian,
  [ROLES.STAFF]: staff,
}));

/**
 * Renders one permission cell.
 * @param {string} access - One of ACCESS values.
 * @param {string} roleLabel - Role name for screen readers.
 * @returns {JSX.Element}
 */
const renderAccess = (access, roleLabel) => {
  if (access === ACCESS.NO) {
    return (
      <Typography.Text type="secondary" aria-label={`${roleLabel}: not allowed`}>
        —
      </Typography.Text>
    );
  }

  return (
    <span
      aria-label={`${roleLabel}: ${access === ACCESS.FALLBACK ? 'allowed as fallback' : 'allowed'}`}
    >
      <CheckOutlined style={{ color: '#1F4FA8', fontSize: 16 }} />
      {access === ACCESS.FALLBACK && (
        <Typography.Text
          style={{ marginInlineStart: 6, fontSize: 11, fontWeight: 600, color: '#5A3E00' }}
        >
          Fallback
        </Typography.Text>
      )}
    </span>
  );
};

const COLUMNS = [
  { title: 'Capability', dataIndex: 'label', key: 'label' },
  ...[ROLES.ADMIN, ROLES.CUSTODIAN, ROLES.STAFF].map((roleCode) => ({
    title: ROLE_LABELS[roleCode],
    dataIndex: roleCode,
    key: roleCode,
    align: 'center',
    width: 140,
    render: (access) => renderAccess(access, ROLE_LABELS[roleCode]),
  })),
];

/**
 * Read-only matrix of what each role can do.
 * @returns {JSX.Element}
 */
export const RolePermissionsTable = () => (
  <>
    <Typography.Paragraph type="secondary">
      The three roles are fixed. A person&apos;s position (Principal, Teacher I…) is a label only
      and never changes access.
    </Typography.Paragraph>
    <Table
      rowKey="key"
      columns={COLUMNS}
      dataSource={CAPABILITIES}
      pagination={false}
      scroll={{ x: 640 }}
    />
    <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
      Nobody can approve their own request. Every release of a supply or piece of equipment needs a
      request approved by a Custodian first.
    </Typography.Paragraph>
  </>
);

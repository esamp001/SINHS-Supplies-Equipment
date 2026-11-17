/**
 * App-wide constants. Status/enum values are defined once here and reused (AGENTS.md §12.2).
 */

/** School details shown in the UI and report headers. */
export const SCHOOL = Object.freeze({
  shortName: 'SINHS',
  name: 'San Isidro National High School',
  location: 'Malilipot, Albay',
  established: 2000,
  systemName: 'Supplies & Equipment Management',
});

/** Application timezone (AGENTS.md §8). */
export const APP_TIMEZONE = 'Asia/Manila';

/** Borrowed items due within this many days show as "Due soon" (matches the server). */
export const DUE_SOON_DAYS = 2;

/** Unread notification polling interval in milliseconds (AGENTS.md §9). */
export const NOTIFICATION_POLL_MS = 60000;

/** Default rows per page for server-side paginated tables (AGENTS.md §5). */
export const DEFAULT_PAGE_SIZE = 20;

/** Minimum password length for registration and password changes. */
export const MIN_PASSWORD_LENGTH = 8;

/** System role codes. Roles control permissions; positions never do. */
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  CUSTODIAN: 'custodian',
  STAFF: 'staff',
});

/** Display labels for role codes. */
export const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: 'Admin',
  [ROLES.CUSTODIAN]: 'Custodian',
  [ROLES.STAFF]: 'Staff',
});

/** Role options for Ant Design Select components. */
export const ROLE_OPTIONS = Object.freeze([
  { value: ROLES.STAFF, label: ROLE_LABELS[ROLES.STAFF] },
  { value: ROLES.CUSTODIAN, label: ROLE_LABELS[ROLES.CUSTODIAN] },
  { value: ROLES.ADMIN, label: ROLE_LABELS[ROLES.ADMIN] },
]);

/** User account statuses. */
export const USER_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  REJECTED: 'rejected',
  DEACTIVATED: 'deactivated',
});

/** Request statuses. */
export const REQUEST_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RELEASED: 'released',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
});

/**
 * Status tag display config: label + Ant Design Tag color.
 * Keys cover request, user, stock and borrowing statuses.
 */
export const STATUS_TAGS = Object.freeze({
  pending: { label: 'Pending', color: 'gold' },
  approved: { label: 'Approved', color: 'blue' },
  released: { label: 'Released', color: 'green' },
  returned: { label: 'Returned', color: 'green' },
  rejected: { label: 'Rejected', color: 'red' },
  cancelled: { label: 'Cancelled', color: 'default' },
  overdue: { label: 'Overdue', color: 'red' },
  dueSoon: { label: 'Due soon', color: 'gold' },
  borrowed: { label: 'Borrowed', color: 'blue' },
  lowStock: { label: 'Low stock', color: 'red' },
  active: { label: 'Active', color: 'green' },
  deactivated: { label: 'Deactivated', color: 'default' },
  inactive: { label: 'Inactive', color: 'default' },
  inStock: { label: 'In stock', color: 'green' },
  outOfStock: { label: 'Out of stock', color: 'red' },
  available: { label: 'Available', color: 'green' },
  under_repair: { label: 'Under repair', color: 'gold' },
  lost: { label: 'Lost', color: 'red' },
  disposed: { label: 'Disposed', color: 'default' },
  good: { label: 'Good', color: 'green' },
  damaged: { label: 'Damaged', color: 'gold' },
  stock_in: { label: 'Stock in', color: 'green' },
  stock_out: { label: 'Stock out', color: 'blue' },
  adjustment: { label: 'Adjustment', color: 'purple' },
  borrow: { label: 'Borrow', color: 'blue' },
  return: { label: 'Return', color: 'green' },
});

/** Brand colors (mirrors the design prototype). Prefer theme tokens in components. */
export const BRAND_COLORS = Object.freeze({
  navy: '#123A7A',
  primary: '#1F4FA8',
  link: '#1A4494',
  gold: '#E8B71A',
  goldSoft: '#FCF3D6',
  goldText: '#5A3E00',
  blueSoft: '#E8EEF9',
  pageBg: '#F5F7FA',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#475569',
});

/** Item kinds: supplies are consumed, equipment is borrowed and returned. */
export const ITEM_KINDS = Object.freeze({
  SUPPLY: 'supply',
  EQUIPMENT: 'equipment',
});

/** Display labels for item kinds. */
export const ITEM_KIND_LABELS = Object.freeze({
  [ITEM_KINDS.SUPPLY]: 'Supply',
  [ITEM_KINDS.EQUIPMENT]: 'Equipment',
});

/** How an item type's stock is tracked. */
export const TRACKING_MODES = Object.freeze({
  QUANTITY: 'quantity',
  UNIT: 'unit',
});

/** Display labels for tracking modes. */
export const TRACKING_MODE_LABELS = Object.freeze({
  [TRACKING_MODES.QUANTITY]: 'By quantity',
  [TRACKING_MODES.UNIT]: 'By individual unit',
});

/** Data types for custom item type fields. */
export const FIELD_DATA_TYPES = Object.freeze({
  TEXT: 'text',
  NUMBER: 'number',
  DATE: 'date',
  BOOLEAN: 'boolean',
  SELECT: 'select',
});

/** Display labels for field data types. */
export const FIELD_DATA_TYPE_LABELS = Object.freeze({
  [FIELD_DATA_TYPES.TEXT]: 'Text',
  [FIELD_DATA_TYPES.NUMBER]: 'Number',
  [FIELD_DATA_TYPES.DATE]: 'Date',
  [FIELD_DATA_TYPES.BOOLEAN]: 'Yes / No',
  [FIELD_DATA_TYPES.SELECT]: 'Dropdown',
});

/** Where a custom field's value is stored. */
export const FIELD_APPLIES_TO = Object.freeze({
  ITEM: 'item',
  UNIT: 'unit',
});

/** Display labels for "applies to". */
export const FIELD_APPLIES_TO_LABELS = Object.freeze({
  [FIELD_APPLIES_TO.ITEM]: 'Item',
  [FIELD_APPLIES_TO.UNIT]: 'Each unit',
});

/** Statuses of individually tracked units. */
export const UNIT_STATUS = Object.freeze({
  AVAILABLE: 'available',
  BORROWED: 'borrowed',
  UNDER_REPAIR: 'under_repair',
  LOST: 'lost',
  DISPOSED: 'disposed',
});

/** Stock ledger transaction types. */
export const TRANSACTION_TYPES = Object.freeze({
  STOCK_IN: 'stock_in',
  STOCK_OUT: 'stock_out',
  ADJUSTMENT: 'adjustment',
  BORROW: 'borrow',
  RETURN: 'return',
});

/** Inventory request types. */
export const REQUEST_TYPES = Object.freeze({
  SUPPLY: 'supply',
  BORROW: 'borrow',
});

/** Display labels for request types. */
export const REQUEST_TYPE_LABELS = Object.freeze({
  [REQUEST_TYPES.SUPPLY]: 'Supply',
  [REQUEST_TYPES.BORROW]: 'Borrow',
});

/** Condition of a borrowed item when it is returned. */
export const RETURN_CONDITIONS = Object.freeze({
  GOOD: 'good',
  DAMAGED: 'damaged',
  LOST: 'lost',
});

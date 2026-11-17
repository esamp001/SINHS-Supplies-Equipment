/**
 * Server-wide constants. Status/enum values are defined once here and reused (AGENTS.md §12.2).
 */

/** System role codes. Roles control permissions; positions never do. */
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  CUSTODIAN: 'custodian',
  STAFF: 'staff',
});

/** User account statuses. */
export const USER_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  REJECTED: 'rejected',
  DEACTIVATED: 'deactivated',
});

/** Audit log actions. */
export const AUDIT_ACTIONS = Object.freeze({
  CREATE: 'create',
  UPDATE: 'update',
  APPROVE: 'approve',
  REJECT: 'reject',
  LOGIN: 'login',
  LOGOUT: 'logout',
  PASSWORD_RESET: 'password_reset',
  PASSWORD_CHANGE: 'password_change',
  ROLE_CHANGE: 'role_change',
  STATUS_CHANGE: 'status_change',
  DELETE: 'delete',
  CANCEL: 'cancel',
  RELEASE: 'release',
  RETURN: 'return',
  STOCK_IN: 'stock_in',
  ADJUSTMENT: 'adjustment',
});

/** Audit log entity types. */
export const ENTITY_TYPES = Object.freeze({
  USER: 'user',
  CATEGORY: 'category',
  UNIT: 'unit',
  LOCATION: 'location',
  POSITION: 'position',
  ITEM_TYPE: 'item_type',
  ITEM_TYPE_FIELD: 'item_type_field',
  ITEM: 'item',
  ITEM_UNIT: 'item_unit',
  STOCK_TRANSACTION: 'stock_transaction',
  REQUEST: 'inventory_request',
  BORROW_RECORD: 'borrow_record',
});

/** In-app notification types. */
export const NOTIFICATION_TYPES = Object.freeze({
  ACCOUNT_REGISTERED: 'account_registered',
  ACCOUNT_APPROVED: 'account_approved',
  ACCOUNT_REJECTED: 'account_rejected',
  REQUEST_SUBMITTED: 'request_submitted',
  REQUEST_APPROVED: 'request_approved',
  REQUEST_PARTIALLY_APPROVED: 'request_partially_approved',
  REQUEST_REJECTED: 'request_rejected',
  REQUEST_RELEASED: 'request_released',
  BORROW_RETURNED: 'borrow_returned',
  BORROW_DUE_SOON: 'borrow_due_soon',
  BORROW_OVERDUE: 'borrow_overdue',
});

/** Minimum password length for registration and password changes. */
export const MIN_PASSWORD_LENGTH = 8;

/** bcrypt cost factor (AGENTS.md §10: 10–12). */
export const BCRYPT_ROUNDS = 10;

/** Request statuses (AGENTS.md §9 workflow). */
export const REQUEST_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RELEASED: 'released',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
});

/** Borrowed items due within this many days count as "due soon". */
export const DUE_SOON_DAYS = 2;

/** Max rows in each dashboard list panel. */
export const DASHBOARD_LIST_LIMIT = 5;

/** Application timezone (AGENTS.md §8). */
export const APP_TIMEZONE = 'Asia/Manila';

/** Default and maximum page sizes for list endpoints (AGENTS.md §5). */
export const DEFAULT_PAGE_SIZE = 20;

export const MAX_PAGE_SIZE = 100;

/** Item kinds: supplies are consumed, equipment is borrowed and returned. */
export const ITEM_KINDS = Object.freeze({
  SUPPLY: 'supply',
  EQUIPMENT: 'equipment',
});

/** How an item type's stock is tracked. */
export const TRACKING_MODES = Object.freeze({
  QUANTITY: 'quantity',
  UNIT: 'unit',
});

/** Data types for custom item type fields. */
export const FIELD_DATA_TYPES = Object.freeze({
  TEXT: 'text',
  NUMBER: 'number',
  DATE: 'date',
  BOOLEAN: 'boolean',
  SELECT: 'select',
});

/** Where a custom field's value is stored: on the item or on each individual unit. */
export const FIELD_APPLIES_TO = Object.freeze({
  ITEM: 'item',
  UNIT: 'unit',
});

/** Statuses of individually tracked units (item_units). */
export const UNIT_STATUS = Object.freeze({
  AVAILABLE: 'available',
  BORROWED: 'borrowed',
  UNDER_REPAIR: 'under_repair',
  LOST: 'lost',
  DISPOSED: 'disposed',
});

/** Stock ledger transaction types. Quantities are signed: + adds stock, - removes it. */
export const TRANSACTION_TYPES = Object.freeze({
  STOCK_IN: 'stock_in',
  STOCK_OUT: 'stock_out',
  ADJUSTMENT: 'adjustment',
  BORROW: 'borrow',
  RETURN: 'return',
});

/** Ledger reference types (what caused a stock transaction). */
export const REFERENCE_TYPES = Object.freeze({
  REQUEST: 'inventory_request',
  BORROW_RECORD: 'borrow_record',
  ITEM_UNIT: 'item_unit',
});

/** Inventory request types. */
export const REQUEST_TYPES = Object.freeze({
  SUPPLY: 'supply',
  BORROW: 'borrow',
});

/** Borrow record statuses. */
export const BORROW_STATUS = Object.freeze({
  BORROWED: 'borrowed',
  RETURNED: 'returned',
});

/** Condition of a borrowed item when it comes back. */
export const RETURN_CONDITIONS = Object.freeze({
  GOOD: 'good',
  DAMAGED: 'damaged',
  LOST: 'lost',
});

/** School details printed on report exports (AGENTS.md §5). */
export const SCHOOL = Object.freeze({
  name: 'San Isidro National High School',
  location: 'Malilipot, Albay',
  systemName: 'Supplies & Equipment Management System',
});

/** Report export formats. */
export const REPORT_FORMATS = Object.freeze({
  JSON: 'json',
  XLSX: 'xlsx',
  PDF: 'pdf',
});

/** Safety cap on rows in one report. */
export const MAX_REPORT_ROWS = 5000;

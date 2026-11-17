/**
 * Shared JSDoc type definitions (AGENTS.md §12.4). This file has no runtime code.
 */

/**
 * @typedef {'admin' | 'custodian' | 'staff'} RoleCode
 */

/**
 * @typedef {'pending' | 'active' | 'rejected' | 'deactivated'} UserStatus
 */

/**
 * @typedef {Object} Position
 * @property {number} id - Position ID.
 * @property {string} name - Display name, e.g. "Teacher I".
 */

/**
 * @typedef {Object} AuthUser
 * @property {number} id - User ID.
 * @property {string} username - Login username.
 * @property {string} fullName - Full name.
 * @property {string} email - Email address.
 * @property {RoleCode} roleCode - System role.
 * @property {number} positionId - Position ID.
 * @property {string} positionName - School position label.
 * @property {'active'} status - Always active for a signed-in user.
 * @property {boolean} mustChangePassword - True after an admin password reset.
 * @property {string | null} lastLoginAt - ISO timestamp of the last sign-in.
 */

/**
 * @typedef {Object} User
 * @property {number} id - User ID.
 * @property {string} username - Login username.
 * @property {string} fullName - Full name.
 * @property {string} email - Email address.
 * @property {RoleCode | null} roleCode - System role (null while pending).
 * @property {number} positionId - Position ID.
 * @property {string} positionName - Position label.
 * @property {UserStatus} status - Account status.
 * @property {string} createdAt - ISO timestamp of registration.
 * @property {string | null} lastLoginAt - ISO timestamp of last sign-in.
 */

/**
 * @typedef {Object} PanelRow
 * @property {string | number} id - Row ID.
 * @property {string} main - Primary text.
 * @property {string} sub - Secondary text.
 * @property {string} status - Key of STATUS_TAGS.
 */

/**
 * @typedef {Object} DashboardSummary
 * @property {Object<string, number>} stats - Stat values keyed by stat key (GET /dashboard/summary).
 * @property {Object<string, Array<Object>>} panels - Raw records keyed by panel key; each panel's
 *   `toRow` in dashboardConfig.js turns a record into a PanelRow.
 */

/**
 * @typedef {Object} PageMeta
 * @property {number} page - 1-based page number.
 * @property {number} pageSize - Rows per page.
 * @property {number} total - Total matching rows.
 */

/**
 * @typedef {Object} MasterDataRecord
 * @property {number} id - Record ID.
 * @property {string} name - Display name.
 * @property {string | null} description - Description (categories, locations).
 * @property {string | null} abbreviation - Short label (units).
 * @property {boolean} isActive - False when hidden from dropdowns.
 * @property {number} usageCount - Items (or users, for positions) using it.
 * @property {string} updatedAt - ISO timestamp.
 */

/**
 * @typedef {Object} ItemTypeField
 * @property {number} id - Field ID.
 * @property {number} itemTypeId - Owning type.
 * @property {string} key - Attribute key.
 * @property {string} label - Display label.
 * @property {'text' | 'number' | 'date' | 'boolean' | 'select'} dataType - Value type.
 * @property {string[] | null} options - Dropdown options.
 * @property {boolean} isRequired - Whether a value is required.
 * @property {'item' | 'unit'} appliesTo - Stored on the item or each unit.
 * @property {number} sortOrder - Display order.
 * @property {boolean} isActive - Hidden from forms when false.
 */

/**
 * @typedef {Object} ItemType
 * @property {number} id - Item type ID.
 * @property {string} name - Name.
 * @property {'supply' | 'equipment'} kind - Supply or equipment.
 * @property {'quantity' | 'unit'} trackingMode - Count only, or each unit tracked.
 * @property {number | null} maxBorrowDays - Borrow limit in days.
 * @property {boolean} isActive - Whether new items can use it.
 * @property {number} itemCount - Items of this type.
 * @property {ItemTypeField[]} fields - Custom fields.
 */

/**
 * @typedef {Object} ItemUnit
 * @property {number} id - Unit ID.
 * @property {number} itemId - Item ID.
 * @property {string} propertyNo - Property number.
 * @property {string | null} serialNo - Serial number.
 * @property {string} condition - Condition note.
 * @property {'available' | 'borrowed' | 'under_repair' | 'lost' | 'disposed'} status - Unit status.
 * @property {Object<string, *>} attributes - Values of the type's per-unit fields.
 */

/**
 * @typedef {Object} Item
 * @property {number} id - Item ID.
 * @property {string} code - Unique item code.
 * @property {string} name - Item name.
 * @property {number} itemTypeId - Item type ID.
 * @property {string} itemTypeName - Item type name.
 * @property {'supply' | 'equipment'} kind - From the item type.
 * @property {'quantity' | 'unit'} trackingMode - From the item type.
 * @property {number | null} maxBorrowDays - From the item type.
 * @property {number | null} categoryId - Category ID.
 * @property {string | null} categoryName - Category name.
 * @property {number} unitId - Unit of measure ID.
 * @property {string} unitName - Unit of measure name.
 * @property {number | null} locationId - Location ID.
 * @property {string | null} locationName - Location name.
 * @property {number} quantityOnHand - Available quantity.
 * @property {number} reorderLevel - Low-stock threshold.
 * @property {Object<string, *>} attributes - Values of the type's item fields.
 * @property {string} updatedAt - ISO timestamp.
 */

/**
 * @typedef {Object} StockTransaction
 * @property {number} id - Ledger entry ID.
 * @property {number} itemId - Item ID.
 * @property {string} itemCode - Item code.
 * @property {string} itemName - Item name.
 * @property {string | null} propertyNo - Unit property number (unit-tracked items).
 * @property {'stock_in' | 'stock_out' | 'adjustment' | 'borrow' | 'return'} type - Transaction type.
 * @property {number} quantity - Signed quantity (+ in, - out).
 * @property {string | null} referenceType - What caused it.
 * @property {number | null} referenceId - ID of what caused it.
 * @property {string | null} remarks - Reason or note.
 * @property {string} performedByName - Who recorded it.
 * @property {string} createdAt - ISO timestamp.
 */

/**
 * @typedef {Object} RequestItem
 * @property {number} id - Request item ID.
 * @property {number} itemId - Item ID.
 * @property {string} itemCode - Item code.
 * @property {string} itemName - Item name.
 * @property {string} unitName - Unit of measure.
 * @property {'quantity' | 'unit'} trackingMode - From the item type.
 * @property {number} quantityOnHand - Current available stock.
 * @property {number} requestedQuantity - Requested.
 * @property {number | null} approvedQuantity - Approved by the custodian.
 * @property {number | null} releasedQuantity - Released.
 * @property {string | null} remarks - Custodian remark.
 */

/**
 * @typedef {Object} InventoryRequest
 * @property {number} id - Request ID.
 * @property {'supply' | 'borrow'} requestType - Supply or borrow.
 * @property {'pending' | 'approved' | 'rejected' | 'released' | 'returned' | 'cancelled'} status - Workflow status.
 * @property {number} requestedBy - Requester user ID.
 * @property {string} requesterName - Requester name.
 * @property {string | null} purpose - Purpose.
 * @property {string | null} neededAt - Needed date ('YYYY-MM-DD').
 * @property {string | null} dueAt - Return due (borrow only), ISO timestamp.
 * @property {string | null} reviewerName - Who approved or rejected.
 * @property {string | null} reviewedAt - ISO timestamp.
 * @property {string | null} rejectionReason - Reason when rejected.
 * @property {string | null} releasedAt - ISO timestamp.
 * @property {string | null} itemSummary - Short summary of the items.
 * @property {string} createdAt - ISO timestamp.
 * @property {RequestItem[]} [items] - Items (detail view only).
 */

/**
 * @typedef {Object} BorrowRecordItem
 * @property {number} id - Borrow record item ID.
 * @property {number} itemId - Item ID.
 * @property {string} itemName - Item name.
 * @property {string | null} propertyNo - Unit property number.
 * @property {number} quantity - Quantity borrowed.
 * @property {'good' | 'damaged' | 'lost' | null} returnCondition - Condition on return.
 * @property {string | null} returnedAt - ISO timestamp.
 * @property {string | null} remarks - Return note.
 */

/**
 * @typedef {Object} BorrowRecord
 * @property {number} id - Borrow record ID.
 * @property {number} requestId - Source request.
 * @property {number} borrowerId - Borrower user ID.
 * @property {string} borrowerName - Borrower name.
 * @property {string} borrowedAt - ISO timestamp.
 * @property {string} dueAt - ISO timestamp.
 * @property {string | null} returnedAt - ISO timestamp.
 * @property {'borrowed' | 'returned'} status - Status.
 * @property {boolean} isOverdue - Due date passed and not returned.
 * @property {string | null} itemSummary - Short summary of the items.
 * @property {BorrowRecordItem[]} [items] - Items (detail view only).
 */

/**
 * @typedef {Object} AuditLogEntry
 * @property {number} id - Entry ID.
 * @property {number | null} userId - Who did it.
 * @property {string | null} userName - Their name.
 * @property {string} action - Action, e.g. "approve".
 * @property {string} entityType - What was changed.
 * @property {number | null} entityId - ID of what was changed.
 * @property {Object | null} before - Values before.
 * @property {Object | null} after - Values after.
 * @property {string | null} ipAddress - Client IP.
 * @property {string} createdAt - ISO timestamp.
 */

/**
 * @typedef {Object} AppNotification
 * @property {number} id - Notification ID.
 * @property {string} type - Notification type.
 * @property {string} title - Title.
 * @property {string} message - Message.
 * @property {string | null} link - In-app path to open.
 * @property {boolean} isRead - Whether it was read.
 * @property {string} createdAt - ISO timestamp.
 */

export {};

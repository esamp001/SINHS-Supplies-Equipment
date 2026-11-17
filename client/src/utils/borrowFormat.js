/**
 * Returns the status tag key for a borrow record (overdue wins over borrowed).
 * @param {import('./types.js').BorrowRecord} record - Borrow record.
 * @returns {string} Key of STATUS_TAGS.
 */
export const getBorrowStatusKey = (record) => (record.isOverdue ? 'overdue' : record.status);

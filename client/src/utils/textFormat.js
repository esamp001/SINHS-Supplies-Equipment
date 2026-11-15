/**
 * Returns the first word of a full name, used for greetings.
 * @param {string} fullName - Full name.
 * @returns {string} First name.
 */
export const getFirstName = (fullName) => (fullName || '').trim().split(/\s+/)[0] || '';

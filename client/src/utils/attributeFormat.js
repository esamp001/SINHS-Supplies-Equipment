import { FIELD_DATA_TYPES } from './constants.js';
import { formatDateOnly } from './dateFormat.js';

/**
 * Formats a custom attribute value for display.
 * @param {import('./types.js').ItemTypeField} field - Field definition.
 * @param {*} value - Stored value.
 * @returns {string} Display text, or an em dash when empty.
 */
export const formatAttributeValue = (field, value) => {
  if (value === undefined || value === null || value === '') {
    return '—';
  }

  if (field.dataType === FIELD_DATA_TYPES.BOOLEAN) {
    return value ? 'Yes' : 'No';
  }

  if (field.dataType === FIELD_DATA_TYPES.DATE) {
    return formatDateOnly(value);
  }

  return String(value);
};

/**
 * Removes empty values so optional fields aren't sent as blank strings.
 * @param {Object<string, *>} attributes - Attribute values from a form.
 * @returns {Object<string, *>} Attributes without empty values.
 */
export const compactAttributes = (attributes) =>
  Object.fromEntries(
    Object.entries(attributes).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );

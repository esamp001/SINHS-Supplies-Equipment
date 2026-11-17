import { useState } from 'react';
import { Alert, Checkbox, Col, Form, Input, InputNumber, Modal, Row, Select } from 'antd';

import {
  FIELD_APPLIES_TO,
  FIELD_APPLIES_TO_LABELS,
  FIELD_DATA_TYPE_LABELS,
  FIELD_DATA_TYPES,
  TRACKING_MODES,
} from '../../utils/constants.js';

const DATA_TYPE_OPTIONS = Object.values(FIELD_DATA_TYPES).map((dataType) => ({
  value: dataType,
  label: FIELD_DATA_TYPE_LABELS[dataType],
}));

const APPLIES_TO_OPTIONS = Object.values(FIELD_APPLIES_TO).map((appliesTo) => ({
  value: appliesTo,
  label: FIELD_APPLIES_TO_LABELS[appliesTo],
}));

/**
 * @typedef {Object} FieldFormData
 * @property {string} label - Display label.
 * @property {string} key - Attribute key (fixed after the field is created).
 * @property {string} dataType - Data type.
 * @property {string[]} options - Dropdown options (for the "Dropdown" type).
 * @property {boolean} isRequired - Whether a value is required.
 * @property {'item' | 'unit'} appliesTo - Stored on the item or on each unit.
 * @property {number | null} sortOrder - Display order.
 */

/**
 * Turns a label into a suggested attribute key, e.g. "Date acquired" → "date_acquired".
 * @param {string} label - Field label.
 * @returns {string} Key suggestion.
 */
const toFieldKey = (label) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^[^a-z]+/, '')
    .replace(/_+$/, '')
    .slice(0, 60);

/**
 * Validates the field form for quick feedback (the server validates again).
 * @param {FieldFormData} data - Form values.
 * @returns {Object<string, string>} Error message per field; empty when valid.
 */
const validateForm = (data) => {
  const errors = {};

  if (!data.label.trim()) {
    errors.label = 'Enter a label';
  }

  if (!/^[a-z][a-z0-9_]{0,59}$/.test(data.key)) {
    errors.key = 'Use lowercase letters, numbers and underscores, starting with a letter';
  }

  if (data.dataType === FIELD_DATA_TYPES.SELECT && !data.options.length) {
    errors.options = 'Add at least one option';
  }

  return errors;
};

/**
 * Add/edit dialog for a custom field of an item type. The key and "applies to" are fixed once
 * the field exists. Mount it with a `key` so it starts fresh for each field.
 * @param {Object} props
 * @param {import('../../utils/types.js').ItemType} props.itemType - Owning item type.
 * @param {import('../../utils/types.js').ItemTypeField | null} props.field - Field to edit, or null to add.
 * @param {(payload: Object) => Promise<void>} props.onSubmit - Saves; throws ApiError on failure.
 * @param {() => void} props.onCancel - Closes the dialog.
 * @returns {JSX.Element}
 */
export const ItemTypeFieldFormModal = ({ itemType, field, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    label: field?.label || '',
    key: field?.key || '',
    dataType: field?.dataType || FIELD_DATA_TYPES.TEXT,
    options: field?.options || [],
    isRequired: field?.isRequired || false,
    appliesTo: field?.appliesTo || FIELD_APPLIES_TO.ITEM,
    sortOrder: field?.sortOrder ?? null,
  });

  const [isKeyEdited, setIsKeyEdited] = useState(Boolean(field));
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isUnitTracked = itemType.trackingMode === TRACKING_MODES.UNIT;

  /**
   * Updates one field and clears its error.
   * @param {keyof FieldFormData} name - Field name.
   * @param {*} value - New value.
   * @returns {void}
   */
  const updateField = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  /**
   * onChange for the label; also suggests a key until the key is edited by hand.
   * @param {import('react').ChangeEvent<HTMLInputElement>} event - Change event.
   * @returns {void}
   */
  const handleLabelChange = (event) => {
    updateField('label', event.target.value);

    if (!isKeyEdited) {
      updateField('key', toFieldKey(event.target.value));
    }
  };

  /**
   * onChange for the key input.
   * @param {import('react').ChangeEvent<HTMLInputElement>} event - Change event.
   * @returns {void}
   */
  const handleKeyChange = (event) => {
    setIsKeyEdited(true);
    updateField('key', event.target.value.trim());
  };

  /**
   * onChange for the data type dropdown.
   * @param {string} dataType - Selected type.
   * @returns {void}
   */
  const handleDataTypeChange = (dataType) => updateField('dataType', dataType);

  /**
   * onChange for the options tag input.
   * @param {string[]} options - Options.
   * @returns {void}
   */
  const handleOptionsChange = (options) => updateField('options', options);

  /**
   * onChange for the "applies to" dropdown.
   * @param {'item' | 'unit'} appliesTo - Selected value.
   * @returns {void}
   */
  const handleAppliesToChange = (appliesTo) => updateField('appliesTo', appliesTo);

  /**
   * onChange for the required checkbox.
   * @param {import('antd').CheckboxChangeEvent} event - Change event.
   * @returns {void}
   */
  const handleRequiredChange = (event) => updateField('isRequired', event.target.checked);

  /**
   * onChange for the sort order input.
   * @param {number | null} value - Sort order.
   * @returns {void}
   */
  const handleSortOrderChange = (value) => updateField('sortOrder', value ?? null);

  /**
   * Validates and saves. Server field errors are shown under the matching inputs.
   * @returns {Promise<void>}
   */
  const handleSubmit = async () => {
    setErrorMessage('');
    const validationErrors = validateForm(formData);

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length) {
      return;
    }

    const payload = {
      label: formData.label.trim(),
      dataType: formData.dataType,
      options: formData.dataType === FIELD_DATA_TYPES.SELECT ? formData.options : null,
      isRequired: formData.isRequired,
    };

    if (formData.sortOrder !== null) {
      payload.sortOrder = formData.sortOrder;
    }

    if (!field) {
      payload.key = formData.key;
      payload.appliesTo = formData.appliesTo;
    }

    setSubmitting(true);

    try {
      await onSubmit(payload);
    } catch (error) {
      setErrors(error.errors || {});
      setErrorMessage(Object.keys(error.errors || {}).length ? '' : error.message);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Returns Form.Item props that show a field's error message.
   * @param {keyof FieldFormData} name - Field name.
   * @returns {{ validateStatus?: 'error', help?: string }} Form.Item props.
   */
  const getErrorProps = (name) =>
    errors[name] ? { validateStatus: 'error', help: errors[name] } : {};

  return (
    <Modal
      title={field ? `Edit field "${field.label}"` : `Add field to ${itemType.name}`}
      open
      okText={field ? 'Save field' : 'Add field'}
      okButtonProps={{ loading: submitting }}
      onOk={handleSubmit}
      onCancel={onCancel}
      destroyOnHidden
    >
      {errorMessage && (
        <Alert type="error" showIcon title={errorMessage} style={{ marginBottom: 16 }} />
      )}
      <Form layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item label="Label" htmlFor="fieldLabel" {...getErrorProps('label')}>
              <Input
                id="fieldLabel"
                value={formData.label}
                onChange={handleLabelChange}
                placeholder="e.g. Serial number"
                autoFocus
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Key"
              htmlFor="fieldKey"
              extra={field ? 'The key never changes.' : 'Used to store the value.'}
              {...getErrorProps('key')}
            >
              <Input
                id="fieldKey"
                value={formData.key}
                onChange={handleKeyChange}
                disabled={Boolean(field)}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item label="Data type" htmlFor="fieldDataType" {...getErrorProps('dataType')}>
              <Select
                id="fieldDataType"
                value={formData.dataType}
                onChange={handleDataTypeChange}
                options={DATA_TYPE_OPTIONS}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Applies to"
              htmlFor="fieldAppliesTo"
              extra={isUnitTracked ? '' : 'Per-unit fields need a type tracked by unit.'}
              {...getErrorProps('appliesTo')}
            >
              <Select
                id="fieldAppliesTo"
                value={formData.appliesTo}
                onChange={handleAppliesToChange}
                options={APPLIES_TO_OPTIONS}
                disabled={Boolean(field) || !isUnitTracked}
              />
            </Form.Item>
          </Col>
        </Row>
        {formData.dataType === FIELD_DATA_TYPES.SELECT && (
          <Form.Item
            label="Options"
            htmlFor="fieldOptions"
            extra="Type an option and press Enter."
            {...getErrorProps('options')}
          >
            <Select
              id="fieldOptions"
              mode="tags"
              value={formData.options}
              onChange={handleOptionsChange}
              open={false}
              suffixIcon={null}
            />
          </Form.Item>
        )}
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12}>
            <Form.Item label="Sort order" htmlFor="fieldSortOrder" {...getErrorProps('sortOrder')}>
              <InputNumber
                id="fieldSortOrder"
                precision={0}
                value={formData.sortOrder}
                onChange={handleSortOrderChange}
                placeholder="Last"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item htmlFor="fieldIsRequired" style={{ marginBottom: 0 }}>
              <Checkbox
                id="fieldIsRequired"
                checked={formData.isRequired}
                onChange={handleRequiredChange}
              >
                Required
              </Checkbox>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

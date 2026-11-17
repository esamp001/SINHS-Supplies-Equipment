import { useState } from 'react';
import { Alert, Col, Form, Input, Modal, Row } from 'antd';

import { AttributeFields } from '../../components/inventory/AttributeFields.jsx';
import { compactAttributes } from '../../utils/attributeFormat.js';

/**
 * @typedef {Object} UnitFormData
 * @property {string} propertyNo - Property number.
 * @property {string} serialNo - Serial number (optional).
 * @property {string} condition - Condition note.
 * @property {Object<string, *>} attributes - Per-unit custom field values.
 */

/**
 * Validates the unit form for quick feedback (the server validates again).
 * @param {UnitFormData} data - Form values.
 * @returns {Object<string, string>} Error message per field; empty when valid.
 */
const validateForm = (data) => {
  const errors = {};

  if (!data.propertyNo.trim()) {
    errors.propertyNo = 'Enter the property number';
  }

  return errors;
};

/**
 * Add/edit dialog for one unit of a unit-tracked item. Mount it with a `key` per unit.
 * @param {Object} props
 * @param {import('../../utils/types.js').ItemUnit | null} props.unit - Unit to edit, or null to register a new one.
 * @param {import('../../utils/types.js').ItemTypeField[]} props.fields - The type's per-unit fields.
 * @param {(payload: Object) => Promise<void>} props.onSubmit - Saves; throws ApiError on failure.
 * @param {() => void} props.onCancel - Closes the dialog.
 * @returns {JSX.Element}
 */
export const UnitFormModal = ({ unit, fields, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    propertyNo: unit?.propertyNo || '',
    serialNo: unit?.serialNo || '',
    condition: unit?.condition || 'good',
    attributes: unit?.attributes || {},
  });

  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /**
   * Updates one field and clears its error.
   * @param {keyof UnitFormData} field - Field name.
   * @param {*} value - New value.
   * @returns {void}
   */
  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  /**
   * onChange for text inputs (uses the input's `name` attribute).
   * @param {import('react').ChangeEvent<HTMLInputElement>} event - Change event.
   * @returns {void}
   */
  const handleInputChange = (event) => updateField(event.target.name, event.target.value);

  /**
   * onChange for a custom field value.
   * @param {string} key - Field key.
   * @param {*} value - New value.
   * @returns {void}
   */
  const handleAttributeChange = (key, value) => {
    setFormData((current) => ({ ...current, attributes: { ...current.attributes, [key]: value } }));
    setErrors((current) => ({ ...current, [`attributes.${key}`]: undefined }));
  };

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

    const activeKeys = fields.filter((field) => field.isActive).map((field) => field.key);

    setSubmitting(true);

    try {
      await onSubmit({
        propertyNo: formData.propertyNo.trim(),
        serialNo: formData.serialNo.trim(),
        condition: formData.condition.trim(),
        attributes: compactAttributes(
          Object.fromEntries(activeKeys.map((key) => [key, formData.attributes[key]])),
        ),
      });
    } catch (error) {
      setErrors(error.errors || {});
      setErrorMessage(Object.keys(error.errors || {}).length ? '' : error.message);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Returns Form.Item props that show a field's error message.
   * @param {keyof UnitFormData} field - Field name.
   * @returns {{ validateStatus?: 'error', help?: string }} Form.Item props.
   */
  const getErrorProps = (field) =>
    errors[field] ? { validateStatus: 'error', help: errors[field] } : {};

  return (
    <Modal
      title={unit ? `Edit unit ${unit.propertyNo}` : 'Register a unit'}
      open
      width={640}
      okText={unit ? 'Save unit' : 'Register unit'}
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
            <Form.Item
              label="Property number"
              htmlFor="unitPropertyNo"
              {...getErrorProps('propertyNo')}
            >
              <Input
                id="unitPropertyNo"
                name="propertyNo"
                value={formData.propertyNo}
                onChange={handleInputChange}
                placeholder="e.g. PROP-2024-0014"
                maxLength={60}
                autoFocus
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Serial number" htmlFor="unitSerialNo" {...getErrorProps('serialNo')}>
              <Input
                id="unitSerialNo"
                name="serialNo"
                value={formData.serialNo}
                onChange={handleInputChange}
                maxLength={100}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="Condition" htmlFor="unitCondition" {...getErrorProps('condition')}>
          <Input
            id="unitCondition"
            name="condition"
            value={formData.condition}
            onChange={handleInputChange}
            maxLength={30}
            placeholder="e.g. good, minor scratches"
          />
        </Form.Item>
        <AttributeFields
          fields={fields}
          values={formData.attributes}
          errors={errors}
          onChange={handleAttributeChange}
          idPrefix="unitAttribute"
        />
      </Form>
    </Modal>
  );
};

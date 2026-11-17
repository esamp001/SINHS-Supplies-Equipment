import { useState } from 'react';
import { Alert, Form, Input, Modal } from 'antd';

/**
 * @typedef {Object} MasterDataFormData
 * @property {string} name - Record name.
 * @property {string} extra - Description or abbreviation (depends on the list).
 */

/**
 * Validates the master data form for quick feedback (the server validates again).
 * @param {MasterDataFormData} data - Form values.
 * @returns {Object<string, string>} Error message per field; empty when valid.
 */
const validateForm = (data) => {
  const errors = {};

  if (!data.name.trim()) {
    errors.name = 'Enter a name';
  }

  return errors;
};

/**
 * Add/edit dialog for one master data record (category, unit, location or position).
 * Mount it with a `key` so it starts fresh for each record.
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is visible.
 * @param {string} props.label - Singular list label, e.g. "Category".
 * @param {{ key: 'description' | 'abbreviation', label: string, maxLength: number } | null} props.extraField - Second field, if the list has one.
 * @param {import('../../utils/types.js').MasterDataRecord | null} props.record - Record to edit, or null to add.
 * @param {(payload: Object) => Promise<void>} props.onSubmit - Saves the values; throws ApiError on failure.
 * @param {() => void} props.onCancel - Closes the dialog.
 * @returns {JSX.Element}
 */
export const MasterDataFormModal = ({ open, label, extraField, record, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: record?.name || '',
    extra: (extraField && record?.[extraField.key]) || '',
  });

  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /**
   * Updates one field and clears its error.
   * @param {keyof MasterDataFormData} field - Field name.
   * @param {string} value - New value.
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

    const payload = { name: formData.name.trim() };

    if (extraField) {
      payload[extraField.key] = formData.extra.trim();
    }

    setSubmitting(true);

    try {
      await onSubmit(payload);
    } catch (error) {
      const fieldErrors = error.errors || {};

      setErrors({ name: fieldErrors.name, extra: extraField && fieldErrors[extraField.key] });
      setErrorMessage(Object.keys(fieldErrors).length ? '' : error.message);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Returns Form.Item props that show a field's error message.
   * @param {keyof MasterDataFormData} field - Field name.
   * @returns {{ validateStatus?: 'error', help?: string }} Form.Item props.
   */
  const getErrorProps = (field) =>
    errors[field] ? { validateStatus: 'error', help: errors[field] } : {};

  return (
    <Modal
      title={record ? `Edit ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`}
      open={open}
      okText={record ? 'Save changes' : `Add ${label.toLowerCase()}`}
      okButtonProps={{ loading: submitting }}
      onOk={handleSubmit}
      onCancel={onCancel}
      destroyOnHidden
    >
      {errorMessage && (
        <Alert type="error" showIcon title={errorMessage} style={{ marginBottom: 16 }} />
      )}
      <Form layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="Name" htmlFor="masterDataName" {...getErrorProps('name')}>
          <Input
            id="masterDataName"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            autoFocus
          />
        </Form.Item>
        {extraField && (
          <Form.Item label={extraField.label} htmlFor="masterDataExtra" {...getErrorProps('extra')}>
            <Input
              id="masterDataExtra"
              name="extra"
              value={formData.extra}
              onChange={handleInputChange}
              maxLength={extraField.maxLength}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

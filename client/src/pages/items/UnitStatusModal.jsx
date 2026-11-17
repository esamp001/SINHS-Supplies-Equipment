import { useState } from 'react';
import { Alert, Form, Input, Modal, Select, Typography } from 'antd';

import { STATUS_TAGS, UNIT_STATUS } from '../../utils/constants.js';

/** Statuses a custodian can set by hand (borrowed is set by the borrow flow). */
const STATUS_OPTIONS = [
  UNIT_STATUS.AVAILABLE,
  UNIT_STATUS.UNDER_REPAIR,
  UNIT_STATUS.LOST,
  UNIT_STATUS.DISPOSED,
].map((status) => ({ value: status, label: STATUS_TAGS[status].label }));

/**
 * @typedef {Object} UnitStatusFormData
 * @property {string | null} status - New status.
 * @property {string} remarks - Reason (required).
 */

/**
 * Validates the status change form.
 * @param {UnitStatusFormData} data - Form values.
 * @param {string} currentStatus - The unit's current status.
 * @returns {Object<string, string>} Error message per field; empty when valid.
 */
const validateForm = (data, currentStatus) => {
  const errors = {};

  if (!data.status) {
    errors.status = 'Choose a status';
  } else if (data.status === currentStatus) {
    errors.status = 'Choose a different status';
  }

  if (!data.remarks.trim()) {
    errors.remarks = 'A reason is required';
  }

  return errors;
};

/**
 * Dialog to change a unit's status by hand (e.g. send for repair, mark lost or disposed).
 * Moving a unit into or out of "Available" changes stock and writes an adjustment entry.
 * @param {Object} props
 * @param {import('../../utils/types.js').ItemUnit} props.unit - Unit to change.
 * @param {(payload: { status: string, remarks: string }) => Promise<void>} props.onSubmit - Saves; throws ApiError on failure.
 * @param {() => void} props.onCancel - Closes the dialog.
 * @returns {JSX.Element}
 */
export const UnitStatusModal = ({ unit, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({ status: null, remarks: '' });
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /**
   * Updates one field and clears its error.
   * @param {keyof UnitStatusFormData} field - Field name.
   * @param {*} value - New value.
   * @returns {void}
   */
  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  /**
   * onChange for the status dropdown.
   * @param {string} status - Selected status.
   * @returns {void}
   */
  const handleStatusChange = (status) => updateField('status', status);

  /**
   * onChange for the reason input.
   * @param {import('react').ChangeEvent<HTMLTextAreaElement>} event - Change event.
   * @returns {void}
   */
  const handleRemarksChange = (event) => updateField('remarks', event.target.value);

  /**
   * Validates and saves.
   * @returns {Promise<void>}
   */
  const handleSubmit = async () => {
    setErrorMessage('');
    const validationErrors = validateForm(formData, unit.status);

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length) {
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit({ status: formData.status, remarks: formData.remarks.trim() });
    } catch (error) {
      setErrors(error.errors || {});
      setErrorMessage(Object.keys(error.errors || {}).length ? '' : error.message);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Returns Form.Item props that show a field's error message.
   * @param {keyof UnitStatusFormData} field - Field name.
   * @returns {{ validateStatus?: 'error', help?: string }} Form.Item props.
   */
  const getErrorProps = (field) =>
    errors[field] ? { validateStatus: 'error', help: errors[field] } : {};

  return (
    <Modal
      title={`Change status of ${unit.propertyNo}`}
      open
      okText="Change status"
      okButtonProps={{ loading: submitting }}
      onOk={handleSubmit}
      onCancel={onCancel}
      destroyOnHidden
    >
      {errorMessage && (
        <Alert type="error" showIcon title={errorMessage} style={{ marginBottom: 16 }} />
      )}
      <Typography.Paragraph type="secondary">
        Current status: {STATUS_TAGS[unit.status]?.label || unit.status}. Units that leave or return
        to &quot;Available&quot; change the quantity on hand and are recorded in the stock ledger.
        Disposed is final.
      </Typography.Paragraph>
      <Form layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="New status" htmlFor="unitStatus" {...getErrorProps('status')}>
          <Select
            id="unitStatus"
            value={formData.status}
            onChange={handleStatusChange}
            options={STATUS_OPTIONS}
            placeholder="Select"
          />
        </Form.Item>
        <Form.Item label="Reason" htmlFor="unitStatusRemarks" {...getErrorProps('remarks')}>
          <Input.TextArea
            id="unitStatusRemarks"
            rows={2}
            maxLength={200}
            value={formData.remarks}
            onChange={handleRemarksChange}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

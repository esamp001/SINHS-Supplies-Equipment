import { useState } from 'react';
import { Alert, Col, Form, Input, InputNumber, Modal, Row, Select, Typography } from 'antd';

import {
  ITEM_KIND_LABELS,
  ITEM_KINDS,
  TRACKING_MODE_LABELS,
  TRACKING_MODES,
} from '../../utils/constants.js';

const KIND_OPTIONS = Object.values(ITEM_KINDS).map((kind) => ({
  value: kind,
  label: ITEM_KIND_LABELS[kind],
}));

const TRACKING_OPTIONS = Object.values(TRACKING_MODES).map((mode) => ({
  value: mode,
  label: TRACKING_MODE_LABELS[mode],
}));

/**
 * @typedef {Object} ItemTypeFormData
 * @property {string} name - Type name.
 * @property {'supply' | 'equipment' | null} kind - Supply or equipment.
 * @property {'quantity' | 'unit'} trackingMode - Tracking mode.
 * @property {number | null} maxBorrowDays - Borrow limit (equipment only; empty = no limit).
 */

/**
 * Validates the item type form for quick feedback (the server validates again).
 * @param {ItemTypeFormData} data - Form values.
 * @returns {Object<string, string>} Error message per field; empty when valid.
 */
const validateForm = (data) => {
  const errors = {};

  if (!data.name.trim()) {
    errors.name = 'Enter a name';
  }

  if (!data.kind) {
    errors.kind = 'Choose supply or equipment';
  }

  if (data.maxBorrowDays !== null && (data.maxBorrowDays < 1 || data.maxBorrowDays > 365)) {
    errors.maxBorrowDays = 'Enter 1–365 days, or leave empty for no limit';
  }

  return errors;
};

/**
 * Add/edit dialog for an item type. Kind and tracking mode are locked once items use the type.
 * Mount it with a `key` so it starts fresh for each type.
 * @param {Object} props
 * @param {import('../../utils/types.js').ItemType | null} props.itemType - Type to edit, or null to add.
 * @param {(payload: Object) => Promise<void>} props.onSubmit - Saves; throws ApiError on failure.
 * @param {() => void} props.onCancel - Closes the dialog.
 * @returns {JSX.Element}
 */
export const ItemTypeFormModal = ({ itemType, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: itemType?.name || '',
    kind: itemType?.kind || null,
    trackingMode: itemType?.trackingMode || TRACKING_MODES.QUANTITY,
    maxBorrowDays: itemType?.maxBorrowDays ?? null,
  });

  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isLocked = Boolean(itemType && itemType.itemCount > 0);
  const isSupply = formData.kind === ITEM_KINDS.SUPPLY;

  /**
   * Updates one field and clears its error.
   * @param {keyof ItemTypeFormData} field - Field name.
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
   * onChange for the kind dropdown. Supplies are always tracked by quantity with no borrow limit.
   * @param {'supply' | 'equipment'} kind - Selected kind.
   * @returns {void}
   */
  const handleKindChange = (kind) => {
    updateField('kind', kind);

    if (kind === ITEM_KINDS.SUPPLY) {
      updateField('trackingMode', TRACKING_MODES.QUANTITY);
      updateField('maxBorrowDays', null);
    }
  };

  /**
   * onChange for the tracking mode dropdown.
   * @param {'quantity' | 'unit'} trackingMode - Selected mode.
   * @returns {void}
   */
  const handleTrackingModeChange = (trackingMode) => updateField('trackingMode', trackingMode);

  /**
   * onChange for the max borrow days input.
   * @param {number | null} value - Days, or null for no limit.
   * @returns {void}
   */
  const handleMaxBorrowDaysChange = (value) => updateField('maxBorrowDays', value ?? null);

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

    setSubmitting(true);

    try {
      await onSubmit({ ...formData, name: formData.name.trim() });
    } catch (error) {
      setErrors(error.errors || {});
      setErrorMessage(Object.keys(error.errors || {}).length ? '' : error.message);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Returns Form.Item props that show a field's error message.
   * @param {keyof ItemTypeFormData} field - Field name.
   * @returns {{ validateStatus?: 'error', help?: string }} Form.Item props.
   */
  const getErrorProps = (field) =>
    errors[field] ? { validateStatus: 'error', help: errors[field] } : {};

  return (
    <Modal
      title={itemType ? `Edit ${itemType.name}` : 'Add item type'}
      open
      okText={itemType ? 'Save changes' : 'Add item type'}
      okButtonProps={{ loading: submitting }}
      onOk={handleSubmit}
      onCancel={onCancel}
      destroyOnHidden
    >
      {errorMessage && (
        <Alert type="error" showIcon title={errorMessage} style={{ marginBottom: 16 }} />
      )}
      <Form layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="Name" htmlFor="itemTypeName" {...getErrorProps('name')}>
          <Input
            id="itemTypeName"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g. Laptop"
            autoFocus
          />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item label="Kind" htmlFor="itemTypeKind" {...getErrorProps('kind')}>
              <Select
                id="itemTypeKind"
                value={formData.kind}
                onChange={handleKindChange}
                options={KIND_OPTIONS}
                disabled={isLocked}
                placeholder="Select"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Track stock"
              htmlFor="itemTypeTrackingMode"
              {...getErrorProps('trackingMode')}
            >
              <Select
                id="itemTypeTrackingMode"
                value={formData.trackingMode}
                onChange={handleTrackingModeChange}
                options={TRACKING_OPTIONS}
                disabled={isLocked || isSupply}
              />
            </Form.Item>
          </Col>
        </Row>
        {formData.kind === ITEM_KINDS.EQUIPMENT && (
          <Form.Item
            label="Max borrow days"
            htmlFor="itemTypeMaxBorrowDays"
            extra="Leave empty for no limit."
            {...getErrorProps('maxBorrowDays')}
          >
            <InputNumber
              id="itemTypeMaxBorrowDays"
              min={1}
              max={365}
              precision={0}
              value={formData.maxBorrowDays}
              onChange={handleMaxBorrowDaysChange}
              style={{ width: '100%' }}
            />
          </Form.Item>
        )}
        {isLocked && (
          <Typography.Text type="secondary">
            Kind and tracking can't change because {itemType.itemCount} item(s) use this type.
          </Typography.Text>
        )}
      </Form>
    </Modal>
  );
};

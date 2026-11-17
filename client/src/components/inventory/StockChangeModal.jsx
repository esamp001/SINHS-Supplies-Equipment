import { useState } from 'react';
import { Alert, Form, Input, InputNumber, Modal, Typography } from 'antd';

import { recordAdjustment, recordStockIn } from '../../api/stockTransactions.api.js';
import { TRACKING_MODES } from '../../utils/constants.js';
import { ItemSelect } from './ItemSelect.jsx';

/**
 * @typedef {Object} StockChangeFormData
 * @property {number | null} itemId - Item to change.
 * @property {number | null} quantity - Quantity (signed for adjustments).
 * @property {string} remarks - Reason or reference (required for adjustments).
 */

/**
 * Validates the stock change form for quick feedback (the server validates again).
 * @param {StockChangeFormData} data - Form values.
 * @param {boolean} isAdjustment - Adjustments allow negatives and need a reason.
 * @returns {Object<string, string>} Error message per field; empty when valid.
 */
const validateForm = (data, isAdjustment) => {
  const errors = {};

  if (!data.itemId) {
    errors.itemId = 'Choose an item';
  }

  if (!Number.isInteger(data.quantity) || data.quantity === 0) {
    errors.quantity = 'Enter a whole number other than zero';
  } else if (!isAdjustment && data.quantity < 0) {
    errors.quantity = 'Quantity must be positive';
  }

  if (isAdjustment && !data.remarks.trim()) {
    errors.remarks = 'A reason is required';
  }

  return errors;
};

/**
 * Stock-in or adjustment dialog for quantity-tracked items. Both write a ledger entry.
 * Mount it with a `key` so it starts fresh each time.
 * @param {Object} props
 * @param {'stockIn' | 'adjustment'} props.mode - Which change to record.
 * @param {import('../../utils/types.js').Item | null} [props.item] - Fixed item (hides the item picker).
 * @param {(item: import('../../utils/types.js').Item) => void} props.onSaved - Called with the updated item.
 * @param {() => void} props.onCancel - Closes the dialog.
 * @returns {JSX.Element}
 */
export const StockChangeModal = ({ mode, item = null, onSaved, onCancel }) => {
  const [formData, setFormData] = useState({
    itemId: item?.id || null,
    quantity: null,
    remarks: '',
  });

  const [selectedItem, setSelectedItem] = useState(item);
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isAdjustment = mode === 'adjustment';

  /**
   * Updates one field and clears its error.
   * @param {keyof StockChangeFormData} field - Field name.
   * @param {*} value - New value.
   * @returns {void}
   */
  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  /**
   * onChange for the item picker.
   * @param {number | null} itemId - Selected item ID.
   * @param {import('../../utils/types.js').Item | null} record - Selected item.
   * @returns {void}
   */
  const handleItemChange = (itemId, record) => {
    updateField('itemId', itemId);
    setSelectedItem(record);
  };

  /**
   * onChange for the quantity input.
   * @param {number | null} value - Quantity.
   * @returns {void}
   */
  const handleQuantityChange = (value) => updateField('quantity', value ?? null);

  /**
   * onChange for the remarks input.
   * @param {import('react').ChangeEvent<HTMLTextAreaElement>} event - Change event.
   * @returns {void}
   */
  const handleRemarksChange = (event) => updateField('remarks', event.target.value);

  /**
   * Validates and records the change.
   * @returns {Promise<void>}
   */
  const handleSubmit = async () => {
    setErrorMessage('');
    const validationErrors = validateForm(formData, isAdjustment);

    if (selectedItem?.trackingMode === TRACKING_MODES.UNIT) {
      validationErrors.itemId = 'This item is tracked by unit. Manage its units on the Items page.';
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length) {
      return;
    }

    const payload = {
      itemId: formData.itemId,
      quantity: formData.quantity,
      remarks: formData.remarks.trim(),
    };

    setSubmitting(true);

    try {
      const updated = isAdjustment ? await recordAdjustment(payload) : await recordStockIn(payload);

      onSaved(updated);
    } catch (error) {
      setErrors(error.errors || {});
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Returns Form.Item props that show a field's error message.
   * @param {keyof StockChangeFormData} field - Field name.
   * @returns {{ validateStatus?: 'error', help?: string }} Form.Item props.
   */
  const getErrorProps = (field) =>
    errors[field] ? { validateStatus: 'error', help: errors[field] } : {};

  return (
    <Modal
      title={isAdjustment ? 'Adjust stock' : 'Record stock-in'}
      open
      okText={isAdjustment ? 'Save adjustment' : 'Record stock-in'}
      okButtonProps={{ loading: submitting }}
      onOk={handleSubmit}
      onCancel={onCancel}
      destroyOnHidden
    >
      {errorMessage && (
        <Alert type="error" showIcon title={errorMessage} style={{ marginBottom: 16 }} />
      )}
      <Form layout="vertical" onFinish={handleSubmit}>
        {item ? (
          <Typography.Paragraph>
            <Typography.Text strong>
              {item.code} · {item.name}
            </Typography.Text>
            <br />
            <Typography.Text type="secondary">
              On hand: {item.quantityOnHand} {item.unitName}
            </Typography.Text>
          </Typography.Paragraph>
        ) : (
          <Form.Item label="Item" htmlFor="stockItem" {...getErrorProps('itemId')}>
            <ItemSelect
              id="stockItem"
              value={formData.itemId}
              onChange={handleItemChange}
              filters={{ trackingMode: TRACKING_MODES.QUANTITY }}
              status={errors.itemId ? 'error' : ''}
            />
          </Form.Item>
        )}
        <Form.Item
          label={isAdjustment ? 'Quantity change' : 'Quantity received'}
          htmlFor="stockQuantity"
          extra={isAdjustment ? 'Use a negative number to remove stock, e.g. -2.' : undefined}
          {...getErrorProps('quantity')}
        >
          <InputNumber
            id="stockQuantity"
            precision={0}
            min={isAdjustment ? undefined : 1}
            value={formData.quantity}
            onChange={handleQuantityChange}
            style={{ width: '100%' }}
            suffix={selectedItem?.unitName}
          />
        </Form.Item>
        <Form.Item
          label={isAdjustment ? 'Reason' : 'Remarks (e.g. delivery receipt no.)'}
          htmlFor="stockRemarks"
          {...getErrorProps('remarks')}
        >
          <Input.TextArea
            id="stockRemarks"
            rows={2}
            maxLength={255}
            value={formData.remarks}
            onChange={handleRemarksChange}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

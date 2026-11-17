import { useState } from 'react';
import { Alert, Checkbox, Flex, Form, Input, Modal, Select, Table, Typography } from 'antd';

import { returnBorrowedItems } from '../../api/borrowRecords.api.js';
import { RETURN_CONDITIONS, STATUS_TAGS } from '../../utils/constants.js';

const CONDITION_OPTIONS = Object.values(RETURN_CONDITIONS).map((condition) => ({
  value: condition,
  label: STATUS_TAGS[condition].label,
}));

/**
 * @typedef {Object} ReturnLine
 * @property {boolean} isSelected - Whether this item is being returned now.
 * @property {string} condition - Return condition.
 * @property {string} remarks - Note (required for damaged or lost).
 */

/**
 * Validates the return form.
 * @param {Object<number, ReturnLine>} lines - Return lines by borrow record item ID.
 * @returns {Object<string, string>} Error message per field; empty when valid.
 */
const validateForm = (lines) => {
  const errors = {};
  const selected = Object.entries(lines).filter(([, line]) => line.isSelected);

  if (!selected.length) {
    errors.form = 'Tick at least one item that came back.';
  }

  selected.forEach(([id, line]) => {
    if (line.condition !== RETURN_CONDITIONS.GOOD && !line.remarks.trim()) {
      errors[`remarks.${id}`] = 'Describe the damage or loss';
    }
  });

  return errors;
};

/**
 * Return dialog: tick the items that came back and record each one's condition.
 * Good items go back to stock; damaged units go under repair and lost units are marked lost.
 * @param {Object} props
 * @param {import('../../utils/types.js').BorrowRecord & { items: import('../../utils/types.js').BorrowRecordItem[] }} props.record - Borrow record.
 * @param {() => void} props.onReturned - Called after a successful return.
 * @param {() => void} props.onCancel - Closes the dialog.
 * @returns {JSX.Element}
 */
export const ReturnItemsModal = ({ record, onReturned, onCancel }) => {
  const openItems = record.items.filter((item) => !item.returnedAt);

  const [lines, setLines] = useState(
    Object.fromEntries(
      openItems.map((item) => [
        item.id,
        { isSelected: true, condition: RETURN_CONDITIONS.GOOD, remarks: '' },
      ]),
    ),
  );

  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /**
   * Updates one line and clears its errors.
   * @param {number} itemId - Borrow record item ID.
   * @param {keyof ReturnLine} field - Field name.
   * @param {*} value - New value.
   * @returns {void}
   */
  const updateLine = (itemId, field, value) => {
    setLines((current) => ({ ...current, [itemId]: { ...current[itemId], [field]: value } }));
    setErrors((current) => ({ ...current, [`remarks.${itemId}`]: undefined, form: undefined }));
  };

  /**
   * Validates and records the return.
   * @returns {Promise<void>}
   */
  const handleSubmit = async () => {
    setErrorMessage('');
    const validationErrors = validateForm(lines);

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length) {
      return;
    }

    const items = Object.entries(lines)
      .filter(([, line]) => line.isSelected)
      .map(([id, line]) => ({
        borrowRecordItemId: Number(id),
        condition: line.condition,
        remarks: line.remarks.trim(),
      }));

    setSubmitting(true);

    try {
      await returnBorrowedItems(record.id, { items });
      onReturned();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Returned',
      key: 'selected',
      width: 90,
      render: (_value, item) => (
        <Checkbox
          aria-label={`Returned: ${item.itemName}`}
          checked={lines[item.id].isSelected}
          onChange={(event) => updateLine(item.id, 'isSelected', event.target.checked)}
        />
      ),
    },
    {
      title: 'Item',
      key: 'item',
      render: (_value, item) => (
        <Flex vertical>
          <Typography.Text strong>{item.itemName}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {item.propertyNo || `${item.quantity} ${item.unitName}`}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Condition',
      key: 'condition',
      width: 140,
      render: (_value, item) => (
        <Select
          aria-label={`Condition of ${item.itemName}`}
          value={lines[item.id].condition}
          onChange={(condition) => updateLine(item.id, 'condition', condition)}
          options={CONDITION_OPTIONS}
          disabled={!lines[item.id].isSelected}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Remarks',
      key: 'remarks',
      width: 240,
      render: (_value, item) => {
        const error = errors[`remarks.${item.id}`];

        return (
          <Form.Item
            htmlFor={`returnRemarks-${item.id}`}
            validateStatus={error ? 'error' : undefined}
            help={error}
            style={{ marginBottom: 0 }}
          >
            <Input
              id={`returnRemarks-${item.id}`}
              aria-label={`Remarks for ${item.itemName}`}
              maxLength={255}
              value={lines[item.id].remarks}
              onChange={(event) => updateLine(item.id, 'remarks', event.target.value)}
              disabled={!lines[item.id].isSelected}
              placeholder="Required if damaged or lost"
            />
          </Form.Item>
        );
      },
    },
  ];

  return (
    <Modal
      title={`Record return for borrow #${record.id}`}
      open
      width={760}
      okText="Record return"
      okButtonProps={{ loading: submitting }}
      onOk={handleSubmit}
      onCancel={onCancel}
      destroyOnHidden
    >
      <Flex vertical gap={16}>
        {(errorMessage || errors.form) && (
          <Alert type="error" showIcon title={errors.form || errorMessage} />
        )}
        <Typography.Text type="secondary">
          Items in good condition go back to stock. Damaged units go under repair and lost units are
          marked lost; neither is added back automatically.
        </Typography.Text>
        <Form layout="vertical" onFinish={handleSubmit}>
          <Table
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={openItems}
            pagination={false}
            scroll={{ x: 660 }}
          />
        </Form>
      </Flex>
    </Modal>
  );
};

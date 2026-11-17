import { useState } from 'react';
import { Alert, DatePicker, Flex, Form, Input, InputNumber, Modal, Table, Typography } from 'antd';
import dayjs from 'dayjs';

import { approveRequest } from '../../api/requests.api.js';
import { REQUEST_TYPES } from '../../utils/constants.js';
import { formatDate } from '../../utils/dateFormat.js';

/**
 * @typedef {Object} ApproveFormData
 * @property {Object<number, { approvedQuantity: number | null, remarks: string }>} lines - Decision per request item ID.
 * @property {string | null} dueDate - Return date for borrow requests ('YYYY-MM-DD').
 */

/**
 * Validates the approval form (AGENTS.md §9 partial approval rules).
 * @param {ApproveFormData} data - Form values.
 * @param {import('../../utils/types.js').RequestItem[]} items - Request items.
 * @returns {Object<string, string>} Error message per field; empty when valid.
 */
const validateForm = (data, items) => {
  const errors = {};

  items.forEach((item, index) => {
    const line = data.lines[item.id];

    if (line.approvedQuantity === null || line.approvedQuantity < 0) {
      errors[`items.${index}.approvedQuantity`] = 'Enter 0 or more';
    } else if (line.approvedQuantity > item.requestedQuantity) {
      errors[`items.${index}.approvedQuantity`] = `At most ${item.requestedQuantity}`;
    } else if (line.approvedQuantity > item.quantityOnHand) {
      errors[`items.${index}.approvedQuantity`] = `Only ${item.quantityOnHand} in stock`;
    } else if (line.approvedQuantity < item.requestedQuantity && !line.remarks.trim()) {
      errors[`items.${index}.remarks`] = 'Say why less was approved';
    }
  });

  if (items.every((item) => data.lines[item.id].approvedQuantity === 0)) {
    errors.form = 'Approving every item at 0 is a rejection. Use Reject instead.';
  }

  return errors;
};

/**
 * Approval dialog: the custodian sets the approved quantity per item (partial approval allowed)
 * and, for borrow requests, may shorten the return date.
 * @param {Object} props
 * @param {import('../../utils/types.js').InventoryRequest & { items: import('../../utils/types.js').RequestItem[] }} props.request - Pending request.
 * @param {() => void} props.onApproved - Called after a successful approval.
 * @param {() => void} props.onCancel - Closes the dialog.
 * @returns {JSX.Element}
 */
export const ApproveRequestModal = ({ request, onApproved, onCancel }) => {
  const isBorrow = request.requestType === REQUEST_TYPES.BORROW;
  const currentDueDate = request.dueAt ? formatDate(request.dueAt, 'YYYY-MM-DD') : null;

  const [formData, setFormData] = useState({
    lines: Object.fromEntries(
      request.items.map((item) => [
        item.id,
        {
          approvedQuantity: Math.min(item.requestedQuantity, item.quantityOnHand),
          remarks: item.quantityOnHand < item.requestedQuantity ? 'Not enough stock' : '',
        },
      ]),
    ),
    dueDate: currentDueDate,
  });

  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /**
   * Updates one item's decision and clears its errors.
   * @param {number} requestItemId - Request item ID.
   * @param {number} index - Row index (error keys use it).
   * @param {'approvedQuantity' | 'remarks'} field - Field name.
   * @param {*} value - New value.
   * @returns {void}
   */
  const updateLine = (requestItemId, index, field, value) => {
    setFormData((current) => ({
      ...current,
      lines: {
        ...current.lines,
        [requestItemId]: { ...current.lines[requestItemId], [field]: value },
      },
    }));

    setErrors((current) => ({
      ...current,
      [`items.${index}.${field}`]: undefined,
      form: undefined,
    }));
  };

  /**
   * onChange for the return date picker.
   * @param {import('dayjs').Dayjs | null} date - Selected date.
   * @returns {void}
   */
  const handleDueDateChange = (date) => {
    setFormData((current) => ({ ...current, dueDate: date ? date.format('YYYY-MM-DD') : null }));
    setErrors((current) => ({ ...current, dueDate: undefined }));
  };

  /**
   * Blocks return dates before the needed date or after the requested return date.
   * @param {import('dayjs').Dayjs} date - Calendar date.
   * @returns {boolean} True when the date can't be picked.
   */
  const isDueDateDisabled = (date) => {
    const value = date.format('YYYY-MM-DD');

    return value < request.neededAt || value > currentDueDate;
  };

  /**
   * Validates and sends the approval.
   * @returns {Promise<void>}
   */
  const handleSubmit = async () => {
    setErrorMessage('');
    const validationErrors = validateForm(formData, request.items);

    if (isBorrow && !formData.dueDate) {
      validationErrors.dueDate = 'Choose the return date';
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length) {
      return;
    }

    const payload = {
      items: request.items.map((item) => ({
        requestItemId: item.id,
        approvedQuantity: formData.lines[item.id].approvedQuantity,
        remarks: formData.lines[item.id].remarks.trim(),
      })),
    };

    if (isBorrow) {
      payload.dueDate = formData.dueDate;
    }

    setSubmitting(true);

    try {
      await approveRequest(request.id, payload);
      onApproved();
    } catch (error) {
      setErrors(error.errors || {});
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Item',
      key: 'item',
      render: (_value, item) => (
        <Flex vertical>
          <Typography.Text strong>{item.itemName}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {item.itemCode} · {item.quantityOnHand} {item.unitName} in stock
          </Typography.Text>
        </Flex>
      ),
    },
    { title: 'Requested', dataIndex: 'requestedQuantity', key: 'requestedQuantity', width: 100 },
    {
      title: 'Approve',
      key: 'approvedQuantity',
      width: 130,
      render: (_value, item, index) => {
        const error = errors[`items.${index}.approvedQuantity`];

        return (
          <Form.Item
            htmlFor={`approve-${item.id}`}
            validateStatus={error ? 'error' : undefined}
            help={error}
            style={{ marginBottom: 0 }}
          >
            <InputNumber
              id={`approve-${item.id}`}
              aria-label={`Approved quantity for ${item.itemName}`}
              min={0}
              max={item.requestedQuantity}
              precision={0}
              value={formData.lines[item.id].approvedQuantity}
              onChange={(value) => updateLine(item.id, index, 'approvedQuantity', value ?? null)}
              style={{ width: '100%' }}
            />
          </Form.Item>
        );
      },
    },
    {
      title: 'Remark',
      key: 'remarks',
      width: 240,
      render: (_value, item, index) => {
        const error = errors[`items.${index}.remarks`];

        return (
          <Form.Item
            htmlFor={`remark-${item.id}`}
            validateStatus={error ? 'error' : undefined}
            help={error}
            style={{ marginBottom: 0 }}
          >
            <Input
              id={`remark-${item.id}`}
              aria-label={`Remark for ${item.itemName}`}
              maxLength={255}
              value={formData.lines[item.id].remarks}
              onChange={(event) => updateLine(item.id, index, 'remarks', event.target.value)}
              placeholder="Required if less than requested"
            />
          </Form.Item>
        );
      },
    },
  ];

  return (
    <Modal
      title={`Approve request #${request.id}`}
      open
      width={760}
      okText="Approve"
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
          Approve the full amount or less (down to 0 for an item). Stock is deducted only when you
          release the request.
        </Typography.Text>
        <Form layout="vertical" onFinish={handleSubmit}>
          <Table
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={request.items}
            pagination={false}
            scroll={{ x: 640 }}
          />
          {isBorrow && (
            <Form.Item
              label="Return date"
              htmlFor="approveDueDate"
              extra="You can shorten the borrow period but not extend it."
              validateStatus={errors.dueDate ? 'error' : undefined}
              help={errors.dueDate}
              style={{ marginTop: 16, marginBottom: 0 }}
            >
              <DatePicker
                id="approveDueDate"
                value={formData.dueDate ? dayjs(formData.dueDate) : null}
                onChange={handleDueDateChange}
                disabledDate={isDueDateDisabled}
                allowClear={false}
              />
            </Form.Item>
          )}
        </Form>
      </Flex>
    </Modal>
  );
};

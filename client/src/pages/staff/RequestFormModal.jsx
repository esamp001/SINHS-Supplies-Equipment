import { useState } from 'react';
import {
  Alert,
  Button,
  Col,
  DatePicker,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Table,
  Typography,
} from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { createRequest } from '../../api/requests.api.js';
import { REQUEST_TYPES } from '../../utils/constants.js';
import { getManilaToday } from '../../utils/dateFormat.js';

/**
 * @typedef {Object} RequestLine
 * @property {import('../../utils/types.js').Item} item - Requested item.
 * @property {number | null} quantity - Quantity.
 */

/**
 * @typedef {Object} RequestFormData
 * @property {string} purpose - What the items are for.
 * @property {string | null} neededAt - Needed date ('YYYY-MM-DD').
 * @property {string | null} dueDate - Return date for borrow requests ('YYYY-MM-DD').
 * @property {RequestLine[]} lines - Requested items.
 */

/**
 * Returns the strictest borrow limit (days) across the items, or null for no limit.
 * @param {RequestLine[]} lines - Request lines.
 * @returns {number | null} Days.
 */
const getBorrowLimit = (lines) => {
  const limits = lines.map((line) => line.item.maxBorrowDays).filter((days) => days !== null);

  return limits.length ? Math.min(...limits) : null;
};

/**
 * Validates the request form for quick feedback (the server validates again).
 * @param {RequestFormData} data - Form values.
 * @param {boolean} isBorrow - Borrow requests need a return date within the borrow limit.
 * @returns {Object<string, string>} Error message per field; empty when valid.
 */
const validateForm = (data, isBorrow) => {
  const errors = {};

  if (!data.purpose.trim()) {
    errors.purpose = 'Say what the items are for';
  }

  if (!data.neededAt) {
    errors.neededAt = 'Choose the date you need the items';
  }

  if (isBorrow && !data.dueDate) {
    errors.dueDate = 'Choose the return date';
  } else if (isBorrow && data.neededAt && data.dueDate < data.neededAt) {
    errors.dueDate = 'The return date must be on or after the needed date';
  }

  if (!data.lines.length) {
    errors.items = 'Add at least one item';
  }

  data.lines.forEach((line, index) => {
    if (!line.quantity || line.quantity < 1) {
      errors[`items.${index}.quantity`] = 'Enter a quantity';
    } else if (line.quantity > line.item.quantityOnHand) {
      errors[`items.${index}.quantity`] = `Only ${line.item.quantityOnHand} available`;
    }
  });

  return errors;
};

/**
 * Request form for staff: purpose, dates and quantities for the items picked on the
 * Available items page. Supplies make a supply request; equipment makes a borrow request.
 * @param {Object} props
 * @param {'supply' | 'borrow'} props.requestType - Request type.
 * @param {RequestLine[]} props.initialLines - Items picked so far.
 * @param {(request: import('../../utils/types.js').InventoryRequest) => void} props.onSubmitted - Called with the created request.
 * @param {() => void} props.onCancel - Closes the dialog.
 * @returns {JSX.Element}
 */
export const RequestFormModal = ({ requestType, initialLines, onSubmitted, onCancel }) => {
  const [formData, setFormData] = useState({
    purpose: '',
    neededAt: getManilaToday(),
    dueDate: null,
    lines: initialLines,
  });

  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isBorrow = requestType === REQUEST_TYPES.BORROW;
  const borrowLimit = getBorrowLimit(formData.lines);
  const today = getManilaToday();

  /**
   * Updates one field and clears its error.
   * @param {keyof RequestFormData} field - Field name.
   * @param {*} value - New value.
   * @returns {void}
   */
  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  /**
   * onChange for the purpose input.
   * @param {import('react').ChangeEvent<HTMLTextAreaElement>} event - Change event.
   * @returns {void}
   */
  const handlePurposeChange = (event) => updateField('purpose', event.target.value);

  /**
   * onChange for the needed date; clears a return date that is now too early.
   * @param {import('dayjs').Dayjs | null} date - Selected date.
   * @returns {void}
   */
  const handleNeededAtChange = (date) => {
    const neededAt = date ? date.format('YYYY-MM-DD') : null;

    updateField('neededAt', neededAt);

    if (formData.dueDate && neededAt && formData.dueDate < neededAt) {
      updateField('dueDate', null);
    }
  };

  /**
   * onChange for the return date.
   * @param {import('dayjs').Dayjs | null} date - Selected date.
   * @returns {void}
   */
  const handleDueDateChange = (date) =>
    updateField('dueDate', date ? date.format('YYYY-MM-DD') : null);

  /**
   * Updates the quantity of one line.
   * @param {number} index - Line index.
   * @param {number | null} quantity - New quantity.
   * @returns {void}
   */
  const handleQuantityChange = (index, quantity) => {
    setFormData((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, quantity: quantity ?? null } : line,
      ),
    }));

    setErrors((current) => ({ ...current, [`items.${index}.quantity`]: undefined }));
  };

  /**
   * Removes a line.
   * @param {number} itemId - Item ID of the line to remove.
   * @returns {void}
   */
  const handleRemoveLine = (itemId) => {
    setFormData((current) => ({
      ...current,
      lines: current.lines.filter((line) => line.item.id !== itemId),
    }));

    setErrors({});
  };

  /**
   * Blocks past needed dates.
   * @param {import('dayjs').Dayjs} date - Calendar date.
   * @returns {boolean} True when the date can't be picked.
   */
  const isNeededAtDisabled = (date) => date.format('YYYY-MM-DD') < today;

  /**
   * Blocks return dates before the needed date or beyond the borrow limit.
   * @param {import('dayjs').Dayjs} date - Calendar date.
   * @returns {boolean} True when the date can't be picked.
   */
  const isDueDateDisabled = (date) => {
    const value = date.format('YYYY-MM-DD');
    const start = formData.neededAt || today;

    if (value < start) {
      return true;
    }

    return borrowLimit !== null && date.diff(dayjs(start), 'day') > borrowLimit;
  };

  /**
   * Validates and submits the request.
   * @returns {Promise<void>}
   */
  const handleSubmit = async () => {
    setErrorMessage('');
    const validationErrors = validateForm(formData, isBorrow);

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length) {
      return;
    }

    const payload = {
      requestType,
      purpose: formData.purpose.trim(),
      neededAt: formData.neededAt,
      items: formData.lines.map((line) => ({ itemId: line.item.id, quantity: line.quantity })),
    };

    if (isBorrow) {
      payload.dueDate = formData.dueDate;
    }

    setSubmitting(true);

    try {
      onSubmitted(await createRequest(payload));
    } catch (error) {
      setErrors(error.errors || {});
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Returns Form.Item props that show a field's error message.
   * @param {string} field - Field name.
   * @returns {{ validateStatus?: 'error', help?: string }} Form.Item props.
   */
  const getErrorProps = (field) =>
    errors[field] ? { validateStatus: 'error', help: errors[field] } : {};

  const columns = [
    {
      title: 'Item',
      key: 'item',
      render: (_value, line, index) => {
        const itemError = errors[`items.${index}.itemId`];

        return (
          <Flex vertical>
            <Typography.Text strong>{line.item.name}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {line.item.quantityOnHand} {line.item.unitName} available
            </Typography.Text>
            {itemError && <Typography.Text type="danger">{itemError}</Typography.Text>}
          </Flex>
        );
      },
    },
    {
      title: 'Quantity',
      key: 'quantity',
      width: 160,
      render: (_value, line, index) => {
        const id = `requestQuantity-${line.item.id}`;
        const error = errors[`items.${index}.quantity`];

        return (
          <Form.Item
            htmlFor={id}
            validateStatus={error ? 'error' : undefined}
            help={error}
            style={{ marginBottom: 0 }}
          >
            <InputNumber
              id={id}
              aria-label={`Quantity of ${line.item.name}`}
              min={1}
              max={line.item.quantityOnHand}
              precision={0}
              value={line.quantity}
              onChange={(quantity) => handleQuantityChange(index, quantity)}
              suffix={line.item.unitName}
              style={{ width: '100%' }}
            />
          </Form.Item>
        );
      },
    },
    {
      title: '',
      key: 'remove',
      width: 56,
      render: (_value, line) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          aria-label={`Remove ${line.item.name}`}
          onClick={() => handleRemoveLine(line.item.id)}
        />
      ),
    },
  ];

  return (
    <Modal
      title={isBorrow ? 'Borrow equipment' : 'Request supplies'}
      open
      width={720}
      okText="Submit request"
      okButtonProps={{ loading: submitting, disabled: !formData.lines.length }}
      onOk={handleSubmit}
      onCancel={onCancel}
      destroyOnHidden
    >
      {errorMessage && (
        <Alert type="error" showIcon title={errorMessage} style={{ marginBottom: 16 }} />
      )}
      <Form layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="Purpose" htmlFor="requestPurpose" {...getErrorProps('purpose')}>
          <Input.TextArea
            id="requestPurpose"
            rows={2}
            maxLength={500}
            value={formData.purpose}
            onChange={handlePurposeChange}
            placeholder={
              isBorrow ? 'e.g. INSET seminar presentation' : 'e.g. Grade 9 quarterly exam printing'
            }
          />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item label="Needed on" htmlFor="requestNeededAt" {...getErrorProps('neededAt')}>
              <DatePicker
                id="requestNeededAt"
                value={formData.neededAt ? dayjs(formData.neededAt) : null}
                onChange={handleNeededAtChange}
                disabledDate={isNeededAtDisabled}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          {isBorrow && (
            <Col xs={24} sm={12}>
              <Form.Item
                label="Return by"
                htmlFor="requestDueDate"
                extra={
                  borrowLimit !== null
                    ? `At most ${borrowLimit} day(s) for these items.`
                    : undefined
                }
                {...getErrorProps('dueDate')}
              >
                <DatePicker
                  id="requestDueDate"
                  value={formData.dueDate ? dayjs(formData.dueDate) : null}
                  onChange={handleDueDateChange}
                  disabledDate={isDueDateDisabled}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          )}
        </Row>
        {errors.items && (
          <Alert type="error" showIcon title={errors.items} style={{ marginBottom: 12 }} />
        )}
        <Table
          rowKey={(line) => line.item.id}
          size="small"
          columns={columns}
          dataSource={formData.lines}
          pagination={false}
          locale={{ emptyText: 'No items selected' }}
        />
      </Form>
    </Modal>
  );
};

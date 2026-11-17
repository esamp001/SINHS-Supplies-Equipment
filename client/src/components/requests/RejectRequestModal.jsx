import { useState } from 'react';
import { Flex, Input, Modal, Typography } from 'antd';

import { rejectRequest } from '../../api/requests.api.js';

/**
 * Reject dialog for a pending request. A reason is required and is shown to the requester.
 * @param {Object} props
 * @param {import('../../utils/types.js').InventoryRequest} props.request - Pending request.
 * @param {() => void} props.onRejected - Called after a successful rejection.
 * @param {() => void} props.onCancel - Closes the dialog.
 * @returns {JSX.Element}
 */
export const RejectRequestModal = ({ request, onRejected, onCancel }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /**
   * Updates the reason and clears its error.
   * @param {import('react').ChangeEvent<HTMLTextAreaElement>} event - Change event.
   * @returns {void}
   */
  const handleReasonChange = (event) => {
    setReason(event.target.value);
    setError('');
  };

  /**
   * Validates and sends the rejection.
   * @returns {Promise<void>}
   */
  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('A reason is required.');

      return;
    }

    setSubmitting(true);

    try {
      await rejectRequest(request.id, reason.trim());
      onRejected();
    } catch (apiError) {
      setError(apiError.errors?.reason || apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Reject request #${request.id}?`}
      open
      okText="Reject"
      okButtonProps={{ danger: true, loading: submitting }}
      onOk={handleSubmit}
      onCancel={onCancel}
      destroyOnHidden
    >
      <Flex vertical gap={8}>
        <Typography.Text>Reason (shown to {request.requesterName})</Typography.Text>
        <Input.TextArea
          rows={3}
          maxLength={255}
          value={reason}
          onChange={handleReasonChange}
          status={error ? 'error' : ''}
          placeholder="e.g. Out of stock until next delivery"
          aria-label="Reason for rejection"
        />
        {error && <Typography.Text type="danger">{error}</Typography.Text>}
      </Flex>
    </Modal>
  );
};

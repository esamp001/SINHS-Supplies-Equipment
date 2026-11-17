import { useState } from 'react';
import { Alert, Flex, Form, Modal, Select, Typography } from 'antd';

import { releaseRequest } from '../../api/requests.api.js';
import { REQUEST_TYPES, TRACKING_MODES } from '../../utils/constants.js';
import { formatDateTime } from '../../utils/dateFormat.js';

/**
 * Release dialog for an approved request. Supplies are deducted as approved; for unit-tracked
 * equipment the custodian picks exactly which units are handed over.
 * @param {Object} props
 * @param {import('../../utils/types.js').InventoryRequest & { items: import('../../utils/types.js').RequestItem[], availableUnits: Object<number, Array<{ id: number, propertyNo: string, serialNo: string | null }>> }} props.request - Approved request.
 * @param {() => void} props.onReleased - Called after a successful release.
 * @param {() => void} props.onCancel - Closes the dialog.
 * @returns {JSX.Element}
 */
export const ReleaseRequestModal = ({ request, onReleased, onCancel }) => {
  const linesToRelease = request.items.filter((item) => item.approvedQuantity > 0);

  const unitLines = linesToRelease.filter(
    (item) =>
      request.requestType === REQUEST_TYPES.BORROW && item.trackingMode === TRACKING_MODES.UNIT,
  );

  const [unitPicks, setUnitPicks] = useState(
    Object.fromEntries(unitLines.map((item) => [item.id, []])),
  );

  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /**
   * onChange for a line's unit picker.
   * @param {number} requestItemId - Request item ID.
   * @param {number[]} unitIds - Picked unit IDs.
   * @returns {void}
   */
  const handleUnitsChange = (requestItemId, unitIds) => {
    setUnitPicks((current) => ({ ...current, [requestItemId]: unitIds }));
    setErrors((current) => ({ ...current, [`units.${requestItemId}`]: undefined }));
  };

  /**
   * Validates the unit picks and releases the request.
   * @returns {Promise<void>}
   */
  const handleSubmit = async () => {
    setErrorMessage('');
    const validationErrors = {};

    unitLines.forEach((item) => {
      if (unitPicks[item.id].length !== item.approvedQuantity) {
        validationErrors[`units.${item.id}`] = `Pick exactly ${item.approvedQuantity} unit(s)`;
      }
    });

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length) {
      return;
    }

    setSubmitting(true);

    try {
      await releaseRequest(request.id, { units: unitPicks });
      onReleased();
    } catch (error) {
      setErrors(error.errors || {});
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Release request #${request.id}`}
      open
      width={640}
      okText="Release items"
      okButtonProps={{ loading: submitting }}
      onOk={handleSubmit}
      onCancel={onCancel}
      destroyOnHidden
    >
      <Flex vertical gap={16}>
        {errorMessage && <Alert type="error" showIcon title={errorMessage} />}
        <Typography.Text type="secondary">
          Releasing deducts the approved quantities from stock and records them in the ledger.
          {request.requestType === REQUEST_TYPES.BORROW &&
            ` Items must be returned by ${formatDateTime(request.dueAt)}.`}
        </Typography.Text>
        <ul style={{ margin: 0, paddingInlineStart: 20 }}>
          {linesToRelease.map((item) => (
            <li key={item.id}>
              {item.itemName} × {item.approvedQuantity} {item.unitName}
            </li>
          ))}
        </ul>
        {unitLines.length > 0 && (
          <Form layout="vertical" onFinish={handleSubmit}>
            {unitLines.map((item) => {
              const id = `releaseUnits-${item.id}`;
              const error = errors[`units.${item.id}`];
              const units = request.availableUnits[item.id] || [];

              return (
                <Form.Item
                  key={item.id}
                  label={`${item.itemName}: pick ${item.approvedQuantity} unit(s)`}
                  htmlFor={id}
                  validateStatus={error ? 'error' : undefined}
                  help={error}
                >
                  <Select
                    id={id}
                    mode="multiple"
                    maxCount={item.approvedQuantity}
                    value={unitPicks[item.id]}
                    onChange={(unitIds) => handleUnitsChange(item.id, unitIds)}
                    options={units.map((unit) => ({
                      value: unit.id,
                      label: `${unit.propertyNo}${unit.serialNo ? ` · S/N ${unit.serialNo}` : ''}`,
                    }))}
                    placeholder="Select units"
                    notFoundContent="No available units"
                  />
                </Form.Item>
              );
            })}
          </Form>
        )}
      </Flex>
    </Modal>
  );
};

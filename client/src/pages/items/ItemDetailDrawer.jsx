import { useEffect, useState } from 'react';
import { Alert, App, Button, Descriptions, Drawer, Flex, Spin, Table, Typography } from 'antd';

import { addItemUnit, changeItemUnitStatus, getItem, updateItemUnit } from '../../api/items.api.js';
import { listStockTransactions } from '../../api/stockTransactions.api.js';
import { StatusTag } from '../../components/common/StatusTag.jsx';
import { StockChangeModal } from '../../components/inventory/StockChangeModal.jsx';
import { formatAttributeValue } from '../../utils/attributeFormat.js';
import {
  FIELD_APPLIES_TO,
  ITEM_KIND_LABELS,
  TRACKING_MODE_LABELS,
  TRACKING_MODES,
  UNIT_STATUS,
} from '../../utils/constants.js';
import { formatDateTime } from '../../utils/dateFormat.js';
import { UnitFormModal } from './UnitFormModal.jsx';
import { UnitStatusModal } from './UnitStatusModal.jsx';

/** Number of recent ledger entries shown in the drawer. */
const RECENT_TRANSACTION_COUNT = 10;

/**
 * Item detail drawer (Admin / Custodian): details, custom fields, units (for unit-tracked items),
 * stock-in / adjustment buttons and recent ledger entries.
 * @param {Object} props
 * @param {number | null} props.itemId - Item to show; null hides the drawer.
 * @param {number} props.refreshKey - Changes when the item was edited elsewhere (reloads the drawer).
 * @param {() => void} props.onEdit - Opens the edit dialog for this item.
 * @param {() => void} props.onChanged - Called after stock or units change so the list reloads.
 * @param {() => void} props.onClose - Closes the drawer.
 * @returns {JSX.Element}
 */
export const ItemDetailDrawer = ({ itemId, refreshKey, onEdit, onChanged, onClose }) => {
  const { message } = App.useApp();
  const [item, setItem] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [unitDialog, setUnitDialog] = useState(null);
  const [stockMode, setStockMode] = useState(null);

  useEffect(() => {
    if (!itemId) {
      return undefined;
    }

    let ignore = false;

    Promise.all([
      getItem(itemId),
      listStockTransactions({ itemId, pageSize: RECENT_TRANSACTION_COUNT }),
    ])
      .then(([detail, ledger]) => {
        if (!ignore) {
          setItem(detail);
          setTransactions(ledger.data);
          setErrorMessage('');
        }
      })
      .catch((error) => {
        if (!ignore) {
          setErrorMessage(error.message);
        }
      });

    return () => {
      ignore = true;
    };
  }, [itemId, reloadKey, refreshKey]);

  /**
   * Reloads the drawer and tells the page that something changed.
   * @returns {void}
   */
  const reload = () => {
    setReloadKey((key) => key + 1);
    onChanged();
  };

  const isLoading = Boolean(itemId) && item?.id !== itemId && !errorMessage;
  const isUnitTracked = item?.trackingMode === TRACKING_MODES.UNIT;

  const itemFields = (item?.fields || []).filter(
    (field) => field.appliesTo === FIELD_APPLIES_TO.ITEM,
  );

  const unitFields = (item?.fields || []).filter(
    (field) => field.appliesTo === FIELD_APPLIES_TO.UNIT,
  );

  /**
   * Saves the register/edit unit dialog.
   * @param {Object} payload - Unit values.
   * @returns {Promise<void>}
   * @throws {import('../../api/httpClient.js').ApiError} When the server rejects the values.
   */
  const handleUnitSubmit = async (payload) => {
    if (unitDialog.unit) {
      await updateItemUnit(item.id, unitDialog.unit.id, payload);
      message.success('Unit updated.');
    } else {
      await addItemUnit(item.id, payload);
      message.success('Unit registered and added to stock.');
    }

    setUnitDialog(null);
    reload();
  };

  /**
   * Saves the unit status dialog.
   * @param {{ status: string, remarks: string }} payload - New status and reason.
   * @returns {Promise<void>}
   * @throws {import('../../api/httpClient.js').ApiError} When the server rejects the change.
   */
  const handleStatusSubmit = async (payload) => {
    await changeItemUnitStatus(item.id, unitDialog.unit.id, payload);
    message.success('Unit status changed.');
    setUnitDialog(null);
    reload();
  };

  /**
   * Closes the stock dialog after a successful save and reloads.
   * @returns {void}
   */
  const handleStockSaved = () => {
    message.success(stockMode === 'adjustment' ? 'Adjustment recorded.' : 'Stock-in recorded.');
    setStockMode(null);
    reload();
  };

  const unitColumns = [
    {
      title: 'Property no.',
      key: 'propertyNo',
      render: (_value, unit) => (
        <Flex vertical>
          <Typography.Text strong>{unit.propertyNo}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            S/N {unit.serialNo || '—'}
          </Typography.Text>
        </Flex>
      ),
    },
    ...unitFields
      .filter((field) => field.isActive)
      .map((field) => ({
        title: field.label,
        key: field.key,
        render: (_value, unit) => formatAttributeValue(field, unit.attributes[field.key]),
      })),
    { title: 'Condition', dataIndex: 'condition', key: 'condition', width: 110 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => <StatusTag status={status} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 170,
      render: (_value, unit) => (
        <Flex>
          <Button type="link" size="small" onClick={() => setUnitDialog({ type: 'form', unit })}>
            Edit
          </Button>
          <Button
            type="link"
            size="small"
            disabled={[UNIT_STATUS.BORROWED, UNIT_STATUS.DISPOSED].includes(unit.status)}
            onClick={() => setUnitDialog({ type: 'status', unit })}
          >
            Status
          </Button>
        </Flex>
      ),
    },
  ];

  const transactionColumns = [
    {
      title: 'When',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (value) => formatDateTime(value),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (type) => <StatusTag status={type} />,
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 70,
      render: (quantity) => (quantity > 0 ? `+${quantity}` : quantity),
    },
    {
      title: 'Remarks',
      key: 'remarks',
      render: (_value, entry) => entry.remarks || entry.propertyNo || '—',
    },
    { title: 'By', dataIndex: 'performedByName', key: 'performedByName', width: 150 },
  ];

  return (
    <Drawer
      title={item ? `${item.code} · ${item.name}` : 'Item'}
      open={Boolean(itemId)}
      onClose={onClose}
      size={920}
      extra={
        item && (
          <Flex gap={8} wrap>
            <Button onClick={onEdit}>Edit</Button>
            {isUnitTracked ? (
              <Button type="primary" onClick={() => setUnitDialog({ type: 'form', unit: null })}>
                Register unit
              </Button>
            ) : (
              <>
                <Button onClick={() => setStockMode('adjustment')}>Adjust</Button>
                <Button type="primary" onClick={() => setStockMode('stockIn')}>
                  Stock in
                </Button>
              </>
            )}
          </Flex>
        )
      }
    >
      {errorMessage && <Alert type="error" showIcon title={errorMessage} />}
      {isLoading && <Spin />}
      {item && !isLoading && (
        <Flex vertical gap={24}>
          <Descriptions
            bordered
            size="small"
            column={{ xs: 1, sm: 2 }}
            items={[
              { key: 'type', label: 'Item type', children: item.itemTypeName },
              {
                key: 'kind',
                label: 'Kind / tracking',
                children: `${ITEM_KIND_LABELS[item.kind]} · ${TRACKING_MODE_LABELS[item.trackingMode]}`,
              },
              {
                key: 'onHand',
                label: 'On hand',
                children: (
                  <Flex gap={8} align="center">
                    {item.quantityOnHand} {item.unitName}
                    {item.quantityOnHand <= item.reorderLevel && <StatusTag status="lowStock" />}
                  </Flex>
                ),
              },
              { key: 'reorder', label: 'Reorder level', children: item.reorderLevel },
              { key: 'category', label: 'Category', children: item.categoryName || '—' },
              { key: 'location', label: 'Location', children: item.locationName || '—' },
              ...itemFields
                .filter((field) => field.isActive || item.attributes[field.key] !== undefined)
                .map((field) => ({
                  key: `attribute-${field.key}`,
                  label: field.label,
                  children: formatAttributeValue(field, item.attributes[field.key]),
                })),
            ]}
          />
          {isUnitTracked && (
            <Flex vertical gap={8}>
              <Typography.Title level={5} style={{ margin: 0 }}>
                Units ({item.units.length})
              </Typography.Title>
              <Table
                rowKey="id"
                size="small"
                columns={unitColumns}
                dataSource={item.units}
                pagination={false}
                scroll={{ x: 700 }}
                locale={{ emptyText: 'No units registered yet' }}
              />
            </Flex>
          )}
          <Flex vertical gap={8}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Recent stock activity
            </Typography.Title>
            <Table
              rowKey="id"
              size="small"
              columns={transactionColumns}
              dataSource={transactions}
              pagination={false}
              scroll={{ x: 700 }}
              locale={{ emptyText: 'No stock activity yet' }}
            />
          </Flex>
        </Flex>
      )}
      {unitDialog?.type === 'form' && (
        <UnitFormModal
          key={unitDialog.unit?.id || 'new'}
          unit={unitDialog.unit}
          fields={unitFields}
          onSubmit={handleUnitSubmit}
          onCancel={() => setUnitDialog(null)}
        />
      )}
      {unitDialog?.type === 'status' && (
        <UnitStatusModal
          key={unitDialog.unit.id}
          unit={unitDialog.unit}
          onSubmit={handleStatusSubmit}
          onCancel={() => setUnitDialog(null)}
        />
      )}
      {stockMode && item && (
        <StockChangeModal
          mode={stockMode}
          item={item}
          onSaved={handleStockSaved}
          onCancel={() => setStockMode(null)}
        />
      )}
    </Drawer>
  );
};

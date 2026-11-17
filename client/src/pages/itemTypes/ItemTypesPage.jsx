import { useEffect, useState } from 'react';
import { Alert, App, Button, Card, Flex, Table, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import {
  createItemType,
  deleteItemType,
  listItemTypes,
  updateItemType,
} from '../../api/itemTypes.api.js';
import { PageHero } from '../../components/common/PageHero.jsx';
import { StatusTag } from '../../components/common/StatusTag.jsx';
import { ITEM_KIND_LABELS, TRACKING_MODE_LABELS } from '../../utils/constants.js';
import { ItemTypeFieldsDrawer } from './ItemTypeFieldsDrawer.jsx';
import { ItemTypeFormModal } from './ItemTypeFormModal.jsx';

/**
 * Item types & fields page (Admin / Custodian): configurable types (Laptop, Bond paper, ...)
 * and their custom fields. Types in use can only be deactivated, not deleted.
 * @returns {JSX.Element}
 */
export const ItemTypesPage = () => {
  const { message, modal } = App.useApp();
  const [itemTypes, setItemTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(null);
  const [fieldsTypeId, setFieldsTypeId] = useState(null);

  useEffect(() => {
    let ignore = false;

    listItemTypes()
      .then((data) => {
        if (!ignore) {
          setItemTypes(data);
          setErrorMessage('');
        }
      })
      .catch((error) => {
        if (!ignore) {
          setErrorMessage(error.message);
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  /**
   * Reloads the item types after a change.
   * @returns {void}
   */
  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  /**
   * Replaces one item type in the list (after a field change in the drawer).
   * @param {import('../../utils/types.js').ItemType} updated - Updated type.
   * @returns {void}
   */
  const replaceItemType = (updated) =>
    setItemTypes((current) => current.map((type) => (type.id === updated.id ? updated : type)));

  /**
   * Saves the add/edit type dialog.
   * @param {Object} payload - Form values.
   * @returns {Promise<void>}
   * @throws {import('../../api/httpClient.js').ApiError} When the server rejects the values.
   */
  const handleSubmit = async (payload) => {
    if (editing.itemType) {
      await updateItemType(editing.itemType.id, {
        ...payload,
        isActive: editing.itemType.isActive,
      });

      message.success('Item type updated.');
    } else {
      const created = await createItemType(payload);

      message.success(`${created.name} added. Now add its custom fields.`);
      setFieldsTypeId(created.id);
    }

    setEditing(null);
    reload();
  };

  /**
   * Activates or deactivates an item type.
   * @param {import('../../utils/types.js').ItemType} itemType - Item type.
   * @returns {Promise<void>}
   */
  const handleToggleActive = async (itemType) => {
    try {
      await updateItemType(itemType.id, {
        name: itemType.name,
        kind: itemType.kind,
        trackingMode: itemType.trackingMode,
        maxBorrowDays: itemType.maxBorrowDays,
        isActive: !itemType.isActive,
      });

      message.success(`${itemType.name} ${itemType.isActive ? 'deactivated' : 'activated'}.`);
      reload();
    } catch (error) {
      message.error(error.message);
    }
  };

  /**
   * Asks for confirmation, then deletes an unused item type.
   * @param {import('../../utils/types.js').ItemType} itemType - Item type.
   * @returns {void}
   */
  const confirmDelete = (itemType) => {
    modal.confirm({
      title: `Delete ${itemType.name}?`,
      content: 'No items use this type, so it and its fields can be removed.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteItemType(itemType.id);
          message.success(`${itemType.name} deleted.`);
          reload();
        } catch (error) {
          message.error(error.message);
        }
      },
    });
  };

  const columns = [
    {
      title: 'Item type',
      key: 'name',
      render: (_value, itemType) => (
        <Flex vertical>
          <Typography.Text strong>{itemType.name}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {ITEM_KIND_LABELS[itemType.kind]} · {TRACKING_MODE_LABELS[itemType.trackingMode]}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Max borrow',
      dataIndex: 'maxBorrowDays',
      key: 'maxBorrowDays',
      width: 120,
      render: (value, itemType) => {
        if (itemType.kind !== 'equipment') {
          return '—';
        }

        return value ? `${value} day(s)` : 'No limit';
      },
    },
    {
      title: 'Fields',
      key: 'fields',
      width: 90,
      render: (_value, itemType) => itemType.fields.filter((field) => field.isActive).length,
    },
    { title: 'Items', dataIndex: 'itemCount', key: 'itemCount', width: 80 },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 110,
      render: (isActive) => <StatusTag status={isActive ? 'active' : 'inactive'} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 330,
      render: (_value, itemType) => (
        <Flex>
          <Button type="link" size="small" onClick={() => setFieldsTypeId(itemType.id)}>
            Fields
          </Button>
          <Button type="link" size="small" onClick={() => setEditing({ itemType })}>
            Edit
          </Button>
          <Button type="link" size="small" onClick={() => handleToggleActive(itemType)}>
            {itemType.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          {itemType.itemCount === 0 && (
            <Button type="link" size="small" danger onClick={() => confirmDelete(itemType)}>
              Delete
            </Button>
          )}
        </Flex>
      ),
    },
  ];

  return (
    <>
      <PageHero
        eyebrow={
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Inventory / Item types &amp; fields
          </Typography.Text>
        }
        title="Item types & fields"
        description="Each type decides whether items are supplies or equipment, how stock is tracked, the borrow limit and which extra details are recorded."
      >
        <Flex>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setEditing({ itemType: null })}
          >
            Add item type
          </Button>
        </Flex>
      </PageHero>
      {errorMessage && (
        <Alert
          type="error"
          showIcon
          title="Couldn't load item types."
          description={errorMessage}
          action={<Button onClick={reload}>Retry</Button>}
        />
      )}
      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={itemTypes}
          loading={loading}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: 'No item types yet' }}
        />
      </Card>
      {editing && (
        <ItemTypeFormModal
          key={editing.itemType?.id || 'new'}
          itemType={editing.itemType}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      )}
      <ItemTypeFieldsDrawer
        itemType={itemTypes.find((itemType) => itemType.id === fieldsTypeId) || null}
        onChanged={replaceItemType}
        onClose={() => setFieldsTypeId(null)}
      />
    </>
  );
};

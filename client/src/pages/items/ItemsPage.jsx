import { useEffect, useState } from 'react';
import { Alert, App, Button, Card, Checkbox, Flex, Input, Select, Table, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import { createItem, deleteItem, getItem, listItems, updateItem } from '../../api/items.api.js';
import { listItemTypes } from '../../api/itemTypes.api.js';
import { listMasterData } from '../../api/masterData.api.js';
import { PageHero } from '../../components/common/PageHero.jsx';
import { StatusTag } from '../../components/common/StatusTag.jsx';
import { DEFAULT_PAGE_SIZE, ITEM_KIND_LABELS, ITEM_KINDS } from '../../utils/constants.js';
import { formatDate } from '../../utils/dateFormat.js';
import { ItemDetailDrawer } from './ItemDetailDrawer.jsx';
import { ItemFormModal } from './ItemFormModal.jsx';

const KIND_OPTIONS = Object.values(ITEM_KINDS).map((kind) => ({
  value: kind,
  label: ITEM_KIND_LABELS[kind],
}));

/**
 * Items page (Admin / Custodian): searchable, filterable, server-paginated list of supplies and
 * equipment with add, edit, delete and a detail drawer for stock and units.
 * @returns {JSX.Element}
 */
export const ItemsPage = () => {
  const { message, modal } = App.useApp();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [query, setQuery] = useState({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    search: '',
    itemTypeId: null,
    categoryId: null,
    kind: null,
    lowStockOnly: false,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const [searchText, setSearchText] = useState('');

  const [lookups, setLookups] = useState({
    itemTypes: [],
    units: [],
    categories: [],
    locations: [],
  });

  const [editing, setEditing] = useState(null);
  const [detailItemId, setDetailItemId] = useState(null);
  const [detailVersion, setDetailVersion] = useState(0);

  useEffect(() => {
    let ignore = false;

    Promise.all([
      listItemTypes(),
      listMasterData('units'),
      listMasterData('categories'),
      listMasterData('locations'),
    ])
      .then(([itemTypes, units, categories, locations]) => {
        if (!ignore) {
          setLookups({ itemTypes, units, categories, locations });
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
  }, []);

  useEffect(() => {
    let ignore = false;

    listItems({ ...query, lowStockOnly: query.lowStockOnly || undefined })
      .then((result) => {
        if (!ignore) {
          setItems(result.data);
          setMeta(result.meta);
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
  }, [query, reloadKey]);

  /**
   * Reloads the current page of items.
   * @returns {void}
   */
  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  /**
   * Changes one filter and goes back to page 1.
   * @param {string} field - Query field.
   * @param {*} value - New value.
   * @returns {void}
   */
  const updateFilter = (field, value) => {
    setLoading(true);
    setQuery((current) => ({ ...current, [field]: value ?? null, page: 1 }));
  };

  /**
   * Handles table pagination and sorting changes (server-side).
   * @param {{ current: number, pageSize: number }} pagination - Pagination state.
   * @param {Object} _filters - Unused column filters.
   * @param {{ columnKey?: string, order?: 'ascend' | 'descend' }} sorter - Sort state.
   * @returns {void}
   */
  const handleTableChange = (pagination, _filters, sorter) => {
    setLoading(true);

    setQuery((current) => ({
      ...current,
      page: pagination.current,
      pageSize: pagination.pageSize,
      sortBy: sorter.order ? sorter.columnKey : 'name',
      sortOrder: sorter.order === 'descend' ? 'desc' : 'asc',
    }));
  };

  /**
   * Opens the edit dialog with the item's full detail (custom fields included).
   * @param {number} itemId - Item ID.
   * @returns {Promise<void>}
   */
  const openEdit = async (itemId) => {
    try {
      setEditing({ item: await getItem(itemId) });
    } catch (error) {
      message.error(error.message);
    }
  };

  /**
   * Saves the add/edit dialog.
   * @param {Object} payload - Item values.
   * @returns {Promise<void>}
   * @throws {import('../../api/httpClient.js').ApiError} When the server rejects the values.
   */
  const handleSubmit = async (payload) => {
    if (editing.item) {
      await updateItem(editing.item.id, payload);
      message.success('Item updated.');
      setDetailVersion((version) => version + 1);
    } else {
      const created = await createItem(payload);

      message.success(`${created.name} added.`);
      setDetailItemId(created.id);
    }

    setEditing(null);
    reload();
  };

  /**
   * Asks for confirmation, then deletes an item (allowed only with no stock or activity).
   * @param {import('../../utils/types.js').Item} item - Item.
   * @returns {void}
   */
  const confirmDelete = (item) => {
    modal.confirm({
      title: `Delete ${item.name}?`,
      content:
        'Its history is kept. Items with stock, open requests or borrowed units cannot be deleted.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteItem(item.id);
          message.success(`${item.name} deleted.`);
          reload();
        } catch (error) {
          message.error(error.message);
        }
      },
    });
  };

  /**
   * Returns the sort order shown on a column header.
   * @param {string} key - Column key.
   * @returns {'ascend' | 'descend' | null} Sort order.
   */
  const getSortOrder = (key) => {
    if (query.sortBy !== key) {
      return null;
    }

    return query.sortOrder === 'desc' ? 'descend' : 'ascend';
  };

  const columns = [
    {
      title: 'Item',
      key: 'name',
      sorter: true,
      sortOrder: getSortOrder('name'),
      render: (_value, item) => (
        <Flex vertical>
          <Typography.Link strong onClick={() => setDetailItemId(item.id)}>
            {item.name}
          </Typography.Link>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {item.code}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Type',
      key: 'itemTypeName',
      sorter: true,
      sortOrder: getSortOrder('itemTypeName'),
      width: 160,
      render: (_value, item) => (
        <Flex vertical>
          <span>{item.itemTypeName}</span>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {ITEM_KIND_LABELS[item.kind]}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'categoryName',
      key: 'categoryName',
      sorter: true,
      sortOrder: getSortOrder('categoryName'),
      width: 160,
      render: (value) => value || '—',
    },
    {
      title: 'Location',
      dataIndex: 'locationName',
      key: 'locationName',
      width: 150,
      render: (value) => value || '—',
    },
    {
      title: 'On hand',
      key: 'quantityOnHand',
      sorter: true,
      sortOrder: getSortOrder('quantityOnHand'),
      width: 150,
      render: (_value, item) => (
        <Flex vertical gap={4} align="flex-start">
          <span>
            {item.quantityOnHand} {item.unitName}
          </span>
          {item.quantityOnHand === 0 && <StatusTag status="outOfStock" />}
          {item.quantityOnHand > 0 && item.quantityOnHand <= item.reorderLevel && (
            <StatusTag status="lowStock" />
          )}
        </Flex>
      ),
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      sorter: true,
      sortOrder: getSortOrder('updatedAt'),
      width: 130,
      render: (value) => formatDate(value),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_value, item) => (
        <Flex>
          <Button type="link" size="small" onClick={() => setDetailItemId(item.id)}>
            View
          </Button>
          <Button type="link" size="small" onClick={() => openEdit(item.id)}>
            Edit
          </Button>
          <Button type="link" size="small" danger onClick={() => confirmDelete(item)}>
            Delete
          </Button>
        </Flex>
      ),
    },
  ];

  return (
    <>
      <PageHero
        eyebrow={
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Inventory / Items
          </Typography.Text>
        }
        title="Items"
        description="Supplies and equipment with their current stock. Open an item to record stock-in, adjust stock or manage individual units."
      >
        <Flex>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({ item: null })}>
            Add item
          </Button>
        </Flex>
      </PageHero>
      {errorMessage && (
        <Alert
          type="error"
          showIcon
          title="Couldn't load items."
          description={errorMessage}
          action={<Button onClick={reload}>Retry</Button>}
        />
      )}
      <Card>
        <Flex vertical gap={16}>
          <Flex gap={12} wrap align="center">
            <Input.Search
              allowClear
              placeholder="Search by name or code"
              aria-label="Search items"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onSearch={(value) => updateFilter('search', value.trim())}
              style={{ width: 260 }}
            />
            <Select
              allowClear
              aria-label="Filter by item type"
              placeholder="All types"
              value={query.itemTypeId}
              onChange={(value) => updateFilter('itemTypeId', value)}
              options={lookups.itemTypes.map((type) => ({ value: type.id, label: type.name }))}
              style={{ width: 180 }}
            />
            <Select
              allowClear
              aria-label="Filter by category"
              placeholder="All categories"
              value={query.categoryId}
              onChange={(value) => updateFilter('categoryId', value)}
              options={lookups.categories.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
              style={{ width: 180 }}
            />
            <Select
              allowClear
              aria-label="Filter by kind"
              placeholder="Supplies & equipment"
              value={query.kind}
              onChange={(value) => updateFilter('kind', value)}
              options={KIND_OPTIONS}
              style={{ width: 190 }}
            />
            <Checkbox
              checked={query.lowStockOnly}
              onChange={(event) => updateFilter('lowStockOnly', event.target.checked)}
            >
              Low stock only
            </Checkbox>
          </Flex>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={items}
            loading={loading}
            onChange={handleTableChange}
            pagination={{
              current: meta.page,
              pageSize: meta.pageSize,
              total: meta.total,
              showSizeChanger: true,
              showTotal: (total) => `${total} item(s)`,
            }}
            scroll={{ x: 1100 }}
            locale={{ emptyText: 'No items match these filters' }}
          />
        </Flex>
      </Card>
      {editing && (
        <ItemFormModal
          key={editing.item?.id || 'new'}
          item={editing.item}
          lookups={lookups}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      )}
      <ItemDetailDrawer
        itemId={detailItemId}
        refreshKey={detailVersion}
        onEdit={() => openEdit(detailItemId)}
        onChanged={reload}
        onClose={() => setDetailItemId(null)}
      />
    </>
  );
};

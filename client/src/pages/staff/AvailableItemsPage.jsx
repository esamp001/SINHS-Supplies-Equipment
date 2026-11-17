import { useEffect, useState } from 'react';
import { Alert, App, Badge, Button, Card, Flex, Input, Segmented, Table, Typography } from 'antd';
import { CheckOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { listItems } from '../../api/items.api.js';
import { PageHero } from '../../components/common/PageHero.jsx';
import { StatusTag } from '../../components/common/StatusTag.jsx';
import { PATHS } from '../../routes/navConfig.js';
import { DEFAULT_PAGE_SIZE, ITEM_KINDS, REQUEST_TYPES } from '../../utils/constants.js';
import { RequestFormModal } from './RequestFormModal.jsx';

const KIND_OPTIONS = [
  { value: ITEM_KINDS.SUPPLY, label: 'Supplies' },
  { value: ITEM_KINDS.EQUIPMENT, label: 'Equipment to borrow' },
];

/**
 * Available items (Staff): browse items in stock and pick them for a supply or borrow request.
 * Supplies and equipment go in separate requests, so switching the tab clears the selection.
 * @returns {JSX.Element}
 */
export const AvailableItemsPage = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [query, setQuery] = useState({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    kind: ITEM_KINDS.SUPPLY,
    search: '',
  });

  useEffect(() => {
    let ignore = false;

    listItems({ ...query, availableOnly: true })
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

  const isBorrow = query.kind === ITEM_KINDS.EQUIPMENT;

  /**
   * Reloads the current page.
   * @returns {void}
   */
  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  /**
   * Switches between supplies and equipment and clears the selection.
   * @param {string} kind - Item kind.
   * @returns {void}
   */
  const handleKindChange = (kind) => {
    setLoading(true);
    setSelectedItems([]);
    setQuery((current) => ({ ...current, kind, page: 1 }));
  };

  /**
   * Runs a search.
   * @param {string} value - Search text.
   * @returns {void}
   */
  const handleSearch = (value) => {
    setLoading(true);
    setQuery((current) => ({ ...current, search: value.trim(), page: 1 }));
  };

  /**
   * Handles table pagination changes (server-side).
   * @param {{ current: number, pageSize: number }} pagination - Pagination state.
   * @returns {void}
   */
  const handlePageChange = (pagination) => {
    setLoading(true);

    setQuery((current) => ({
      ...current,
      page: pagination.current,
      pageSize: pagination.pageSize,
    }));
  };

  /**
   * Adds an item to the selection, or removes it if already selected.
   * @param {import('../../utils/types.js').Item} item - Item.
   * @returns {void}
   */
  const toggleItem = (item) =>
    setSelectedItems((current) =>
      current.some((selected) => selected.id === item.id)
        ? current.filter((selected) => selected.id !== item.id)
        : [...current, item],
    );

  /**
   * Clears the selection and shows the new request after it was submitted.
   * @param {import('../../utils/types.js').InventoryRequest} request - Created request.
   * @returns {void}
   */
  const handleSubmitted = (request) => {
    message.success(`Request #${request.id} submitted. The custodian will review it.`);
    setIsFormOpen(false);
    setSelectedItems([]);
    navigate(PATHS.MY_REQUESTS);
  };

  const columns = [
    {
      title: 'Item',
      key: 'item',
      render: (_value, item) => (
        <Flex vertical>
          <Typography.Text strong>{item.name}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {item.itemTypeName}
            {item.categoryName ? ` · ${item.categoryName}` : ''}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Available',
      key: 'available',
      width: 170,
      render: (_value, item) => (
        <Flex vertical gap={4} align="flex-start">
          <span>
            {item.quantityOnHand} {item.unitName}
          </span>
          {item.quantityOnHand <= item.reorderLevel && <StatusTag status="lowStock" />}
        </Flex>
      ),
    },
    ...(isBorrow
      ? [
          {
            title: 'Borrow limit',
            dataIndex: 'maxBorrowDays',
            key: 'maxBorrowDays',
            width: 130,
            render: (value) => (value ? `${value} day(s)` : 'No limit'),
          },
        ]
      : []),
    {
      title: '',
      key: 'select',
      width: 130,
      render: (_value, item) => {
        const isSelected = selectedItems.some((selected) => selected.id === item.id);

        return (
          <Button
            type={isSelected ? 'primary' : 'default'}
            icon={isSelected ? <CheckOutlined /> : <PlusOutlined />}
            onClick={() => toggleItem(item)}
          >
            {isSelected ? 'Added' : 'Add'}
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <PageHero
        eyebrow={
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Menu / Available items
          </Typography.Text>
        }
        title="Available items"
        description="Pick the supplies you need or the equipment you want to borrow, then submit one request. The property custodian approves it before anything is released."
      >
        <Flex gap={12} align="center" wrap>
          <Badge count={selectedItems.length}>
            <Button
              type="primary"
              disabled={!selectedItems.length}
              onClick={() => setIsFormOpen(true)}
            >
              {isBorrow ? 'Borrow selected' : 'Request selected'}
            </Button>
          </Badge>
          {selectedItems.length > 0 && (
            <Button type="link" onClick={() => setSelectedItems([])}>
              Clear selection
            </Button>
          )}
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
          <Flex gap={12} wrap justify="space-between">
            <Segmented options={KIND_OPTIONS} value={query.kind} onChange={handleKindChange} />
            <Input.Search
              allowClear
              placeholder="Search by name or code"
              aria-label="Search items"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onSearch={handleSearch}
              style={{ maxWidth: 300 }}
            />
          </Flex>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={items}
            loading={loading}
            onChange={handlePageChange}
            pagination={{
              current: meta.page,
              pageSize: meta.pageSize,
              total: meta.total,
              hideOnSinglePage: true,
            }}
            scroll={{ x: 640 }}
            locale={{ emptyText: 'Nothing available right now' }}
          />
        </Flex>
      </Card>
      {isFormOpen && (
        <RequestFormModal
          requestType={isBorrow ? REQUEST_TYPES.BORROW : REQUEST_TYPES.SUPPLY}
          initialLines={selectedItems.map((item) => ({ item, quantity: 1 }))}
          onSubmitted={handleSubmitted}
          onCancel={() => setIsFormOpen(false)}
        />
      )}
    </>
  );
};

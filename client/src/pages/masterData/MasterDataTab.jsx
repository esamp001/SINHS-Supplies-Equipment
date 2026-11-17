import { useEffect, useState } from 'react';
import { Alert, App, Button, Flex, Input, Table, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import {
  createMasterData,
  deleteMasterData,
  listMasterData,
  updateMasterData,
} from '../../api/masterData.api.js';
import { StatusTag } from '../../components/common/StatusTag.jsx';
import { formatDate } from '../../utils/dateFormat.js';
import { MasterDataFormModal } from './MasterDataFormModal.jsx';

/**
 * One master data list (categories, units, locations or positions): search, add, edit,
 * activate/deactivate and delete unused records. Loads its own data.
 * @param {Object} props
 * @param {import('../../api/masterData.api.js').MasterDataResource} props.resource - List name.
 * @param {string} props.label - Singular label, e.g. "Category".
 * @param {string} props.usedByLabel - What uses the records, e.g. "Items".
 * @param {{ key: 'description' | 'abbreviation', label: string, maxLength: number } | null} props.extraField - Second column, if any.
 * @returns {JSX.Element}
 */
export const MasterDataTab = ({ resource, label, usedByLabel, extraField }) => {
  const { message, modal } = App.useApp();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    let ignore = false;

    /**
     * Loads every record of this master data list. Skips state updates after unmount.
     * @returns {Promise<void>}
     */
    const loadRecords = async () => {
      try {
        const data = await listMasterData(resource);

        if (!ignore) {
          setRecords(data);
          setErrorMessage('');
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadRecords();

    return () => {
      ignore = true;
    };
  }, [resource, reloadKey]);

  /**
   * Reloads the list after a change.
   * @returns {void}
   */
  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  const searchTerm = search.trim().toLowerCase();

  const visibleRecords = records.filter(
    (record) => !searchTerm || record.name.toLowerCase().includes(searchTerm),
  );

  /**
   * Opens the add dialog.
   * @returns {void}
   */
  const openAdd = () => setEditing({ record: null });

  /**
   * Opens the edit dialog for a record.
   * @param {import('../../utils/types.js').MasterDataRecord} record - Record to edit.
   * @returns {void}
   */
  const openEdit = (record) => setEditing({ record });

  /**
   * Closes the add/edit dialog.
   * @returns {void}
   */
  const closeForm = () => setEditing(null);

  /**
   * Saves the add/edit form, then reloads.
   * @param {Object} payload - Form values.
   * @returns {Promise<void>}
   * @throws {import('../../api/httpClient.js').ApiError} When the server rejects the values.
   */
  const handleSubmit = async (payload) => {
    if (editing.record) {
      await updateMasterData(resource, editing.record.id, {
        ...payload,
        isActive: editing.record.isActive,
      });

      message.success(`${label} updated.`);
    } else {
      await createMasterData(resource, payload);
      message.success(`${label} added.`);
    }

    closeForm();
    reload();
  };

  /**
   * Asks for confirmation, then activates or deactivates a record.
   * @param {import('../../utils/types.js').MasterDataRecord} record - Record.
   * @returns {void}
   */
  const confirmToggleActive = (record) => {
    modal.confirm({
      title: `${record.isActive ? 'Deactivate' : 'Activate'} "${record.name}"?`,
      content: record.isActive
        ? 'It will be hidden from dropdowns. Existing records keep it.'
        : 'It will show in dropdowns again.',
      okText: record.isActive ? 'Deactivate' : 'Activate',
      onOk: async () => {
        const payload = { name: record.name, isActive: !record.isActive };

        if (extraField) {
          payload[extraField.key] = record[extraField.key] || '';
        }

        try {
          await updateMasterData(resource, record.id, payload);
          message.success(`"${record.name}" ${record.isActive ? 'deactivated' : 'activated'}.`);
          reload();
        } catch (error) {
          message.error(error.message);
        }
      },
    });
  };

  /**
   * Asks for confirmation, then deletes an unused record.
   * @param {import('../../utils/types.js').MasterDataRecord} record - Record.
   * @returns {void}
   */
  const confirmDelete = (record) => {
    modal.confirm({
      title: `Delete "${record.name}"?`,
      content: 'It is not used anywhere, so it can be removed.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteMasterData(resource, record.id);
          message.success(`"${record.name}" deleted.`);
          reload();
        } catch (error) {
          message.error(error.message);
        }
      },
    });
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    ...(extraField
      ? [
          {
            title: extraField.label,
            dataIndex: extraField.key,
            key: extraField.key,
            render: (value) => value || '—',
          },
        ]
      : []),
    { title: usedByLabel, dataIndex: 'usageCount', key: 'usageCount', width: 110 },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      render: (isActive) => <StatusTag status={isActive ? 'active' : 'inactive'} />,
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 130,
      render: (value) => formatDate(value),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 250,
      render: (_value, record) => (
        <Flex>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            Edit
          </Button>
          <Button type="link" size="small" onClick={() => confirmToggleActive(record)}>
            {record.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          {record.usageCount === 0 && (
            <Button type="link" size="small" danger onClick={() => confirmDelete(record)}>
              Delete
            </Button>
          )}
        </Flex>
      ),
    },
  ];

  return (
    <Flex vertical gap={16}>
      {errorMessage && (
        <Alert
          type="error"
          showIcon
          title={`Couldn't load ${label.toLowerCase()} records.`}
          description={errorMessage}
          action={<Button onClick={reload}>Retry</Button>}
        />
      )}
      <Flex justify="space-between" gap={12} wrap>
        <Input.Search
          allowClear
          placeholder="Search by name"
          aria-label="Search by name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ maxWidth: 320 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          Add {label.toLowerCase()}
        </Button>
      </Flex>
      <Typography.Text type="secondary">
        Records in use can't be deleted. Deactivate them to hide them from dropdowns.
      </Typography.Text>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={visibleRecords}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        scroll={{ x: 760 }}
      />
      {editing && (
        <MasterDataFormModal
          key={editing.record?.id || 'new'}
          open
          label={label}
          extraField={extraField}
          record={editing.record}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      )}
    </Flex>
  );
};

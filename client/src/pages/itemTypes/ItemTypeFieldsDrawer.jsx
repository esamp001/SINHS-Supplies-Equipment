import { useState } from 'react';
import { App, Button, Drawer, Flex, Table, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import {
  createItemTypeField,
  deleteItemTypeField,
  updateItemTypeField,
} from '../../api/itemTypes.api.js';
import { StatusTag } from '../../components/common/StatusTag.jsx';
import { FIELD_APPLIES_TO_LABELS, FIELD_DATA_TYPE_LABELS } from '../../utils/constants.js';
import { ItemTypeFieldFormModal } from './ItemTypeFieldFormModal.jsx';

/**
 * Drawer listing an item type's custom fields with add, edit, activate/deactivate and delete.
 * Fields that already have values can only be deactivated (AGENTS.md §9).
 * @param {Object} props
 * @param {import('../../utils/types.js').ItemType | null} props.itemType - Type whose fields are shown; null hides the drawer.
 * @param {(itemType: import('../../utils/types.js').ItemType) => void} props.onChanged - Called with the updated type after a change.
 * @param {() => void} props.onClose - Closes the drawer.
 * @returns {JSX.Element}
 */
export const ItemTypeFieldsDrawer = ({ itemType, onChanged, onClose }) => {
  const { message, modal } = App.useApp();
  const [editing, setEditing] = useState(null);

  /**
   * Opens the add-field dialog.
   * @returns {void}
   */
  const openAdd = () => setEditing({ field: null });

  /**
   * Opens the edit-field dialog.
   * @param {import('../../utils/types.js').ItemTypeField} field - Field to edit.
   * @returns {void}
   */
  const openEdit = (field) => setEditing({ field });

  /**
   * Closes the field dialog.
   * @returns {void}
   */
  const closeForm = () => setEditing(null);

  /**
   * Saves the field dialog.
   * @param {Object} payload - Field values.
   * @returns {Promise<void>}
   * @throws {import('../../api/httpClient.js').ApiError} When the server rejects the values.
   */
  const handleSubmit = async (payload) => {
    const updated = editing.field
      ? await updateItemTypeField(itemType.id, editing.field.id, {
          ...payload,
          isActive: editing.field.isActive,
        })
      : await createItemTypeField(itemType.id, payload);

    message.success(editing.field ? 'Field updated.' : 'Field added.');
    closeForm();
    onChanged(updated);
  };

  /**
   * Activates or deactivates a field (inactive fields are hidden from forms but keep values).
   * @param {import('../../utils/types.js').ItemTypeField} field - Field.
   * @returns {Promise<void>}
   */
  const handleToggleActive = async (field) => {
    try {
      const updated = await updateItemTypeField(itemType.id, field.id, {
        label: field.label,
        dataType: field.dataType,
        options: field.options,
        isRequired: field.isRequired,
        isActive: !field.isActive,
      });

      message.success(`"${field.label}" ${field.isActive ? 'deactivated' : 'activated'}.`);
      onChanged(updated);
    } catch (error) {
      message.error(error.message);
    }
  };

  /**
   * Asks for confirmation, then deletes a field that has no values.
   * @param {import('../../utils/types.js').ItemTypeField} field - Field.
   * @returns {void}
   */
  const confirmDelete = (field) => {
    modal.confirm({
      title: `Delete field "${field.label}"?`,
      content: 'Only fields without stored values can be deleted. Otherwise, deactivate it.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const updated = await deleteItemTypeField(itemType.id, field.id);

          message.success(`"${field.label}" deleted.`);
          onChanged(updated);
        } catch (error) {
          message.error(error.message);
        }
      },
    });
  };

  const columns = [
    {
      title: 'Field',
      key: 'field',
      render: (_value, field) => (
        <Flex vertical>
          <Typography.Text strong>
            {field.label}
            {field.isRequired && <Typography.Text type="danger"> *</Typography.Text>}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {field.key}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Type',
      key: 'dataType',
      width: 200,
      render: (_value, field) => (
        <Flex vertical gap={4}>
          <span>{FIELD_DATA_TYPE_LABELS[field.dataType]}</span>
          {field.options && (
            <Flex wrap gap={4}>
              {field.options.map((option) => (
                <Tag key={option} style={{ marginInlineEnd: 0 }}>
                  {option}
                </Tag>
              ))}
            </Flex>
          )}
        </Flex>
      ),
    },
    {
      title: 'Applies to',
      dataIndex: 'appliesTo',
      key: 'appliesTo',
      width: 100,
      render: (value) => FIELD_APPLIES_TO_LABELS[value],
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive) => <StatusTag status={isActive ? 'active' : 'inactive'} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_value, field) => (
        <Flex>
          <Button type="link" size="small" onClick={() => openEdit(field)}>
            Edit
          </Button>
          <Button type="link" size="small" onClick={() => handleToggleActive(field)}>
            {field.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button type="link" size="small" danger onClick={() => confirmDelete(field)}>
            Delete
          </Button>
        </Flex>
      ),
    },
  ];

  return (
    <Drawer
      title={itemType ? `${itemType.name} — custom fields` : 'Custom fields'}
      open={Boolean(itemType)}
      onClose={onClose}
      size={860}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          Add field
        </Button>
      }
    >
      {itemType && (
        <Flex vertical gap={16}>
          <Typography.Text type="secondary">
            Fields describe items of this type (e.g. brand, size). Per-unit fields are filled in for
            each individual unit. Required fields are marked with *.
          </Typography.Text>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={itemType.fields}
            pagination={false}
            scroll={{ x: 720 }}
            locale={{ emptyText: 'No custom fields yet' }}
          />
          {editing && (
            <ItemTypeFieldFormModal
              key={editing.field?.id || 'new'}
              itemType={itemType}
              field={editing.field}
              onSubmit={handleSubmit}
              onCancel={closeForm}
            />
          )}
        </Flex>
      )}
    </Drawer>
  );
};

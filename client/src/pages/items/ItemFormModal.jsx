import { useState } from 'react';
import {
  Alert,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Typography,
} from 'antd';

import { AttributeFields } from '../../components/inventory/AttributeFields.jsx';
import { compactAttributes } from '../../utils/attributeFormat.js';
import { FIELD_APPLIES_TO, TRACKING_MODES } from '../../utils/constants.js';

/**
 * @typedef {Object} ItemFormData
 * @property {string} code - Item code.
 * @property {string} name - Item name.
 * @property {number | null} itemTypeId - Item type.
 * @property {number | null} unitId - Unit of measure.
 * @property {number | null} categoryId - Category (optional).
 * @property {number | null} locationId - Location (optional).
 * @property {number | null} reorderLevel - Low-stock threshold.
 * @property {number | null} openingQuantity - Starting stock (new quantity-tracked items only).
 * @property {Object<string, *>} attributes - Custom field values.
 */

/**
 * @typedef {Object} ItemLookups
 * @property {import('../../utils/types.js').ItemType[]} itemTypes - All item types.
 * @property {import('../../utils/types.js').MasterDataRecord[]} units - Units of measure.
 * @property {import('../../utils/types.js').MasterDataRecord[]} categories - Categories.
 * @property {import('../../utils/types.js').MasterDataRecord[]} locations - Locations.
 */

/**
 * Builds Select options from master data, keeping the current value even if it was deactivated.
 * @param {import('../../utils/types.js').MasterDataRecord[]} records - Records.
 * @param {number | null} currentId - Currently selected ID.
 * @returns {Array<{ value: number, label: string }>} Options.
 */
const toOptions = (records, currentId) =>
  records
    .filter((record) => record.isActive || record.id === currentId)
    .map((record) => ({ value: record.id, label: record.name }));

/**
 * Validates the item form for quick feedback (the server validates again, including the
 * custom fields against the item type).
 * @param {ItemFormData} data - Form values.
 * @returns {Object<string, string>} Error message per field; empty when valid.
 */
const validateForm = (data) => {
  const errors = {};

  if (!data.code.trim()) {
    errors.code = 'Enter a code';
  }

  if (!data.name.trim()) {
    errors.name = 'Enter a name';
  }

  if (!data.itemTypeId) {
    errors.itemTypeId = 'Choose an item type';
  }

  if (!data.unitId) {
    errors.unitId = 'Choose a unit of measure';
  }

  if (data.reorderLevel === null || data.reorderLevel < 0) {
    errors.reorderLevel = 'Enter 0 or more';
  }

  return errors;
};

/**
 * Add/edit dialog for an item, including the item type's custom fields.
 * Mount it with a `key` so it starts fresh for each item.
 * @param {Object} props
 * @param {(import('../../utils/types.js').Item & { fields?: Array<Object> }) | null} props.item - Item to edit, or null to add.
 * @param {ItemLookups} props.lookups - Dropdown data.
 * @param {(payload: Object) => Promise<void>} props.onSubmit - Saves; throws ApiError on failure.
 * @param {() => void} props.onCancel - Closes the dialog.
 * @returns {JSX.Element}
 */
export const ItemFormModal = ({ item, lookups, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    code: item?.code || '',
    name: item?.name || '',
    itemTypeId: item?.itemTypeId || null,
    unitId: item?.unitId || null,
    categoryId: item?.categoryId || null,
    locationId: item?.locationId || null,
    reorderLevel: item?.reorderLevel ?? 0,
    openingQuantity: null,
    attributes: item?.attributes || {},
  });

  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const itemType = lookups.itemTypes.find((type) => type.id === formData.itemTypeId) || null;
  const isQuantityTracked = itemType?.trackingMode === TRACKING_MODES.QUANTITY;

  const itemFields = (itemType?.fields || []).filter(
    (field) => field.appliesTo === FIELD_APPLIES_TO.ITEM,
  );

  const itemTypeOptions = lookups.itemTypes
    .filter((type) => type.isActive || type.id === item?.itemTypeId)
    .map((type) => ({ value: type.id, label: type.name }));

  /**
   * Updates one field and clears its error.
   * @param {keyof ItemFormData} field - Field name.
   * @param {*} value - New value.
   * @returns {void}
   */
  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  /**
   * onChange for text inputs (uses the input's `name` attribute).
   * @param {import('react').ChangeEvent<HTMLInputElement>} event - Change event.
   * @returns {void}
   */
  const handleInputChange = (event) => updateField(event.target.name, event.target.value);

  /**
   * onChange for the item type dropdown; clears values of the previous type's fields.
   * @param {number} itemTypeId - Selected type.
   * @returns {void}
   */
  const handleItemTypeChange = (itemTypeId) => {
    updateField('itemTypeId', itemTypeId);
    updateField('attributes', {});
  };

  /**
   * onChange for the unit of measure dropdown.
   * @param {number} unitId - Selected unit.
   * @returns {void}
   */
  const handleUnitChange = (unitId) => updateField('unitId', unitId);

  /**
   * onChange for the category dropdown.
   * @param {number | undefined} categoryId - Selected category, or undefined when cleared.
   * @returns {void}
   */
  const handleCategoryChange = (categoryId) => updateField('categoryId', categoryId ?? null);

  /**
   * onChange for the location dropdown.
   * @param {number | undefined} locationId - Selected location, or undefined when cleared.
   * @returns {void}
   */
  const handleLocationChange = (locationId) => updateField('locationId', locationId ?? null);

  /**
   * onChange for the reorder level input.
   * @param {number | null} value - Reorder level.
   * @returns {void}
   */
  const handleReorderLevelChange = (value) => updateField('reorderLevel', value ?? null);

  /**
   * onChange for the opening quantity input.
   * @param {number | null} value - Opening quantity.
   * @returns {void}
   */
  const handleOpeningQuantityChange = (value) => updateField('openingQuantity', value ?? null);

  /**
   * onChange for a custom field value.
   * @param {string} key - Field key.
   * @param {*} value - New value.
   * @returns {void}
   */
  const handleAttributeChange = (key, value) => {
    setFormData((current) => ({ ...current, attributes: { ...current.attributes, [key]: value } }));
    setErrors((current) => ({ ...current, [`attributes.${key}`]: undefined }));
  };

  /**
   * Validates and saves. Server field errors are shown under the matching inputs.
   * @returns {Promise<void>}
   */
  const handleSubmit = async () => {
    setErrorMessage('');
    const validationErrors = validateForm(formData);

    itemFields
      .filter((field) => field.isActive && field.isRequired)
      .forEach((field) => {
        const value = formData.attributes[field.key];

        if (value === undefined || value === null || value === '') {
          validationErrors[`attributes.${field.key}`] = `${field.label} is required`;
        }
      });

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length) {
      return;
    }

    const activeKeys = itemFields.filter((field) => field.isActive).map((field) => field.key);

    const payload = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      itemTypeId: formData.itemTypeId,
      unitId: formData.unitId,
      categoryId: formData.categoryId,
      locationId: formData.locationId,
      reorderLevel: formData.reorderLevel,
      attributes: compactAttributes(
        Object.fromEntries(activeKeys.map((key) => [key, formData.attributes[key]])),
      ),
    };

    if (!item && isQuantityTracked) {
      payload.openingQuantity = formData.openingQuantity ?? 0;
    }

    setSubmitting(true);

    try {
      await onSubmit(payload);
    } catch (error) {
      setErrors(error.errors || {});
      setErrorMessage(Object.keys(error.errors || {}).length ? '' : error.message);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Returns Form.Item props that show a field's error message.
   * @param {keyof ItemFormData} field - Field name.
   * @returns {{ validateStatus?: 'error', help?: string }} Form.Item props.
   */
  const getErrorProps = (field) =>
    errors[field] ? { validateStatus: 'error', help: errors[field] } : {};

  return (
    <Modal
      title={item ? `Edit ${item.name}` : 'Add item'}
      open
      width={720}
      okText={item ? 'Save changes' : 'Add item'}
      okButtonProps={{ loading: submitting }}
      onOk={handleSubmit}
      onCancel={onCancel}
      destroyOnHidden
    >
      {errorMessage && (
        <Alert type="error" showIcon title={errorMessage} style={{ marginBottom: 16 }} />
      )}
      <Form layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item label="Code" htmlFor="itemCode" {...getErrorProps('code')}>
              <Input
                id="itemCode"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                placeholder="e.g. SUP-0010"
                maxLength={50}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={16}>
            <Form.Item label="Name" htmlFor="itemName" {...getErrorProps('name')}>
              <Input
                id="itemName"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. Bond paper, A4"
                maxLength={150}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item label="Item type" htmlFor="itemTypeId" {...getErrorProps('itemTypeId')}>
              <Select
                id="itemTypeId"
                value={formData.itemTypeId}
                onChange={handleItemTypeChange}
                options={itemTypeOptions}
                showSearch={{ optionFilterProp: 'label' }}
                placeholder="Select"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Unit of measure" htmlFor="itemUnitId" {...getErrorProps('unitId')}>
              <Select
                id="itemUnitId"
                value={formData.unitId}
                onChange={handleUnitChange}
                options={toOptions(lookups.units, item?.unitId ?? null)}
                showSearch={{ optionFilterProp: 'label' }}
                placeholder="Select"
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item label="Category" htmlFor="itemCategoryId" {...getErrorProps('categoryId')}>
              <Select
                id="itemCategoryId"
                allowClear
                value={formData.categoryId}
                onChange={handleCategoryChange}
                options={toOptions(lookups.categories, item?.categoryId ?? null)}
                placeholder="Optional"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Location" htmlFor="itemLocationId" {...getErrorProps('locationId')}>
              <Select
                id="itemLocationId"
                allowClear
                value={formData.locationId}
                onChange={handleLocationChange}
                options={toOptions(lookups.locations, item?.locationId ?? null)}
                placeholder="Optional"
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Reorder level"
              htmlFor="itemReorderLevel"
              extra="Low stock when quantity on hand is at or below this."
              {...getErrorProps('reorderLevel')}
            >
              <InputNumber
                id="itemReorderLevel"
                min={0}
                precision={0}
                value={formData.reorderLevel}
                onChange={handleReorderLevelChange}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          {!item && isQuantityTracked && (
            <Col xs={24} sm={12}>
              <Form.Item
                label="Opening quantity"
                htmlFor="itemOpeningQuantity"
                extra="Recorded as a stock-in. Leave empty for 0."
                {...getErrorProps('openingQuantity')}
              >
                <InputNumber
                  id="itemOpeningQuantity"
                  min={0}
                  precision={0}
                  value={formData.openingQuantity}
                  onChange={handleOpeningQuantityChange}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          )}
        </Row>
        {itemType?.trackingMode === TRACKING_MODES.UNIT && !item && (
          <Typography.Paragraph type="secondary">
            This type is tracked by individual unit. After saving, open the item and register each
            unit (property number, serial number).
          </Typography.Paragraph>
        )}
        {itemFields.some((field) => field.isActive) && (
          <>
            <Divider titlePlacement="start" plain>
              {itemType.name} details
            </Divider>
            <AttributeFields
              fields={itemFields}
              values={formData.attributes}
              errors={errors}
              onChange={handleAttributeChange}
              idPrefix="itemAttribute"
            />
          </>
        )}
      </Form>
    </Modal>
  );
};

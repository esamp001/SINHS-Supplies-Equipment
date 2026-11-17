import { Col, DatePicker, Form, Input, InputNumber, Row, Select } from 'antd';
import dayjs from 'dayjs';

import { FIELD_DATA_TYPES } from '../../utils/constants.js';

const BOOLEAN_OPTIONS = [
  { value: true, label: 'Yes' },
  { value: false, label: 'No' },
];

/**
 * Inputs for an item type's custom fields (AGENTS.md §9). Renders one input per active field,
 * matching its data type. Values stay in the parent form's state.
 * @param {Object} props
 * @param {import('../../utils/types.js').ItemTypeField[]} props.fields - Fields to show (already filtered to item or unit level).
 * @param {Object<string, *>} props.values - Current values keyed by field key.
 * @param {Object<string, string>} props.errors - Errors keyed `attributes.<key>`.
 * @param {(key: string, value: *) => void} props.onChange - Called with the field key and new value.
 * @param {string} props.idPrefix - Prefix for input ids (keeps ids unique per form).
 * @returns {JSX.Element | null}
 */
export const AttributeFields = ({ fields, values, errors, onChange, idPrefix }) => {
  const activeFields = fields.filter((field) => field.isActive);

  if (!activeFields.length) {
    return null;
  }

  /**
   * Renders the input that matches a field's data type.
   * @param {import('../../utils/types.js').ItemTypeField} field - Field definition.
   * @param {string} id - Input id.
   * @returns {JSX.Element}
   */
  const renderInput = (field, id) => {
    const value = values[field.key];

    if (field.dataType === FIELD_DATA_TYPES.NUMBER) {
      return (
        <InputNumber
          id={id}
          value={value ?? null}
          onChange={(next) => onChange(field.key, next)}
          style={{ width: '100%' }}
        />
      );
    }

    if (field.dataType === FIELD_DATA_TYPES.DATE) {
      return (
        <DatePicker
          id={id}
          value={value ? dayjs(value) : null}
          onChange={(date) => onChange(field.key, date ? date.format('YYYY-MM-DD') : null)}
          style={{ width: '100%' }}
        />
      );
    }

    if (field.dataType === FIELD_DATA_TYPES.BOOLEAN) {
      return (
        <Select
          id={id}
          allowClear
          value={value ?? null}
          onChange={(next) => onChange(field.key, next ?? null)}
          options={BOOLEAN_OPTIONS}
          placeholder="Select"
        />
      );
    }

    if (field.dataType === FIELD_DATA_TYPES.SELECT) {
      return (
        <Select
          id={id}
          allowClear
          value={value ?? null}
          onChange={(next) => onChange(field.key, next ?? null)}
          options={(field.options || []).map((option) => ({ value: option, label: option }))}
          placeholder="Select"
        />
      );
    }

    return (
      <Input
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange(field.key, event.target.value)}
        maxLength={255}
      />
    );
  };

  return (
    <Row gutter={16}>
      {activeFields.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const error = errors[`attributes.${field.key}`];

        return (
          <Col key={field.id} xs={24} sm={12}>
            <Form.Item
              label={field.label}
              htmlFor={id}
              required={field.isRequired}
              validateStatus={error ? 'error' : undefined}
              help={error}
            >
              {renderInput(field, id)}
            </Form.Item>
          </Col>
        );
      })}
    </Row>
  );
};

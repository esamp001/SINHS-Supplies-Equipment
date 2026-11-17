import { useEffect, useState } from 'react';
import { Select } from 'antd';

import { listItems } from '../../api/items.api.js';

/** Wait this long after typing before searching (ms). */
const SEARCH_DELAY_MS = 300;

/**
 * Searchable item dropdown that loads matching items from the API as the user types.
 * @param {Object} props
 * @param {string} props.id - Input id (pairs with Form.Item htmlFor).
 * @param {number | null} props.value - Selected item ID.
 * @param {(itemId: number | null, item: import('../../utils/types.js').Item | null) => void} props.onChange - Called with the item ID and record.
 * @param {Object} [props.filters] - Extra list filters, e.g. `{ kind: 'supply' }`.
 * @param {import('../../utils/types.js').Item | null} [props.initialItem] - Item to show before any search.
 * @param {string} [props.placeholder='Search by name or code'] - Placeholder.
 * @param {'error' | ''} [props.status] - Shows the error outline.
 * @returns {JSX.Element}
 */
export const ItemSelect = ({
  id,
  value,
  onChange,
  filters,
  initialItem = null,
  placeholder = 'Search by name or code',
  status,
}) => {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState(initialItem ? [initialItem] : []);
  const [loading, setLoading] = useState(false);
  const filtersKey = JSON.stringify(filters || {});

  useEffect(() => {
    let ignore = false;

    /**
     * Searches items matching the typed text. Skips state updates after unmount.
     * @returns {Promise<void>}
     */
    const searchItems = async () => {
      setLoading(true);

      try {
        const result = await listItems({ ...JSON.parse(filtersKey), search, pageSize: 20 });

        if (!ignore) {
          setItems(result.data);
        }
      } catch {
        if (!ignore) {
          setItems([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    const timerId = setTimeout(searchItems, SEARCH_DELAY_MS);

    return () => {
      ignore = true;
      clearTimeout(timerId);
    };
  }, [search, filtersKey]);

  const options = items.map((item) => ({
    value: item.id,
    label: `${item.code} · ${item.name} (${item.quantityOnHand} ${item.unitName})`,
  }));

  /**
   * Passes the selected item (or null when cleared) to the parent.
   * @param {number | undefined} itemId - Selected ID.
   * @returns {void}
   */
  const handleChange = (itemId) =>
    onChange(itemId ?? null, items.find((item) => item.id === itemId) || null);

  return (
    <Select
      id={id}
      showSearch={{ filterOption: false, onSearch: setSearch }}
      allowClear
      value={value}
      onChange={handleChange}
      options={options}
      loading={loading}
      placeholder={placeholder}
      notFoundContent={loading ? 'Searching…' : 'No matching items'}
      status={status}
    />
  );
};

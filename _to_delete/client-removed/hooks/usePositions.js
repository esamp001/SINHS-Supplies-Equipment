import { useMemo } from 'react';

import { listPositions } from '../api/lookups.api.js';
import { useApiQuery } from './useApiQuery.js';

/**
 * Loads school positions and maps them to Select options.
 * @returns {{ positions: import('../utils/types.js').Position[], positionOptions: Array<{ value: number, label: string }>, loading: boolean }} Positions and options.
 */
export const usePositions = () => {
  const { data, loading } = useApiQuery(listPositions);

  const positions = useMemo(() => 
  data || [],
  [data]);

  const positionOptions = useMemo(
    () => positions.map((position) => ({ value: position.id, label: position.name })),
    [positions],
  );
  return { positions, positionOptions, loading };
};

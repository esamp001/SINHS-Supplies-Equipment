import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * @template T
 * @typedef {Object} ApiQueryState
 * @property {T | null} data - Loaded data.
 * @property {boolean} loading - True while loading (first load, deps change, or refetch).
 * @property {Error | null} error - Last error.
 * @property {() => Promise<void>} refetch - Reloads the data.
 */

/**
 * Runs an async API function on mount (and when deps change) and tracks its state.
 * Results that arrive after unmount or after the deps changed are ignored.
 * @template T
 * @param {() => Promise<T>} queryFn - Function that calls an `api/*` function.
 * @param {Array<*>} [deps=[]] - Serializable values that trigger a reload when changed.
 * @returns {ApiQueryState<T>} Query state.
 */
export const useApiQuery = (queryFn, deps = []) => {
  const depsKey = JSON.stringify(deps);
  const [result, setResult] = useState({ data: null, error: null, key: null });
  const [refreshing, setRefreshing] = useState(false);
  const queryFnRef = useRef(queryFn);

  useEffect(() => {
    queryFnRef.current = queryFn;
  });

  useEffect(() => {
    let ignore = false;
    queryFnRef.current().then(
      (data) => {
        if (!ignore) setResult({ data, error: null, key: depsKey });
      },
      (error) => {
        if (!ignore) setResult((current) => ({ data: current.data, error, key: depsKey }));
      },
    );
    return () => {
      ignore = true;
    };
  }, [depsKey]);

  /**
   * Reloads the data for the current deps.
   * @returns {Promise<void>}
   */
  const refetch = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await queryFnRef.current();
      setResult((current) => ({ data, error: null, key: current.key }));
    } catch (error) {
      setResult((current) => ({ ...current, error }));
    } finally {
      setRefreshing(false);
    }
  }, []);

  return {
    data: result.data,
    error: result.error,
    loading: result.key !== depsKey || refreshing,
    refetch,
  };
};

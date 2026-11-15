import { useEffect } from 'react';

import { getUnreadCount } from '../api/notifications.api.js';
import { NOTIFICATION_POLL_MS } from '../utils/constants.js';
import { useApiQuery } from './useApiQuery.js';

/**
 * Polls the unread in-app notification count (AGENTS.md §9).
 * @returns {number} Unread count (0 while loading or on error).
 */
export const useUnreadCount = () => {
  const { data, refetch } = useApiQuery(getUnreadCount);

  useEffect(() => {
    const timerId = setInterval(refetch, NOTIFICATION_POLL_MS);
    return () => clearInterval(timerId);
  }, [refetch]);

  return data || 0;
};

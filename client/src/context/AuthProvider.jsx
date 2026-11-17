import { useCallback, useEffect, useMemo, useState } from 'react';

import { getCurrentUser, login, logout } from '../api/auth.api.js';
import { setUnauthorizedHandler } from '../api/httpClient.js';
import { AuthContext } from './authContext.js';

/**
 * Provides the signed-in user. The session lives in the server's httpOnly cookie; this provider
 * only keeps the user profile in memory and restores it from GET /auth/me on page load.
 * @param {Object} props
 * @param {import('react').ReactNode} props.children - App content.
 * @returns {JSX.Element}
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let ignore = false;

    setUnauthorizedHandler(() => setUser(null));

    /**
     * Restores the signed-in user from the auth cookie (GET /auth/me). Skips state updates after unmount.
     * @returns {Promise<void>}
     */
    const restoreSession = async () => {
      try {
        const currentUser = await getCurrentUser();

        if (!ignore) {
          setUser(currentUser);
        }
      } catch {
        if (!ignore) {
          setUser(null);
        }
      } finally {
        if (!ignore) {
          setInitializing(false);
        }
      }
    };

    restoreSession();

    return () => {
      ignore = true;
    };
  }, []);

  /**
   * Signs in and stores the returned profile.
   * @param {{ username: string, password: string, rememberMe: boolean }} credentials - Login form values.
   * @returns {Promise<import('../utils/types.js').AuthUser>} Signed-in user.
   * @throws {import('../api/httpClient.js').ApiError} When the server rejects the sign-in.
   */
  const signIn = useCallback(async (credentials) => {
    const signedInUser = await login(credentials);

    setUser(signedInUser);

    return signedInUser;
  }, []);

  /**
   * Signs out and clears the profile (even if the request fails).
   * @returns {Promise<void>}
   */
  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      setUser(null);
    }
  }, []);

  /**
   * Replaces the stored profile, e.g. after a password change.
   * @param {import('../utils/types.js').AuthUser} updatedUser - Updated user from the API.
   * @returns {void}
   */
  const updateUser = useCallback((updatedUser) => setUser(updatedUser), []);

  const value = useMemo(
    () => ({ user, initializing, signIn, signOut, updateUser }),
    [user, initializing, signIn, signOut, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

import { useCallback, useMemo, useState } from 'react';

import { DEMO_PASSWORD, getPositionName, STATIC_USERS } from '../data/staticData.js';
import { USER_STATUS } from '../utils/constants.js';
import { AuthContext } from './authContext.js';

/** Sign-in messages for accounts that cannot sign in yet. */
const STATUS_MESSAGES = {
  [USER_STATUS.PENDING]: 'Your account is pending approval by an administrator.',
  [USER_STATUS.REJECTED]: 'Your registration was not approved. Please contact the administrator.',
  [USER_STATUS.DEACTIVATED]: 'Your account is deactivated. Please contact the administrator.',
};

/**
 * Provides the signed-in user. Static prototype: checks credentials against the demo accounts
 * and keeps the user in memory only (reloading the page signs out).
 * @param {Object} props
 * @param {import('react').ReactNode} props.children - App content.
 * @returns {JSX.Element}
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  /**
   * Signs in with a demo account.
   * @param {{ username: string, password: string }} credentials - Login credentials.
   * @returns {import('../utils/types.js').AuthUser} Signed-in user.
   * @throws {Error} When the credentials are wrong or the account cannot sign in.
   */
  const signIn = useCallback(({ username, password }) => {
    const account = STATIC_USERS.find((row) => row.username === username.trim());
    if (!account || password !== DEMO_PASSWORD) throw new Error('Invalid username or password');
    if (STATUS_MESSAGES[account.status]) throw new Error(STATUS_MESSAGES[account.status]);

    const signedInUser = { ...account, positionName: getPositionName(account.positionId) };
    setUser(signedInUser);
    return signedInUser;
  }, []);

  /**
   * Signs out.
   * @returns {void}
   */
  const signOut = useCallback(() => setUser(null), []);

  const value = useMemo(() => ({ user, signIn, signOut }), [user, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

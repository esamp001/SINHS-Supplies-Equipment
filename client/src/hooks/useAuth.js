import { useContext } from 'react';

import { AuthContext } from '../context/authContext.js';

/**
 * Returns the auth context (user, initializing, signIn, signOut, updateUser).
 * @returns {import('../context/authContext.js').AuthContextValue} Auth context value.
 * @throws {Error} When used outside AuthProvider.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
};

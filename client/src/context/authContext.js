import { createContext } from 'react';

/**
 * @typedef {Object} AuthContextValue
 * @property {import('../utils/types.js').AuthUser | null} user - Signed-in user, or null.
 * @property {(credentials: { username: string, password: string }) => import('../utils/types.js').AuthUser} signIn - Signs in (throws on failure).
 * @property {() => void} signOut - Signs out.
 */

/**
 * Auth context. Use the `useAuth` hook instead of reading it directly.
 * @type {import('react').Context<AuthContextValue | null>}
 */
export const AuthContext = createContext(null);

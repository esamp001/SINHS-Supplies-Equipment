import { createContext } from 'react';

/**
 * @typedef {Object} AuthContextValue
 * @property {import('../utils/types.js').AuthUser | null} user - Signed-in user, or null.
 * @property {boolean} initializing - True while the session is restored on page load.
 * @property {(credentials: { username: string, password: string, rememberMe: boolean }) => Promise<import('../utils/types.js').AuthUser>} signIn - Signs in (throws ApiError on failure).
 * @property {() => Promise<void>} signOut - Signs out.
 * @property {(user: import('../utils/types.js').AuthUser) => void} updateUser - Replaces the stored profile.
 */

/**
 * Auth context. Use the `useAuth` hook instead of reading it directly.
 * @type {import('react').Context<AuthContextValue | null>}
 */
export const AuthContext = createContext(null);

import { MIN_PASSWORD_LENGTH, ROLES, USER_STATUS } from '../utils/constants.js';
import { formatDate, nowIso } from '../utils/dateFormat.js';
import {
  MOCK_PANEL_ROWS,
  MOCK_POSITIONS,
  MOCK_STATS,
  MOCK_UNREAD_COUNTS,
  mockUsers,
} from './mockDb.js';

/**
 * Mock REST API that mimics the Express server so the UI can be built before the backend.
 * It returns the same `{ success, data, message, errors }` envelope as the real API (AGENTS.md §5).
 *
 * The signed-in user ID is kept in sessionStorage ONLY to simulate the server's httpOnly cookie
 * across page reloads. The real app never stores auth data in browser storage.
 */

const SESSION_KEY = 'sinhs_mock_session';

/**
 * @typedef {Object} MockRequest
 * @property {string} method - HTTP method.
 * @property {string} path - Path without the API base, e.g. "/auth/login".
 * @property {Object<string, string>} query - Query parameters.
 * @property {Object} [body] - Parsed JSON body.
 */

/**
 * @typedef {Object} MockResponse
 * @property {number} status - HTTP status code.
 * @property {import('../utils/types.js').ApiResponse} json - Response body.
 */

/**
 * Builds a success response.
 * @param {*} data - Response payload.
 * @param {number} [status=200] - HTTP status.
 * @returns {MockResponse} Mock response.
 */
const ok = (data, status = 200) => ({ status, json: { success: true, data } });

/**
 * Builds an error response.
 * @param {number} status - HTTP status.
 * @param {string} message - Error message.
 * @param {Object<string, string>} [errors] - Field errors.
 * @returns {MockResponse} Mock response.
 */
const fail = (status, message, errors) => ({ status, json: { success: false, message, errors } });

/**
 * Reads the simulated session user ID.
 * @returns {number | null} Signed-in user ID.
 */
const getSessionUserId = () => {
  const value = sessionStorage.getItem(SESSION_KEY);
  return value ? Number(value) : null;
};

/**
 * Sets or clears the simulated session.
 * @param {number | null} userId - User ID, or null to clear.
 * @returns {void}
 */
const setSessionUserId = (userId) => {
  if (userId === null) {
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  sessionStorage.setItem(SESSION_KEY, String(userId));
};

/**
 * Finds a position name by ID.
 * @param {number} positionId - Position ID.
 * @returns {string} Position name.
 */
const getPositionName = (positionId) =>
  MOCK_POSITIONS.find((position) => position.id === positionId)?.name || '—';

/**
 * Removes private fields and adds the position name.
 * @param {Object} user - Mock user row.
 * @returns {import('../utils/types.js').User} Public user.
 */
const toPublicUser = (user) => {
  const { password: _password, ...rest } = user;
  return { ...rest, positionName: getPositionName(user.positionId) };
};

/**
 * Returns the signed-in, active user or null.
 * @returns {Object | null} Mock user row.
 */
const getCurrentUser = () => {
  const userId = getSessionUserId();
  const user = mockUsers.find((row) => row.id === userId);
  return user && user.status === USER_STATUS.ACTIVE ? user : null;
};

/**
 * Generates a readable temporary password.
 * @returns {string} Temporary password.
 */
const generateTemporaryPassword = () => `Temp-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Handles POST /auth/login.
 * @param {MockRequest} req - Mock request.
 * @returns {MockResponse} Mock response.
 */
const login = (req) => {
  const { username = '', password = '' } = req.body || {};
  const errors = {};
  if (!username.trim()) errors.username = 'Username is required';
  if (!password) errors.password = 'Password is required';
  if (Object.keys(errors).length) return fail(400, 'Validation failed', errors);

  const user = mockUsers.find((row) => row.username === username.trim());
  if (!user || user.password !== password) return fail(401, 'Invalid username or password');

  const statusMessages = {
    [USER_STATUS.PENDING]: 'Your account is pending approval by an administrator.',
    [USER_STATUS.REJECTED]: 'Your registration was not approved. Please contact the administrator.',
    [USER_STATUS.DEACTIVATED]: 'Your account is deactivated. Please contact the administrator.',
  };
  if (statusMessages[user.status]) return fail(403, statusMessages[user.status]);

  user.lastLoginAt = nowIso();
  setSessionUserId(user.id);
  return ok(toPublicUser(user));
};

/**
 * Handles POST /auth/logout.
 * @returns {MockResponse} Mock response.
 */
const logout = () => {
  setSessionUserId(null);
  return ok(null);
};

/**
 * Handles GET /auth/me.
 * @returns {MockResponse} Mock response.
 */
const getMe = () => {
  const user = getCurrentUser();
  return user ? ok(toPublicUser(user)) : fail(401, 'Not authenticated');
};

/**
 * Handles POST /auth/register.
 * @param {MockRequest} req - Mock request.
 * @returns {MockResponse} Mock response.
 */
const register = (req) => {
  const { fullName = '', username = '', email = '', positionId, password = '' } = req.body || {};
  const errors = {};
  if (!fullName.trim()) errors.fullName = 'Full name is required';
  if (!username.trim()) errors.username = 'Username is required';
  if (!email.trim()) errors.email = 'Email is required';
  if (!positionId) errors.positionId = 'Position is required';
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (mockUsers.some((row) => row.username === username.trim())) {
    errors.username = 'Username is already taken';
  }
  if (mockUsers.some((row) => row.email === email.trim())) {
    errors.email = 'Email is already registered';
  }
  if (Object.keys(errors).length) return fail(400, 'Validation failed', errors);

  const user = {
    id: Math.max(...mockUsers.map((row) => row.id)) + 1,
    username: username.trim(),
    fullName: fullName.trim(),
    email: email.trim(),
    roleCode: null,
    positionId: Number(positionId),
    status: USER_STATUS.PENDING,
    password,
    mustChangePassword: false,
    createdAt: nowIso(),
    lastLoginAt: null,
  };
  mockUsers.push(user);
  return ok(toPublicUser(user), 201);
};

/**
 * Handles GET /positions.
 * @returns {MockResponse} Mock response.
 */
const listPositions = () => ok(MOCK_POSITIONS);

/**
 * Handles GET /dashboard/summary (role-based).
 * @returns {MockResponse} Mock response.
 */
const getDashboardSummary = () => {
  const user = getCurrentUser();
  if (!user) return fail(401, 'Not authenticated');

  const pendingAccounts = mockUsers.filter((row) => row.status === USER_STATUS.PENDING);
  const pendingAccountRows = pendingAccounts.slice(0, 3).map((row) => ({
    id: row.id,
    main: row.fullName,
    sub: `${getPositionName(row.positionId)} · registered ${formatDate(row.createdAt)}`,
    status: 'pending',
  }));

  return ok({
    stats: { ...MOCK_STATS, pendingAccounts: pendingAccounts.length },
    panels: { ...MOCK_PANEL_ROWS, pendingAccounts: pendingAccountRows },
  });
};

/**
 * Handles GET /notifications/unread-count.
 * @returns {MockResponse} Mock response.
 */
const getUnreadCount = () => {
  const user = getCurrentUser();
  if (!user) return fail(401, 'Not authenticated');
  return ok({ count: MOCK_UNREAD_COUNTS[user.roleCode] || 0 });
};

/**
 * Ensures the current user is an admin.
 * @returns {MockResponse | null} Error response, or null when allowed.
 */
const requireAdmin = () => {
  const user = getCurrentUser();
  if (!user) return fail(401, 'Not authenticated');
  if (user.roleCode !== ROLES.ADMIN) return fail(403, 'You are not allowed to do this');
  return null;
};

/**
 * Finds a user by ID from a route parameter.
 * @param {string} id - User ID string.
 * @returns {Object | undefined} Mock user row.
 */
const findUser = (id) => mockUsers.find((row) => row.id === Number(id));

/**
 * Handles GET /users?status=... (default: active and deactivated users only)
 * @param {MockRequest} req - Mock request.
 * @returns {MockResponse} Mock response.
 */
const listUsers = (req) => {
  const denied = requireAdmin();
  if (denied) return denied;
  const { status, search = '' } = req.query;
  const term = search.toLowerCase();
  const rows = mockUsers
    .filter((row) =>
      status
        ? row.status === status
        : [USER_STATUS.ACTIVE, USER_STATUS.DEACTIVATED].includes(row.status),
    )
    .filter(
      (row) =>
        !term ||
        row.fullName.toLowerCase().includes(term) ||
        row.username.toLowerCase().includes(term),
    )
    .map(toPublicUser);
  return ok(rows);
};

/**
 * Handles POST /users/:id/approve.
 * @param {MockRequest} req - Mock request.
 * @param {string} id - User ID.
 * @returns {MockResponse} Mock response.
 */
const approveUser = (req, id) => {
  const denied = requireAdmin();
  if (denied) return denied;
  const user = findUser(id);
  if (!user) return fail(404, 'User not found');
  if (user.status !== USER_STATUS.PENDING)
    return fail(409, 'Only pending accounts can be approved');
  const { roleCode, positionId } = req.body || {};
  if (!Object.values(ROLES).includes(roleCode)) {
    return fail(400, 'Validation failed', { roleCode: 'Choose a valid role' });
  }
  user.roleCode = roleCode;
  user.positionId = Number(positionId) || user.positionId;
  user.status = USER_STATUS.ACTIVE;
  return ok(toPublicUser(user));
};

/**
 * Handles POST /users/:id/reject.
 * @param {MockRequest} req - Mock request.
 * @param {string} id - User ID.
 * @returns {MockResponse} Mock response.
 */
const rejectUser = (req, id) => {
  const denied = requireAdmin();
  if (denied) return denied;
  const user = findUser(id);
  if (!user) return fail(404, 'User not found');
  if (user.status !== USER_STATUS.PENDING)
    return fail(409, 'Only pending accounts can be rejected');
  const reason = (req.body?.reason || '').trim();
  if (!reason) return fail(400, 'Validation failed', { reason: 'A reason is required' });
  user.status = USER_STATUS.REJECTED;
  user.rejectionReason = reason;
  return ok(toPublicUser(user));
};

/**
 * Handles PUT /users/:id/role.
 * @param {MockRequest} req - Mock request.
 * @param {string} id - User ID.
 * @returns {MockResponse} Mock response.
 */
const changeUserRole = (req, id) => {
  const denied = requireAdmin();
  if (denied) return denied;
  const user = findUser(id);
  if (!user) return fail(404, 'User not found');
  const { roleCode } = req.body || {};
  if (!Object.values(ROLES).includes(roleCode)) {
    return fail(400, 'Validation failed', { roleCode: 'Choose a valid role' });
  }
  if (user.id === getSessionUserId()) return fail(409, 'You cannot change your own role');
  user.roleCode = roleCode;
  return ok(toPublicUser(user));
};

/**
 * Handles POST /users/:id/reset-password.
 * @param {MockRequest} _req - Mock request (unused).
 * @param {string} id - User ID.
 * @returns {MockResponse} Mock response.
 */
const resetUserPassword = (_req, id) => {
  const denied = requireAdmin();
  if (denied) return denied;
  const user = findUser(id);
  if (!user) return fail(404, 'User not found');
  const temporaryPassword = generateTemporaryPassword();
  user.password = temporaryPassword;
  user.mustChangePassword = true;
  return ok({ temporaryPassword });
};

/**
 * Handles PUT /users/:id/status (activate/deactivate).
 * @param {MockRequest} req - Mock request.
 * @param {string} id - User ID.
 * @returns {MockResponse} Mock response.
 */
const changeUserStatus = (req, id) => {
  const denied = requireAdmin();
  if (denied) return denied;
  const user = findUser(id);
  if (!user) return fail(404, 'User not found');
  const { status } = req.body || {};
  if (![USER_STATUS.ACTIVE, USER_STATUS.DEACTIVATED].includes(status)) {
    return fail(400, 'Validation failed', { status: 'Invalid status' });
  }
  if (user.id === getSessionUserId()) return fail(409, 'You cannot deactivate your own account');
  user.status = status;
  return ok(toPublicUser(user));
};

/**
 * Route table: [method, path pattern, handler]. `:id` segments are passed to the handler.
 * @type {Array<[string, RegExp, (req: MockRequest, id?: string) => MockResponse]>}
 */
const ROUTES = [
  ['POST', /^\/auth\/login$/, login],
  ['POST', /^\/auth\/logout$/, logout],
  ['GET', /^\/auth\/me$/, getMe],
  ['POST', /^\/auth\/register$/, register],
  ['GET', /^\/positions$/, listPositions],
  ['GET', /^\/dashboard\/summary$/, getDashboardSummary],
  ['GET', /^\/notifications\/unread-count$/, getUnreadCount],
  ['GET', /^\/users$/, listUsers],
  ['POST', /^\/users\/(\d+)\/approve$/, approveUser],
  ['POST', /^\/users\/(\d+)\/reject$/, rejectUser],
  ['PUT', /^\/users\/(\d+)\/role$/, changeUserRole],
  ['POST', /^\/users\/(\d+)\/reset-password$/, resetUserPassword],
  ['PUT', /^\/users\/(\d+)\/status$/, changeUserStatus],
];

/**
 * Simulated network latency in milliseconds.
 * @returns {Promise<void>} Resolves after a short delay.
 */
const simulateLatency = () => new Promise((resolve) => setTimeout(resolve, 250));

/**
 * Dispatches a request to the matching mock route.
 * @param {MockRequest} req - Mock request.
 * @returns {Promise<MockResponse>} Mock response.
 */
export const handleMockRequest = async (req) => {
  await simulateLatency();
  const route = ROUTES.find(([method, pattern]) => method === req.method && pattern.test(req.path));
  if (!route) return fail(404, `Mock route not found: ${req.method} ${req.path}`);
  const [, pattern, handler] = route;
  const [, id] = req.path.match(pattern);
  return handler(req, id);
};

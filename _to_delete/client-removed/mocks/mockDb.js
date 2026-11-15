/**
 * In-memory mock database used while the Express API is not built yet.
 * Shapes follow the API contract (camelCase JSON) described in AGENTS.md.
 * Mock-only: passwords are plain text here; the real server hashes them with bcrypt.
 */

/** @type {import('../utils/types.js').Position[]} */
export const MOCK_POSITIONS = [
  { id: 1, name: 'Principal' },
  { id: 2, name: 'Assistant Principal' },
  { id: 3, name: 'Property Custodian' },
  { id: 4, name: 'Supply Officer' },
  { id: 5, name: 'Department Head' },
  { id: 6, name: 'Master Teacher' },
  { id: 7, name: 'Teacher I' },
  { id: 8, name: 'Teacher II' },
  { id: 9, name: 'Teacher III' },
  { id: 10, name: 'ICT Coordinator' },
  { id: 11, name: 'Librarian' },
];

/** Password shared by all demo accounts. */
export const MOCK_DEMO_PASSWORD = 'password123';

/**
 * Mutable mock user table.
 * @type {Array<import('../utils/types.js').User & { password: string, mustChangePassword: boolean, rejectionReason?: string }>}
 */
export const mockUsers = [
  {
    id: 1,
    username: 'admin',
    fullName: 'Maria L. Santos',
    email: 'maria.santos@sinhs.edu.ph',
    roleCode: 'admin',
    positionId: 1,
    status: 'active',
    password: MOCK_DEMO_PASSWORD,
    mustChangePassword: false,
    createdAt: '2026-06-01T01:00:00.000Z',
    lastLoginAt: '2026-11-14T00:30:00.000Z',
  },
  {
    id: 2,
    username: 'custodian',
    fullName: 'Jose R. Dela Cruz',
    email: 'jose.delacruz@sinhs.edu.ph',
    roleCode: 'custodian',
    positionId: 3,
    status: 'active',
    password: MOCK_DEMO_PASSWORD,
    mustChangePassword: false,
    createdAt: '2026-06-02T01:00:00.000Z',
    lastLoginAt: '2026-11-14T02:10:00.000Z',
  },
  {
    id: 3,
    username: 'staff',
    fullName: 'Ana P. Reyes',
    email: 'ana.reyes@sinhs.edu.ph',
    roleCode: 'staff',
    positionId: 9,
    status: 'active',
    password: MOCK_DEMO_PASSWORD,
    mustChangePassword: false,
    createdAt: '2026-06-05T01:00:00.000Z',
    lastLoginAt: '2026-11-13T05:45:00.000Z',
  },
  {
    id: 4,
    username: 'mark.villanueva',
    fullName: 'Mark T. Villanueva',
    email: 'mark.villanueva@sinhs.edu.ph',
    roleCode: 'staff',
    positionId: 7,
    status: 'deactivated',
    password: MOCK_DEMO_PASSWORD,
    mustChangePassword: false,
    createdAt: '2026-07-10T01:00:00.000Z',
    lastLoginAt: '2026-09-30T03:00:00.000Z',
  },
  {
    id: 5,
    username: 'liza.bautista',
    fullName: 'Liza M. Bautista',
    email: 'liza.bautista@sinhs.edu.ph',
    roleCode: null,
    positionId: 7,
    status: 'pending',
    password: MOCK_DEMO_PASSWORD,
    mustChangePassword: false,
    createdAt: '2026-11-12T02:00:00.000Z',
    lastLoginAt: null,
  },
  {
    id: 6,
    username: 'ramon.garcia',
    fullName: 'Ramon D. Garcia',
    email: 'ramon.garcia@sinhs.edu.ph',
    roleCode: null,
    positionId: 4,
    status: 'pending',
    password: MOCK_DEMO_PASSWORD,
    mustChangePassword: false,
    createdAt: '2026-11-13T06:20:00.000Z',
    lastLoginAt: null,
  },
  {
    id: 7,
    username: 'grace.mendoza',
    fullName: 'Grace A. Mendoza',
    email: 'grace.mendoza@sinhs.edu.ph',
    roleCode: null,
    positionId: 9,
    status: 'pending',
    password: MOCK_DEMO_PASSWORD,
    mustChangePassword: false,
    createdAt: '2026-11-14T08:05:00.000Z',
    lastLoginAt: null,
  },
];

/** Static dashboard panel rows (inventory modules are not built yet). */
export const MOCK_PANEL_ROWS = {
  lowStock: [
    { id: 1, main: 'Bond paper, A4', sub: '4 reams left · reorder at 10', status: 'lowStock' },
    {
      id: 2,
      main: 'Whiteboard marker, black',
      sub: '6 pcs left · reorder at 20',
      status: 'lowStock',
    },
    {
      id: 3,
      main: 'Printer ink, Epson 003 black',
      sub: '1 bottle left · reorder at 3',
      status: 'lowStock',
    },
  ],
  requestsToReview: [
    { id: 11, main: 'Ana P. Reyes', sub: 'Supply · Bond paper, A4 · 5 reams', status: 'pending' },
    { id: 12, main: 'Carlo B. Ramos', sub: 'Borrow · Projector · due Nov 18', status: 'pending' },
    {
      id: 13,
      main: 'Ana P. Reyes',
      sub: 'Supply · Chalk, white · ready to release',
      status: 'approved',
    },
  ],
  overdueEquipment: [
    {
      id: 21,
      main: 'Carlo B. Ramos',
      sub: 'Laptop · PROP-2024-0012 · due Nov 10',
      status: 'overdue',
    },
    {
      id: 22,
      main: 'Ella F. Cruz',
      sub: 'Projector · PROP-2023-0004 · due Nov 12',
      status: 'overdue',
    },
  ],
  myRequests: [
    { id: 31, main: 'Bond paper, A4 · 5 reams', sub: 'Supply request · Nov 14', status: 'pending' },
    { id: 32, main: 'Projector', sub: 'Borrow request · needed Nov 17', status: 'approved' },
    {
      id: 33,
      main: 'Whiteboard marker · 10 pcs',
      sub: 'Supply request · Nov 10',
      status: 'released',
    },
    {
      id: 34,
      main: 'Laminating film',
      sub: 'Reason: out of stock until December',
      status: 'rejected',
    },
  ],
  myBorrowed: [
    { id: 41, main: 'Laptop · PROP-2024-0020', sub: 'Due Nov 16', status: 'dueSoon' },
    { id: 42, main: 'Extension cord · PROP-2022-0101', sub: 'Due Nov 12', status: 'overdue' },
  ],
};

/** Static dashboard stat values for modules not built yet. */
export const MOCK_STATS = {
  pendingRequests: 5,
  lowStockItems: 3,
  overdueEquipment: 2,
  requestsToReview: 5,
  readyToRelease: 2,
  myPendingRequests: 1,
  myApprovedRequests: 1,
  myBorrowedItems: 2,
  myDueSoon: 1,
};

/** Unread notification counts per role (mock). */
export const MOCK_UNREAD_COUNTS = {
  admin: 3,
  custodian: 5,
  staff: 2,
};

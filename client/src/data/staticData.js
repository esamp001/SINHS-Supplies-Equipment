/**
 * Static prototype data (no backend yet). Shared by more than one page:
 * demo accounts for sign-in and the Users page, and school positions for dropdowns.
 * Page-specific data (dashboard numbers, panel rows) lives inline in each page's config.
 */

/** Password shared by all demo accounts. */
export const DEMO_PASSWORD = 'password123';

/**
 * School positions for dropdowns.
 * @type {import('../utils/types.js').Position[]}
 */
export const POSITIONS = [
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

/** Position options for Ant Design Select components. */
export const POSITION_OPTIONS = POSITIONS.map((position) => ({
  value: position.id,
  label: position.name,
}));

/**
 * Returns a position name by ID.
 * @param {number} positionId - Position ID.
 * @returns {string} Position name, or an em dash when unknown.
 */
export const getPositionName = (positionId) =>
  POSITIONS.find((position) => position.id === positionId)?.name || '—';

/**
 * Demo accounts. Prototype only: the real server stores bcrypt hashes, never plain passwords.
 * @type {import('../utils/types.js').User[]}
 */
export const STATIC_USERS = [
  {
    id: 1,
    username: 'admin',
    fullName: 'Maria L. Santos',
    email: 'maria.santos@sinhs.edu.ph',
    roleCode: 'admin',
    positionId: 1,
    status: 'active',
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
    createdAt: '2026-11-14T08:05:00.000Z',
    lastLoginAt: null,
  },
];

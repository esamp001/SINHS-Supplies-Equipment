/** The three fixed system roles (AGENTS.md §10). */
const ROLES = [
  { code: 'admin', name: 'Admin' },
  { code: 'custodian', name: 'Custodian' },
  { code: 'staff', name: 'Staff' },
];

/** Common school positions (labels only; never used for permissions). */
const POSITIONS = [
  'Principal',
  'Assistant Principal',
  'Property Custodian',
  'Supply Officer',
  'Department Head',
  'Master Teacher',
  'Teacher I',
  'Teacher II',
  'Teacher III',
  'ICT Coordinator',
  'Librarian',
];

/**
 * Seeds roles and positions. Safe to re-run (inserts missing rows only).
 * @param {import('knex').Knex} knex - Knex instance.
 * @returns {Promise<void>}
 */
export const seed = async (knex) => {
  await knex('roles').insert(ROLES).onConflict('code').ignore();

  await knex('positions')
    .insert(POSITIONS.map((name) => ({ name })))
    .onConflict('name')
    .ignore();
};

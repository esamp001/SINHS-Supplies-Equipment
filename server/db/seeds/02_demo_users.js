import bcrypt from 'bcryptjs';

import { ENV } from '../../src/config/env.js';

/** Demo accounts for development. Password comes from SEED_DEFAULT_PASSWORD in .env. */
const DEMO_USERS = [
  {
    username: 'admin',
    email: 'maria.santos@sinhs.edu.ph',
    fullName: 'Maria L. Santos',
    roleCode: 'admin',
    position: 'Principal',
  },
  {
    username: 'custodian',
    email: 'jose.delacruz@sinhs.edu.ph',
    fullName: 'Jose R. Dela Cruz',
    roleCode: 'custodian',
    position: 'Property Custodian',
  },
  {
    username: 'staff',
    email: 'ana.reyes@sinhs.edu.ph',
    fullName: 'Ana P. Reyes',
    roleCode: 'staff',
    position: 'Teacher III',
  },
];

/**
 * Seeds the demo admin, custodian and staff accounts (active). Safe to re-run.
 * @param {import('knex').Knex} knex - Knex instance.
 * @returns {Promise<void>}
 * @throws {Error} When SEED_DEFAULT_PASSWORD is missing.
 */
export const seed = async (knex) => {
  if (!ENV.seedDefaultPassword) {
    throw new Error('Set SEED_DEFAULT_PASSWORD in server/.env before seeding demo users.');
  }

  const passwordHash = await bcrypt.hash(ENV.seedDefaultPassword, 10);
  const roles = await knex('roles').select('id', 'code');
  const positions = await knex('positions').select('id', 'name');

  const rows = DEMO_USERS.map((user) => ({
    username: user.username,
    email: user.email,
    full_name: user.fullName,
    password_hash: passwordHash,
    role_id: roles.find((role) => role.code === user.roleCode).id,
    position_id: positions.find((position) => position.name === user.position).id,
    status: 'active',
    approved_at: knex.fn.now(),
  }));

  await knex('users').insert(rows).onConflict('username').ignore();
};

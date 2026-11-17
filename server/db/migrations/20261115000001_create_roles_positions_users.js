/**
 * Creates roles, positions and users (AGENTS.md §8, §10).
 * @param {import('knex').Knex} knex - Knex instance.
 * @returns {Promise<void>}
 */
export const up = async (knex) => {
  await knex.schema.createTable('roles', (table) => {
    table.increments('id').primary();
    table.string('code', 30).notNullable().unique();
    table.string('name', 60).notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('positions', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });

  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('username', 50).notNullable().unique();
    table.string('email', 150).notNullable().unique();
    table.string('password_hash', 100).notNullable();
    table.string('full_name', 150).notNullable();
    table.integer('role_id').unsigned().nullable().references('id').inTable('roles');
    table.integer('position_id').unsigned().notNullable().references('id').inTable('positions');

    table
      .enu('status', ['pending', 'active', 'rejected', 'deactivated'], {
        useNative: false,
        enumName: 'user_status',
      })
      .notNullable()
      .defaultTo('pending');

    table.integer('approved_by').unsigned().nullable().references('id').inTable('users');
    table.timestamp('approved_at', { useTz: true }).nullable();
    table.string('rejection_reason', 255).nullable();
    table.boolean('must_change_password').notNullable().defaultTo(false);
    table.timestamp('last_login_at', { useTz: true }).nullable();
    table.integer('updated_by').unsigned().nullable().references('id').inTable('users');
    table.timestamps(true, true);
    table.timestamp('deleted_at', { useTz: true }).nullable();

    table.index(['status']);
    table.index(['role_id']);
  });
};

/**
 * Drops users, positions and roles.
 * @param {import('knex').Knex} knex - Knex instance.
 * @returns {Promise<void>}
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('positions');
  await knex.schema.dropTableIfExists('roles');
};

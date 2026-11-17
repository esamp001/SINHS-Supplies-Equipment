/**
 * Creates audit_logs (insert-only) and in-app notifications (AGENTS.md §8, §9).
 * @param {import('knex').Knex} knex - Knex instance.
 * @returns {Promise<void>}
 */
export const up = async (knex) => {
  await knex.schema.createTable('audit_logs', (table) => {
    table.bigIncrements('id').primary();
    table.integer('user_id').unsigned().nullable().references('id').inTable('users');
    table.string('action', 40).notNullable();
    table.string('entity_type', 60).notNullable();
    table.integer('entity_id').nullable();
    table.jsonb('before').nullable();
    table.jsonb('after').nullable();
    table.string('ip_address', 64).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['entity_type', 'entity_id']);
    table.index(['created_at']);
  });

  await knex.schema.createTable('notifications', (table) => {
    table.increments('id').primary();

    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table.string('type', 50).notNullable();
    table.string('title', 150).notNullable();
    table.string('message', 500).notNullable();
    table.string('link', 255).nullable();
    table.boolean('is_read').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['user_id', 'is_read']);
  });
};

/**
 * Drops notifications and audit_logs.
 * @param {import('knex').Knex} knex - Knex instance.
 * @returns {Promise<void>}
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('audit_logs');
};

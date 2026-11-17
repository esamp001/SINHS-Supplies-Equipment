/**
 * Adds what the inventory modules need on top of migration 0003 (AGENTS.md §8, §9):
 * - `is_active` on categories, units and locations so master data can be deactivated.
 * - `created_by` / `updated_by` on units and locations for accountability.
 * - `remarks` on borrow record items (return notes).
 * - `dedupe_key` on notifications so the daily due-soon / overdue check never sends duplicates.
 * @param {import('knex').Knex} knex - Knex instance.
 * @returns {Promise<void>}
 */
export const up = async (knex) => {
  await knex.schema.alterTable('categories', (table) => {
    table.boolean('is_active').notNullable().defaultTo(true);
  });

  await knex.schema.alterTable('units', (table) => {
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('created_by').unsigned().nullable().references('id').inTable('users');
    table.integer('updated_by').unsigned().nullable().references('id').inTable('users');
  });

  await knex.schema.alterTable('locations', (table) => {
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('created_by').unsigned().nullable().references('id').inTable('users');
    table.integer('updated_by').unsigned().nullable().references('id').inTable('users');
  });

  await knex.schema.alterTable('positions', (table) => {
    table.integer('created_by').unsigned().nullable().references('id').inTable('users');
    table.integer('updated_by').unsigned().nullable().references('id').inTable('users');
  });

  await knex.schema.alterTable('borrow_record_items', (table) => {
    table.string('remarks', 255).nullable();
  });

  await knex.schema.alterTable('notifications', (table) => {
    table.string('dedupe_key', 120).nullable();
    table.unique(['user_id', 'dedupe_key'], { indexName: 'notifications_user_dedupe_key_unique' });
  });

  await knex.schema.alterTable('stock_transactions', (table) => {
    table.index(['reference_type', 'reference_id']);
  });
};

/**
 * Removes the columns and indexes added by `up`.
 * @param {import('knex').Knex} knex - Knex instance.
 * @returns {Promise<void>}
 */
export const down = async (knex) => {
  await knex.schema.alterTable('stock_transactions', (table) => {
    table.dropIndex(['reference_type', 'reference_id']);
  });

  await knex.schema.alterTable('notifications', (table) => {
    table.dropUnique(['user_id', 'dedupe_key'], 'notifications_user_dedupe_key_unique');
    table.dropColumn('dedupe_key');
  });

  await knex.schema.alterTable('borrow_record_items', (table) => {
    table.dropColumn('remarks');
  });

  await knex.schema.alterTable('positions', (table) => {
    table.dropColumn('created_by');
    table.dropColumn('updated_by');
  });

  await knex.schema.alterTable('locations', (table) => {
    table.dropColumn('is_active');
    table.dropColumn('created_by');
    table.dropColumn('updated_by');
  });

  await knex.schema.alterTable('units', (table) => {
    table.dropColumn('is_active');
    table.dropColumn('created_by');
    table.dropColumn('updated_by');
  });

  await knex.schema.alterTable('categories', (table) => {
    table.dropColumn('is_active');
  });
};

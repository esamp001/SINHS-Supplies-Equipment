/**
 * Creates the inventory tables (AGENTS.md §8):
 * master data (categories, units, locations), item types with custom fields, items,
 * individually tracked units, the stock ledger, requests and borrow records.
 * @param {import('knex').Knex} knex - Knex instance.
 * @returns {Promise<void>}
 */
export const up = async (knex) => {
  await knex.schema.createTable('categories', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique();
    table.string('description', 255).nullable();
    table.integer('created_by').unsigned().nullable().references('id').inTable('users');
    table.integer('updated_by').unsigned().nullable().references('id').inTable('users');
    table.timestamps(true, true);
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });

  await knex.schema.createTable('units', (table) => {
    table.increments('id').primary();
    table.string('name', 50).notNullable().unique();
    table.string('abbreviation', 20).nullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });

  await knex.schema.createTable('locations', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique();
    table.string('description', 255).nullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });

  await knex.schema.createTable('item_types', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique();
    table.enu('kind', ['supply', 'equipment'], { useNative: false }).notNullable();

    table
      .enu('tracking_mode', ['quantity', 'unit'], { useNative: false })
      .notNullable()
      .defaultTo('quantity');

    table.integer('max_borrow_days').nullable().checkPositive();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('created_by').unsigned().nullable().references('id').inTable('users');
    table.integer('updated_by').unsigned().nullable().references('id').inTable('users');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('item_type_fields', (table) => {
    table.increments('id').primary();

    table
      .integer('item_type_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('item_types')
      .onDelete('CASCADE');

    table.string('key', 60).notNullable();
    table.string('label', 100).notNullable();

    table
      .enu('data_type', ['text', 'number', 'date', 'boolean', 'select'], { useNative: false })
      .notNullable();

    table.jsonb('options').nullable();
    table.boolean('is_required').notNullable().defaultTo(false);
    table.enu('applies_to', ['item', 'unit'], { useNative: false }).notNullable().defaultTo('item');
    table.integer('sort_order').notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    table.unique(['item_type_id', 'key']);
  });

  await knex.schema.createTable('items', (table) => {
    table.increments('id').primary();
    table.string('code', 50).notNullable().unique();
    table.string('name', 150).notNullable();
    table.integer('item_type_id').unsigned().notNullable().references('id').inTable('item_types');
    table.integer('category_id').unsigned().nullable().references('id').inTable('categories');
    table.integer('unit_id').unsigned().notNullable().references('id').inTable('units');
    table.integer('location_id').unsigned().nullable().references('id').inTable('locations');
    table.integer('quantity_on_hand').notNullable().defaultTo(0);
    table.integer('reorder_level').notNullable().defaultTo(0);
    table.jsonb('attributes').notNullable().defaultTo('{}');
    table.integer('created_by').unsigned().nullable().references('id').inTable('users');
    table.integer('updated_by').unsigned().nullable().references('id').inTable('users');
    table.timestamps(true, true);
    table.timestamp('deleted_at', { useTz: true }).nullable();

    table.check('?? >= 0', ['quantity_on_hand'], 'items_quantity_on_hand_non_negative');
    table.check('?? >= 0', ['reorder_level'], 'items_reorder_level_non_negative');
    table.index(['item_type_id']);
    table.index(['category_id']);
  });

  await knex.schema.createTable('item_units', (table) => {
    table.increments('id').primary();

    table
      .integer('item_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('items')
      .onDelete('CASCADE');

    table.string('property_no', 60).notNullable().unique();
    table.string('serial_no', 100).nullable();
    table.string('condition', 30).notNullable().defaultTo('good');

    table
      .enu('status', ['available', 'borrowed', 'under_repair', 'lost', 'disposed'], {
        useNative: false,
      })
      .notNullable()
      .defaultTo('available');

    table.jsonb('attributes').notNullable().defaultTo('{}');
    table.timestamps(true, true);

    table.index(['item_id', 'status']);
  });

  await knex.schema.createTable('inventory_requests', (table) => {
    table.increments('id').primary();
    table.enu('request_type', ['supply', 'borrow'], { useNative: false }).notNullable();
    table.integer('requested_by').unsigned().notNullable().references('id').inTable('users');
    table.string('purpose', 500).nullable();
    table.date('needed_at').nullable();
    table.timestamp('due_at', { useTz: true }).nullable();

    table
      .enu('status', ['pending', 'approved', 'rejected', 'released', 'returned', 'cancelled'], {
        useNative: false,
      })
      .notNullable()
      .defaultTo('pending');

    table.integer('reviewed_by').unsigned().nullable().references('id').inTable('users');
    table.timestamp('reviewed_at', { useTz: true }).nullable();
    table.string('rejection_reason', 255).nullable();
    table.integer('released_by').unsigned().nullable().references('id').inTable('users');
    table.timestamp('released_at', { useTz: true }).nullable();
    table.timestamps(true, true);

    table.index(['status']);
    table.index(['requested_by', 'status']);
  });

  await knex.schema.createTable('inventory_request_items', (table) => {
    table.increments('id').primary();

    table
      .integer('request_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('inventory_requests')
      .onDelete('CASCADE');

    table.integer('item_id').unsigned().notNullable().references('id').inTable('items');
    table.integer('requested_quantity').notNullable().checkPositive();
    table.integer('approved_quantity').nullable();
    table.integer('released_quantity').nullable();
    table.string('remarks', 255).nullable();

    table.check(
      '?? IS NULL OR (?? >= 0 AND ?? <= ??)',
      ['approved_quantity', 'approved_quantity', 'approved_quantity', 'requested_quantity'],
      'request_items_approved_quantity_valid',
    );

    table.index(['request_id']);
  });

  await knex.schema.createTable('borrow_records', (table) => {
    table.increments('id').primary();

    table
      .integer('request_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('inventory_requests');

    table.integer('borrower_id').unsigned().notNullable().references('id').inTable('users');
    table.timestamp('borrowed_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('due_at', { useTz: true }).notNullable();
    table.timestamp('returned_at', { useTz: true }).nullable();

    table
      .enu('status', ['borrowed', 'returned'], { useNative: false })
      .notNullable()
      .defaultTo('borrowed');

    table.integer('issued_by').unsigned().nullable().references('id').inTable('users');
    table.integer('received_by').unsigned().nullable().references('id').inTable('users');
    table.timestamps(true, true);

    table.index(['status', 'due_at']);
    table.index(['borrower_id', 'status']);
  });

  await knex.schema.createTable('borrow_record_items', (table) => {
    table.increments('id').primary();

    table
      .integer('borrow_record_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('borrow_records')
      .onDelete('CASCADE');

    table.integer('item_id').unsigned().notNullable().references('id').inTable('items');
    table.integer('item_unit_id').unsigned().nullable().references('id').inTable('item_units');
    table.integer('quantity').notNullable().defaultTo(1).checkPositive();
    table.enu('return_condition', ['good', 'damaged', 'lost'], { useNative: false }).nullable();
    table.timestamp('returned_at', { useTz: true }).nullable();

    table.index(['borrow_record_id']);
  });

  await knex.schema.createTable('stock_transactions', (table) => {
    table.bigIncrements('id').primary();
    table.integer('item_id').unsigned().notNullable().references('id').inTable('items');
    table.integer('item_unit_id').unsigned().nullable().references('id').inTable('item_units');

    table
      .enu('type', ['stock_in', 'stock_out', 'adjustment', 'borrow', 'return'], {
        useNative: false,
      })
      .notNullable();

    table.integer('quantity').notNullable();
    table.string('reference_type', 40).nullable();
    table.integer('reference_id').nullable();
    table.string('remarks', 255).nullable();
    table.integer('performed_by').unsigned().notNullable().references('id').inTable('users');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['item_id', 'created_at']);
    table.index(['type']);
  });
};

/**
 * Drops the inventory tables in reverse dependency order.
 * @param {import('knex').Knex} knex - Knex instance.
 * @returns {Promise<void>}
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists('stock_transactions');
  await knex.schema.dropTableIfExists('borrow_record_items');
  await knex.schema.dropTableIfExists('borrow_records');
  await knex.schema.dropTableIfExists('inventory_request_items');
  await knex.schema.dropTableIfExists('inventory_requests');
  await knex.schema.dropTableIfExists('item_units');
  await knex.schema.dropTableIfExists('items');
  await knex.schema.dropTableIfExists('item_type_fields');
  await knex.schema.dropTableIfExists('item_types');
  await knex.schema.dropTableIfExists('locations');
  await knex.schema.dropTableIfExists('units');
  await knex.schema.dropTableIfExists('categories');
};

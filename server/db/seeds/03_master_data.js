/** Item categories. */
const CATEGORIES = [
  { name: 'Office supplies', description: 'Paper, pens, folders and other consumables' },
  { name: 'ICT equipment', description: 'Laptops, projectors and other devices' },
  { name: 'Science laboratory', description: 'Lab apparatus and materials' },
  { name: 'Cleaning supplies', description: 'Janitorial consumables' },
  { name: 'Sports equipment', description: 'Balls, nets and PE materials' },
];

/** Units of measure. */
const UNITS = [
  { name: 'Piece', abbreviation: 'pc' },
  { name: 'Ream', abbreviation: 'ream' },
  { name: 'Box', abbreviation: 'box' },
  { name: 'Set', abbreviation: 'set' },
  { name: 'Unit', abbreviation: 'unit' },
  { name: 'Bottle', abbreviation: 'btl' },
  { name: 'Pack', abbreviation: 'pack' },
];

/** Storage rooms and offices. */
const LOCATIONS = [
  { name: 'Supply room', description: 'Main supply storage, ground floor' },
  { name: 'ICT laboratory', description: 'Room 204' },
  { name: 'Science laboratory', description: 'Room 105' },
  { name: 'Faculty room', description: 'Main building' },
  { name: 'Library', description: 'Second floor' },
];

/** Item types with their custom fields (AGENTS.md §8 item_types / item_type_fields). */
const ITEM_TYPES = [
  {
    name: 'Bond paper',
    kind: 'supply',
    trackingMode: 'quantity',
    maxBorrowDays: null,
    fields: [
      {
        key: 'size',
        label: 'Size',
        dataType: 'select',
        options: ['A4', 'Letter', 'Legal'],
        isRequired: true,
        appliesTo: 'item',
      },
      {
        key: 'gsm',
        label: 'Weight (gsm)',
        dataType: 'number',
        isRequired: false,
        appliesTo: 'item',
      },
    ],
  },
  {
    name: 'Writing supplies',
    kind: 'supply',
    trackingMode: 'quantity',
    maxBorrowDays: null,
    fields: [
      { key: 'color', label: 'Color', dataType: 'text', isRequired: false, appliesTo: 'item' },
    ],
  },
  {
    name: 'Laptop',
    kind: 'equipment',
    trackingMode: 'unit',
    maxBorrowDays: 7,
    fields: [
      { key: 'brand', label: 'Brand', dataType: 'text', isRequired: true, appliesTo: 'item' },
      { key: 'model', label: 'Model', dataType: 'text', isRequired: false, appliesTo: 'item' },
      {
        key: 'acquired_on',
        label: 'Date acquired',
        dataType: 'date',
        isRequired: false,
        appliesTo: 'unit',
      },
      {
        key: 'with_charger',
        label: 'With charger',
        dataType: 'boolean',
        isRequired: false,
        appliesTo: 'unit',
      },
    ],
  },
  {
    name: 'Projector',
    kind: 'equipment',
    trackingMode: 'unit',
    maxBorrowDays: 3,
    fields: [
      { key: 'brand', label: 'Brand', dataType: 'text', isRequired: true, appliesTo: 'item' },
      { key: 'lumens', label: 'Lumens', dataType: 'number', isRequired: false, appliesTo: 'item' },
    ],
  },
  {
    name: 'Sports ball',
    kind: 'equipment',
    trackingMode: 'quantity',
    maxBorrowDays: 5,
    fields: [
      {
        key: 'sport',
        label: 'Sport',
        dataType: 'select',
        options: ['Basketball', 'Volleyball', 'Football'],
        isRequired: true,
        appliesTo: 'item',
      },
    ],
  },
];

/** Sample items for development (only inserted when the items table is empty). */
const SAMPLE_ITEMS = [
  {
    code: 'SUP-0001',
    name: 'Bond paper, A4 (70 gsm)',
    type: 'Bond paper',
    category: 'Office supplies',
    unit: 'Ream',
    location: 'Supply room',
    reorderLevel: 20,
    openingQuantity: 50,
    attributes: { size: 'A4', gsm: 70 },
  },
  {
    code: 'SUP-0002',
    name: 'Bond paper, Legal',
    type: 'Bond paper',
    category: 'Office supplies',
    unit: 'Ream',
    location: 'Supply room',
    reorderLevel: 10,
    openingQuantity: 8,
    attributes: { size: 'Legal' },
  },
  {
    code: 'SUP-0003',
    name: 'Ballpen, black',
    type: 'Writing supplies',
    category: 'Office supplies',
    unit: 'Box',
    location: 'Supply room',
    reorderLevel: 5,
    openingQuantity: 12,
    attributes: { color: 'Black' },
  },
  {
    code: 'EQP-0001',
    name: 'Laptop, Acer TravelMate',
    type: 'Laptop',
    category: 'ICT equipment',
    unit: 'Unit',
    location: 'ICT laboratory',
    reorderLevel: 1,
    attributes: { brand: 'Acer', model: 'TravelMate P2' },
    units: [
      { propertyNo: 'PROP-2024-0011', serialNo: 'NXVLQSP001', attributes: { with_charger: true } },
      { propertyNo: 'PROP-2024-0012', serialNo: 'NXVLQSP002', attributes: { with_charger: true } },
      { propertyNo: 'PROP-2024-0013', serialNo: 'NXVLQSP003', attributes: { with_charger: false } },
    ],
  },
  {
    code: 'EQP-0002',
    name: 'Projector, Epson EB-X51',
    type: 'Projector',
    category: 'ICT equipment',
    unit: 'Unit',
    location: 'ICT laboratory',
    reorderLevel: 0,
    attributes: { brand: 'Epson', lumens: 3800 },
    units: [
      { propertyNo: 'PROP-2023-0101', serialNo: 'X5EP0101', attributes: {} },
      { propertyNo: 'PROP-2023-0102', serialNo: 'X5EP0102', attributes: {} },
    ],
  },
  {
    code: 'EQP-0003',
    name: 'Volleyball, Mikasa',
    type: 'Sports ball',
    category: 'Sports equipment',
    unit: 'Piece',
    location: 'Faculty room',
    reorderLevel: 2,
    openingQuantity: 6,
    attributes: { sport: 'Volleyball' },
  },
];

/**
 * Builds a name → id lookup from rows.
 * @param {Array<{ id: number, name: string }>} rows - Rows with id and name.
 * @returns {Object<string, number>} Lookup.
 */
const toIdByName = (rows) => Object.fromEntries(rows.map((row) => [row.name, row.id]));

/**
 * Inserts the item types and their fields (skips types that already exist).
 * @param {import('knex').Knex} knex - Knex instance.
 * @returns {Promise<void>}
 */
const seedItemTypes = async (knex) => {
  for (const itemType of ITEM_TYPES) {
    const existing = await knex('item_types').where({ name: itemType.name }).first('id');

    if (existing) {
      continue;
    }

    const [row] = await knex('item_types')
      .insert({
        name: itemType.name,
        kind: itemType.kind,
        tracking_mode: itemType.trackingMode,
        max_borrow_days: itemType.maxBorrowDays,
      })
      .returning('id');

    await knex('item_type_fields').insert(
      itemType.fields.map((field, index) => ({
        item_type_id: row.id,
        key: field.key,
        label: field.label,
        data_type: field.dataType,
        options: field.options ? JSON.stringify(field.options) : null,
        is_required: field.isRequired,
        applies_to: field.appliesTo,
        sort_order: index + 1,
      })),
    );
  }
};

/**
 * Inserts the sample items with opening stock written to the ledger, so quantity on hand always
 * equals the sum of stock transactions (AGENTS.md §9). Runs only when there are no items yet.
 * @param {import('knex').Knex} knex - Knex instance.
 * @returns {Promise<void>}
 */
const seedSampleItems = async (knex) => {
  const itemCount = await knex('items').count('id as count').first();
  const custodian = await knex('users').where({ username: 'custodian' }).first('id');

  if (Number(itemCount.count) > 0 || !custodian) {
    return;
  }

  const typeIds = toIdByName(await knex('item_types').select('id', 'name'));
  const categoryIds = toIdByName(await knex('categories').select('id', 'name'));
  const unitIds = toIdByName(await knex('units').select('id', 'name'));
  const locationIds = toIdByName(await knex('locations').select('id', 'name'));

  for (const item of SAMPLE_ITEMS) {
    const quantity = item.units ? item.units.length : item.openingQuantity;

    const [row] = await knex('items')
      .insert({
        code: item.code,
        name: item.name,
        item_type_id: typeIds[item.type],
        category_id: categoryIds[item.category],
        unit_id: unitIds[item.unit],
        location_id: locationIds[item.location],
        quantity_on_hand: quantity,
        reorder_level: item.reorderLevel,
        attributes: JSON.stringify(item.attributes),
        created_by: custodian.id,
      })
      .returning('id');

    if (!item.units) {
      await knex('stock_transactions').insert({
        item_id: row.id,
        type: 'stock_in',
        quantity,
        remarks: 'Opening balance (seed)',
        performed_by: custodian.id,
      });

      continue;
    }

    for (const unit of item.units) {
      const [unitRow] = await knex('item_units')
        .insert({
          item_id: row.id,
          property_no: unit.propertyNo,
          serial_no: unit.serialNo,
          attributes: JSON.stringify(unit.attributes),
        })
        .returning('id');

      await knex('stock_transactions').insert({
        item_id: row.id,
        item_unit_id: unitRow.id,
        type: 'stock_in',
        quantity: 1,
        remarks: 'Opening balance (seed)',
        performed_by: custodian.id,
      });
    }
  }
};

/**
 * Seeds categories, units, locations, item types with fields, and sample items.
 * Safe to re-run (inserts missing rows only).
 * @param {import('knex').Knex} knex - Knex instance.
 * @returns {Promise<void>}
 */
export const seed = async (knex) => {
  await knex('categories').insert(CATEGORIES).onConflict('name').ignore();
  await knex('units').insert(UNITS).onConflict('name').ignore();
  await knex('locations').insert(LOCATIONS).onConflict('name').ignore();
  await seedItemTypes(knex);
  await seedSampleItems(knex);
};

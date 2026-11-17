/** Common item categories for a public high school. */
const CATEGORIES = [
  { name: 'Office supplies', description: 'Paper, pens, folders and other consumables' },
  { name: 'ICT equipment', description: 'Laptops, projectors, printers and other devices' },
  { name: 'Science laboratory', description: 'Lab apparatus, glassware and chemicals' },
  { name: 'Cleaning supplies', description: 'Janitorial and sanitation consumables' },
  { name: 'Sports equipment', description: 'Balls, nets and PE materials' },
  { name: 'Furniture', description: 'Chairs, tables, cabinets and shelves' },
  { name: 'Medical supplies', description: 'First aid and clinic consumables' },
  { name: 'Teaching materials', description: 'Charts, models and instructional materials' },
];

/** Common units of measure. */
const UNITS = [
  { name: 'Piece', abbreviation: 'pc' },
  { name: 'Unit', abbreviation: 'unit' },
  { name: 'Set', abbreviation: 'set' },
  { name: 'Box', abbreviation: 'box' },
  { name: 'Pack', abbreviation: 'pack' },
  { name: 'Ream', abbreviation: 'ream' },
  { name: 'Bottle', abbreviation: 'btl' },
  { name: 'Gallon', abbreviation: 'gal' },
  { name: 'Roll', abbreviation: 'roll' },
  { name: 'Dozen', abbreviation: 'doz' },
];

/** Common storage rooms and offices. */
const LOCATIONS = [
  { name: 'Supply room', description: 'Main supply storage' },
  { name: 'Property custodian office', description: 'Custodian office and equipment storage' },
  { name: 'ICT laboratory', description: 'Computer laboratory' },
  { name: 'Science laboratory', description: 'Science laboratory and stock room' },
  { name: 'Faculty room', description: 'Teachers’ faculty room' },
  { name: 'Library', description: 'School library' },
  { name: 'Clinic', description: 'School clinic' },
  { name: 'Gymnasium', description: 'PE and sports storage' },
];

/**
 * Seeds sample categories, units of measure and locations so the Master data lists and item
 * dropdowns are usable right away. Safe to re-run: existing names are skipped, and records
 * an admin edited or deactivated are left as they are. Item types and items are not seeded.
 * @param {import('knex').Knex} knex - Knex instance.
 * @returns {Promise<void>}
 */
export const seed = async (knex) => {
  await knex('categories').insert(CATEGORIES).onConflict('name').ignore();
  await knex('units').insert(UNITS).onConflict('name').ignore();
  await knex('locations').insert(LOCATIONS).onConflict('name').ignore();
};

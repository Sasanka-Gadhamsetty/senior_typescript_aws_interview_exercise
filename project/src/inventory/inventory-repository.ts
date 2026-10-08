import { pool } from "../db/postgres";
import type { InventoryUnitResponse } from "./inventory-schema";

interface InventoryRow {
  unit_id: string;
  unit_number: string;
  bedrooms: number;
  bathrooms: string;
  square_feet: number;
  status: string;
  lease_rate: string | null;
}

/**
 * Returns ACTIVE units for a property, sorted by building, floor, unit number.
 * `lease_rate` is the rate for the first (lowest-ordinality) entry in each
 * unit's JSONB lease_pricing array - the advertised "starting" rate shown in
 * a listing, as opposed to reserveUnit()'s term-specific lookup.
 */
export async function findActiveInventoryByProperty(
  propertyId: string
): Promise<InventoryUnitResponse[]> {
  const { rows } = await pool.query<InventoryRow>(
    `SELECT
       i.unit_id,
       i.unit_number,
       i.bedrooms,
       i.bathrooms,
       i.square_feet,
       i.status,
       lp.rate AS lease_rate
     FROM inventory i
     LEFT JOIN LATERAL (
       SELECT (elem ->> 'rate')::numeric AS rate
       FROM jsonb_array_elements(i.lease_pricing) WITH ORDINALITY AS t(elem, idx)
       WHERE idx = 1
     ) lp ON true
     WHERE i.property_id = $1
       AND i.is_active = true
     ORDER BY i.building, i.floor, i.unit_number`,
    [propertyId]
  );

  return rows.map((row) => ({
    unitId: row.unit_id,
    unitNumber: row.unit_number,
    bedrooms: row.bedrooms,
    bathrooms: Number(row.bathrooms),
    squareFeet: row.square_feet,
    status: row.status,
    leaseRate: row.lease_rate !== null ? Number(row.lease_rate) : null,
  }));
}

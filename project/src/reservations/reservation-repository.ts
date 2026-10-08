import type { PoolClient } from "pg";
import { withTransaction } from "../db/postgres";

export class UnitNotFoundError extends Error {}
export class UnitNotAvailableError extends Error {}
export class LeaseTermNotOfferedError extends Error {}

export interface ReservationResult {
  reservationId: string;
  unitId: string;
  customerId: string;
  leaseTerm: number;
  leaseRate: number;
  reservedAt: string;
}

interface UnitRow {
  unit_id: string;
  status: string;
}

interface LeaseRateRow {
  rate: string;
}

interface ReservationRow {
  reservation_id: string;
  unit_id: string;
  customer_id: string;
  lease_term: number;
  lease_rate: string;
  created_at: Date;
}

async function loadUnitForUpdate(client: PoolClient, unitId: string): Promise<UnitRow> {
  // FOR UPDATE takes a row lock for the duration of the transaction: any other
  // transaction trying to reserve the same unit blocks here until this one
  // commits or rolls back, so the availability check and the later status
  // update are atomic together. This is what actually prevents double
  // reservations - the unique index on reservations is the backstop, not the
  // primary mechanism.
  const result = await client.query<UnitRow>(
    `SELECT unit_id, status FROM inventory WHERE unit_id = $1 FOR UPDATE`,
    [unitId]
  );

  const unit = result.rows[0];
  if (!unit) {
    throw new UnitNotFoundError(`Unit ${unitId} not found`);
  }
  return unit;
}

async function lookupLeaseRate(
  client: PoolClient,
  unitId: string,
  leaseTerm: number
): Promise<number> {
  // Bonus requirement: pull the rate for the requested lease term out of the
  // unit's JSONB pricing array via jsonb_array_elements() WITH ORDINALITY.
  const result = await client.query<LeaseRateRow>(
    `SELECT (elem ->> 'rate')::numeric AS rate
     FROM inventory i
     CROSS JOIN LATERAL jsonb_array_elements(i.lease_pricing) WITH ORDINALITY AS t(elem, idx)
     WHERE i.unit_id = $1
       AND (elem ->> 'termMonths')::int = $2
     LIMIT 1`,
    [unitId, leaseTerm]
  );

  const row = result.rows[0];
  if (!row) {
    throw new LeaseTermNotOfferedError(
      `Unit ${unitId} does not offer a ${leaseTerm}-month lease term`
    );
  }

  return Number(row.rate);
}

/**
 * Reserves a unit end-to-end inside a single transaction:
 *   1. Lock + check the unit is AVAILABLE
 *   2. Look up the requested lease term's rate from JSONB pricing
 *   3. Insert the reservation
 *   4. Flip inventory status to RESERVED
 *   5. Write an audit log entry
 * Any failure rolls back all of the above.
 */
export async function reserveUnitTransaction(
  unitId: string,
  customerId: string,
  leaseTerm: number
): Promise<ReservationResult> {
  return withTransaction(async (client) => {
    const unit = await loadUnitForUpdate(client, unitId);

    if (unit.status !== "AVAILABLE") {
      throw new UnitNotAvailableError(`Unit ${unitId} is not available for reservation`);
    }

    const leaseRate = await lookupLeaseRate(client, unitId, leaseTerm);

    const inserted = await client.query<ReservationRow>(
      `INSERT INTO reservations (unit_id, customer_id, lease_term, lease_rate, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       RETURNING reservation_id, unit_id, customer_id, lease_term, lease_rate, created_at`,
      [unitId, customerId, leaseTerm, leaseRate]
    );
    const reservation = inserted.rows[0];
    if (!reservation) {
      throw new Error(`Reservation insert for unit ${unitId} did not return a row`);
    }

    await client.query(
      `UPDATE inventory SET status = 'RESERVED', updated_at = now() WHERE unit_id = $1`,
      [unitId]
    );

    await client.query(
      `INSERT INTO audit_log (entity_type, entity_id, action, actor_id, details)
       VALUES ('inventory', $1, 'RESERVE', $2, $3::jsonb)`,
      [
        unitId,
        customerId,
        JSON.stringify({ reservationId: reservation.reservation_id, leaseTerm, leaseRate }),
      ]
    );

    return {
      reservationId: reservation.reservation_id,
      unitId: reservation.unit_id,
      customerId: reservation.customer_id,
      leaseTerm: reservation.lease_term,
      leaseRate: Number(reservation.lease_rate),
      reservedAt: reservation.created_at.toISOString(),
    };
  });
}

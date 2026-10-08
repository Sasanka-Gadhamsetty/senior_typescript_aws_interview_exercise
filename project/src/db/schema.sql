-- Reference schema assumed by inventory-repository.ts and reservation-repository.ts.
-- Not executed by the app; the framework owns migrations/pooling separately.

CREATE TABLE inventory (
  unit_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL,
  building      TEXT NOT NULL,
  floor         INTEGER NOT NULL,
  unit_number   TEXT NOT NULL,
  bedrooms      INTEGER NOT NULL,
  bathrooms     NUMERIC(3, 1) NOT NULL,
  square_feet   INTEGER NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE, -- unit is listable at all ("ACTIVE" in Endpoint 1)
  status        TEXT NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE | RESERVED | LEASED | MAINTENANCE
  lease_pricing JSONB NOT NULL DEFAULT '[]', -- [{ "termMonths": 12, "rate": 1850.00 }, ...]
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (status IN ('AVAILABLE', 'RESERVED', 'LEASED', 'MAINTENANCE'))
);

CREATE INDEX idx_inventory_property_sort
  ON inventory (property_id, building, floor, unit_number);

CREATE TABLE reservations (
  reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id        UUID NOT NULL REFERENCES inventory (unit_id),
  customer_id    UUID NOT NULL,
  lease_term     INTEGER NOT NULL,
  lease_rate     NUMERIC(10, 2) NOT NULL,
  status         TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | CANCELLED
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (status IN ('ACTIVE', 'CANCELLED'))
);

-- Defense in depth against double reservations: even if the SELECT FOR UPDATE
-- row lock in reservation-repository.ts were ever bypassed (e.g. a second
-- writer connecting outside the app), the DB itself refuses a second ACTIVE
-- reservation for the same unit.
CREATE UNIQUE INDEX uq_reservations_active_unit
  ON reservations (unit_id)
  WHERE status = 'ACTIVE';

CREATE TABLE audit_log (
  audit_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  action      TEXT NOT NULL,
  actor_id    UUID NOT NULL,
  details     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

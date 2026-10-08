-- Sample data for local testing against the two endpoints. Run after schema.sql.
-- propertyId below is fixed so it's easy to paste into Postman.

INSERT INTO inventory (unit_id, property_id, building, floor, unit_number, bedrooms, bathrooms, square_feet, is_active, status, lease_pricing)
VALUES
  ('11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999999', 'A', 1, '101', 1, 1.0, 650, TRUE, 'AVAILABLE',
   '[{"termMonths": 12, "rate": 1850.00}, {"termMonths": 6, "rate": 1950.00}]'),
  ('22222222-2222-2222-2222-222222222222', '99999999-9999-9999-9999-999999999999', 'A', 2, '201', 2, 1.5, 900, TRUE, 'AVAILABLE',
   '[{"termMonths": 12, "rate": 2400.00}]'),
  ('33333333-3333-3333-3333-333333333333', '99999999-9999-9999-9999-999999999999', 'B', 1, '105', 1, 1.0, 620, TRUE, 'RESERVED',
   '[{"termMonths": 12, "rate": 1800.00}]');

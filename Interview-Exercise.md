# Senior TypeScript / AWS Lambda Interview Exercise

## Background
Your company has a home-grown framework:

API Gateway -> Cognito -> Lambda -> Dispatcher -> Authorization -> Validation -> Handler -> Repository -> PostgreSQL

The framework already provides:
- Authentication
- Logging
- Database pooling
- Error handling
- Response serialization

Your job is to implement two endpoint handlers.

## Endpoint 1
GET /properties/{propertyId}/inventory

Requirements:
- Return ACTIVE units only
- Return unit number, bedrooms, bathrooms, square feet, status and lease rate
- Sort by building, floor, unit number
- Validate propertyId is a UUID
- Authorization: inventory.read
- Use parameterized PostgreSQL queries

## Endpoint 2
POST /inventory/{unitId}/reserve

Body:
{
  "customerId": "...",
  "leaseTerm": 12
}

Requirements:
- Only AVAILABLE units can be reserved
- Insert reservation
- Update inventory
- Write audit log
- Use a transaction
- Prevent double reservations
- Authorization: inventory.reserve

Assume the framework already exposes:

registerEndpoint({
  method: "POST",
  path: "/inventory/{unitId}/reserve",
  permission: "inventory.reserve",
  validator: ReserveSchema,
  handler: reserveUnit
});

Implement only getInventory() and reserveUnit().

Bonus:
Lease pricing is stored in JSONB. Return the requested lease term using jsonb_array_elements() and WITH ORDINALITY.

# Expected Characteristics

Excellent candidates typically produce:

- Thin endpoint handlers
- Repository pattern
- Generic request/response contracts
- Central authorization middleware
- Zod validation
- Parameterized SQL
- Transactions
- Atomic inventory updates
- Proper HTTP status codes
- Strong TypeScript typing

Suggested structure:

src/
  framework/
    dispatcher.ts
    authorization.ts
    validation.ts
    middleware.ts

  inventory/
    inventory-handler.ts
    inventory-repository.ts
    inventory-schema.ts

  reservations/
    reservation-handler.ts
    reservation-repository.ts

  db/
    postgres.ts
    
<!-- Understand dispatcher and registry flow comparing with traditional flow of routes and controllers
getPropertyFunction<T,K extends keyof T>(person: T, property: K): T[K] {
  return person[property]
}
upsert
onConflict clause - do update(postgres)
merge statement similar to insert or update
returning
Promise.all(), Promise.allSettled() - if any one function fails?
const [drivers, vehicles] = await Promise.all([ getDrivers, getVehicles]) - allows in postgresql driver -how this works inside transactions in new drivers
Dependency Injection - where and how it is used
Test cases -->
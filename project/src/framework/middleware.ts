/**
 * Fixed middleware pipeline order applied by the dispatcher for every request:
 *
 *   1. authorize()  - central permission check (framework/authorization.ts)
 *   2. validate()   - Zod parsing of path params and body (framework/validation.ts)
 *   3. handler()    - the thin endpoint handler itself
 *
 * Authorization always runs before validation so an unauthorized caller never
 * learns anything about a resource's expected shape from a 400 response.
 *
 * See dispatch() in dispatcher.ts for the concrete composition - it is kept
 * inline there rather than as a generic middleware chain because there are
 * only ever these two cross-cutting steps, and a configurable chain would be
 * unused generality for this framework's scope.
 */
export {};

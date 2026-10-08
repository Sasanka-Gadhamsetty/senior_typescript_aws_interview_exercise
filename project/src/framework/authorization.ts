import { ForbiddenError } from "./errors";
import type { AuthenticatedUser } from "./dispatcher";

/**
 * Central authorization check. Every endpoint declares a single required
 * permission at registration time; the dispatcher calls this before the
 * handler ever runs, so handlers never need to reason about access control.
 */
export function authorize(user: AuthenticatedUser, requiredPermission: string): void {
  if (!user.permissions.includes(requiredPermission)) {
    throw new ForbiddenError(
      `User ${user.id} is missing required permission "${requiredPermission}"`
    );
  }
}

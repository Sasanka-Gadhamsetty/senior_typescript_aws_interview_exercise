import type { ZodSchema } from "zod";
import { authorize } from "./authorization";
import { validate } from "./validation";
import { NotFoundError } from "./errors";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Identity + permission set attached to the request by the Cognito/auth layer upstream. */
export interface AuthenticatedUser {
  id: string;
  permissions: string[];
}

/** Generic, strongly-typed request contract every handler receives. */
export interface EndpointRequest<TParams = Record<string, string>, TBody = undefined> {
  params: TParams;
  body: TBody;
  user: AuthenticatedUser;
}

/** Generic, strongly-typed response contract every handler returns. */
export interface EndpointResponse<TResponseBody> {
  statusCode: number;
  body: TResponseBody;
}

export type EndpointHandler<TParams, TBody, TResponseBody> = (
  request: EndpointRequest<TParams, TBody>
) => Promise<EndpointResponse<TResponseBody>>;

export interface EndpointDefinition<TParams, TBody, TResponseBody> {
  method: HttpMethod;
  path: string;
  permission: string;
  paramsValidator?: ZodSchema<TParams>;
  validator?: ZodSchema<TBody>;
  handler: EndpointHandler<TParams, TBody, TResponseBody>;
}

/** Raw, untyped input as it arrives from API Gateway before validation. */
export interface RawRequest {
  params: Record<string, string>;
  body: unknown;
  user: AuthenticatedUser;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry = new Map<string, EndpointDefinition<any, any, any>>();

function key(method: HttpMethod, path: string): string {
  return `${method} ${path}`;
}

/**
 * Registers an endpoint definition. This is the only integration point handler
 * modules need: they describe method, path, required permission and schemas,
 * and the dispatcher takes care of authorization, validation and invocation order.
 */
export function registerEndpoint<TParams, TBody, TResponseBody>(
  definition: EndpointDefinition<TParams, TBody, TResponseBody>
): void {
  registry.set(key(definition.method, definition.path), definition);
}

/**
 * Entry point the Lambda handler (outside the scope of this exercise) calls
 * once it has resolved the route and authenticated the caller via Cognito.
 * Runs authorization -> validation -> handler, in that fixed order, for every endpoint.
 */
export async function dispatch(
  method: HttpMethod,
  path: string,
  raw: RawRequest
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<EndpointResponse<any>> {
  const definition = registry.get(key(method, path));
  if (!definition) {
    throw new NotFoundError(`No endpoint registered for ${method} ${path}`);
  }

  authorize(raw.user, definition.permission);

  const params = definition.paramsValidator
    ? validate(definition.paramsValidator, raw.params)
    : (raw.params as unknown);
  const body = definition.validator
    ? validate(definition.validator, raw.body)
    : (raw.body as unknown);

  return definition.handler({ params, body, user: raw.user } as EndpointRequest<
    unknown,
    unknown
  >);
}

/** Test/dev helper — clears all registered endpoints. */
export function resetRegistry(): void {
  registry.clear();
}

/**
 * Matches a concrete request path (e.g. "/inventory/123/reserve") against a
 * registered template (e.g. "/inventory/{unitId}/reserve"), extracting path
 * params on success. This is normally API Gateway's job; the local dev server
 * (server.ts) does it itself since there is no API Gateway in front of it.
 */
function matchTemplate(template: string, actual: string): Record<string, string> | null {
  const templateSegments = template.split("/");
  const actualSegments = actual.split("/");
  if (templateSegments.length !== actualSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < templateSegments.length; i++) {
    const templateSegment = templateSegments[i] as string;
    const actualSegment = actualSegments[i] as string;
    if (templateSegment.startsWith("{") && templateSegment.endsWith("}")) {
      params[templateSegment.slice(1, -1)] = decodeURIComponent(actualSegment);
    } else if (templateSegment !== actualSegment) {
      return null;
    }
  }
  return params;
}

/**
 * Resolves a raw request path to its registered route template and path
 * params, e.g. ("GET", "/properties/abc/inventory") ->
 * { path: "/properties/{propertyId}/inventory", params: { propertyId: "abc" } }.
 * Returns undefined if no registered endpoint matches.
 */
export function resolveRoute(
  method: HttpMethod,
  rawPath: string
): { path: string; params: Record<string, string> } | undefined {
  for (const definition of registry.values()) {
    if (definition.method !== method) continue;
    const params = matchTemplate(definition.path, rawPath);
    if (params) {
      return { path: definition.path, params };
    }
  }
  return undefined;
}

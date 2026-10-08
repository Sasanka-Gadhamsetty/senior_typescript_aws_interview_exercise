import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { dispatch } from "./index";
import { resolveRoute, type AuthenticatedUser, type HttpMethod } from "./framework/dispatcher";
import { HttpError, ValidationError } from "./framework/errors";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

/**
 * Stand-in for the Cognito authorizer API Gateway would run upstream, which
 * is out of scope for this exercise. Local dev only: caller supplies identity
 * via headers instead of a verified JWT.
 *
 *   x-user-id:          defaults to "local-dev-user"
 *   x-user-permissions: comma-separated, e.g. "inventory.read,inventory.reserve"
 */
function authenticateFromHeaders(req: IncomingMessage): AuthenticatedUser {
  const id = (req.headers["x-user-id"] as string | undefined) ?? "local-dev-user";
  const permissionsHeader = (req.headers["x-user-permissions"] as string | undefined) ?? "";
  const permissions = permissionsHeader
    .split(",")
    .map((permission) => permission.trim())
    .filter(Boolean);
  return { id, permissions };
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = req.method as HttpMethod;
  const url = new URL(req.url ?? "/", "http://localhost");

  const route = resolveRoute(method, url.pathname);
  if (!route) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `No route matches ${method} ${url.pathname}` }));
    return;
  }

  const rawBody = await readBody(req);
  let body: unknown;
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new ValidationError("Request body is not valid JSON");
    }
  }

  const user = authenticateFromHeaders(req);
  const result = await dispatch(method, route.path, { params: route.params, body, user });

  res.writeHead(result.statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(result.body));
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch((err: unknown) => {
    if (err instanceof HttpError) {
      const payload =
        err instanceof ValidationError
          ? { error: err.message, issues: err.issues }
          : { error: err.message };
      res.writeHead(err.statusCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payload));
      return;
    }
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  });
});

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});

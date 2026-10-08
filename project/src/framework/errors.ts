import type { ZodIssue } from "zod";

export abstract class HttpError extends Error {
  abstract readonly statusCode: number;
}

export class ValidationError extends HttpError {
  readonly statusCode = 400;

  constructor(message: string, public readonly issues: ZodIssue[] = []) {
    super(message);
  }
}

export class ForbiddenError extends HttpError {
  readonly statusCode = 403;
}

export class NotFoundError extends HttpError {
  readonly statusCode = 404;
}

export class ConflictError extends HttpError {
  readonly statusCode = 409;
}

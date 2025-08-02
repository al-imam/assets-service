import { ErrorRequestHandler } from "express";
import { z } from "zod";

export interface ErrorResponse {
  status: number;
  message: string;
  code?: string;
  issues?: { code: string; message: string; path: string }[];
}

export class HttpError extends Error {
  status: number;
  code?: string;
  issues?: { code: string; message: string; path: string }[];

  constructor(
    status: number,
    message: string,
    code?: string,
    issues?: { code: string; message: string; path: string }[]
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.issues = issues;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): ErrorResponse {
    return {
      status: this.status,
      message: this.message,
      code: this.code,
      issues: this.issues,
    };
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Bad Request", code?: string) {
    super(400, message, code);
  }
}

export class ZodValidationError extends HttpError {
  constructor(error: z.ZodError) {
    super(
      400,
      "Invalid Request",
      "ZOD_VALIDATION_ERROR",
      error.issues.map(e => ({ code: e.code, message: e.message, path: e.path.join(".") }))
    );
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized", code?: string) {
    super(401, message, code);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden", code?: string) {
    super(403, message, code);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Resource Unavailable", code?: string) {
    super(404, message, code);
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Conflict", code?: string) {
    super(409, message, code);
  }
}

export class UnprocessableError extends HttpError {
  constructor(message = "Unprocessable Entity", code?: string) {
    super(422, message, code);
  }
}

export class InternalServerError extends HttpError {
  constructor(message = "Internal Server Error", code?: string) {
    super(500, message, code);
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(message = "Service Unavailable", code?: string) {
    super(503, message, code);
  }
}

export const ErrorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error("Unhandled error:", error);
  if (error instanceof HttpError) {
    res.status(error.status).json(error);
  } else {
    const internalServerError = new InternalServerError();
    res.status(internalServerError.status).json(internalServerError);
  }
};

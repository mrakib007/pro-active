export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function isJsonParseError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return "type" in error && error.type === "entity.parse.failed";
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (isJsonParseError(error)) {
    return new AppError(
      400,
      "INVALID_JSON",
      "Request body contains invalid JSON",
    );
  }

  return new AppError(500, "INTERNAL_SERVER_ERROR", "Internal server error");
}

/**
 * The one error type every service-layer function throws. Both the human-UI
 * server actions and the WebMCP tool executor catch `AppError` and turn it
 * into the same predictable shape (see docs/webmcp.md "Tool output design"
 * and spec section 22/37) — a stack trace never reaches the client, and an
 * agent gets a short, actionable message instead of a raw exception.
 */
export class AppError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }

  static notFound(entity: string, id: string) {
    return new AppError(
      `${entity.toUpperCase()}_NOT_FOUND`,
      `${entity} ${id} does not exist.`,
    );
  }

  static validation(message: string) {
    return new AppError("VALIDATION_ERROR", message);
  }

  static forbidden(message = "You do not have permission to do that.") {
    return new AppError("FORBIDDEN", message);
  }

  static approvalRequired(message: string) {
    return new AppError("APPROVAL_REQUIRED", message);
  }

  static conflict(message: string) {
    return new AppError("CONFLICT", message);
  }
}

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

/** Normalizes any thrown error (AppError or otherwise) into a ServiceResult. */
export function toServiceResult<T>(value: T): ServiceResult<T> {
  return { success: true, data: value };
}

export function errorToServiceResult(error: unknown): ServiceResult<never> {
  if (error instanceof AppError) {
    return {
      success: false,
      error: { code: error.code, message: error.message },
    };
  }
  // Never leak internal error details (stack traces, driver errors) to the
  // caller — see docs/security.md "Safe error messages".
  console.error("Unexpected service error:", error);
  return {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong processing that request.",
    },
  };
}

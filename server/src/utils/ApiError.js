export class ApiError extends Error {
  constructor(statusCode, message = "Something went wrong", errors = [], data = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;
    this.data = data;
    Error.captureStackTrace(this, this.constructor);
  }
}

export interface FieldError {
  path: string;
  message: string;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly errors: FieldError[];
  readonly expose: boolean;

  constructor(statusCode: number, message: string, errors: FieldError[] = [], expose = true) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.expose = expose;
  }

  static badRequest(message = 'Bad request', errors: FieldError[] = []) {
    return new ApiError(400, message, errors);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }
  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }
  static unprocessable(message = 'Unprocessable request', errors: FieldError[] = []) {
    return new ApiError(422, message, errors);
  }
  static tooMany(message = 'Too many requests, please slow down') {
    return new ApiError(429, message);
  }
  static internal(message = 'Internal server error') {
    return new ApiError(500, message, [], false);
  }
  static serviceUnavailable(message = 'Service temporarily unavailable') {
    return new ApiError(503, message);
  }
}

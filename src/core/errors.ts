/** Message is shown to the user verbatim. */
export class UserFacingError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UserFacingError";
	}
}

export class PermissionError extends UserFacingError {
	constructor(message: string) {
		super(message);
		this.name = "PermissionError";
	}
}

export class NotFoundError extends UserFacingError {
	constructor(message: string) {
		super(message);
		this.name = "NotFoundError";
	}
}

export class ValidationError extends UserFacingError {
	constructor(message: string) {
		super(message);
		this.name = "ValidationError";
	}
}

export class CooldownError extends UserFacingError {
	constructor(
		readonly retryAfterMs: number,
		message: string,
	) {
		super(message);
		this.name = "CooldownError";
	}
}

/** Logged with full context; the user only ever sees a generic message. */
export class ExternalApiError extends Error {
	constructor(
		readonly service: string,
		override readonly cause: unknown,
	) {
		super(`External API call to ${service} failed`);
		this.name = "ExternalApiError";
	}
}

export class ModuleLoadError extends Error {
	constructor(
		readonly file: string,
		override readonly cause: unknown,
	) {
		super(`Failed to load module: ${file}`);
		this.name = "ModuleLoadError";
	}
}

export class ConfigurationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ConfigurationError";
	}
}

export function isUserFacing(error: unknown): error is UserFacingError {
	return error instanceof UserFacingError;
}

/** Normalises anything thrown into an Error, so logging never loses the value. */
export function toError(value: unknown): Error {
	if (value instanceof Error) return value;
	return new Error(typeof value === "string" ? value : JSON.stringify(value));
}

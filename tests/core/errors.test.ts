import {
	CooldownError,
	ExternalApiError,
	isUserFacing,
	ModuleLoadError,
	NotFoundError,
	PermissionError,
	toError,
	UserFacingError,
	ValidationError,
} from "../../src/core/errors";

describe("error types", () => {
	it("recognises every user-facing subclass", () => {
		expect(isUserFacing(new UserFacingError("x"))).toBe(true);
		expect(isUserFacing(new PermissionError("x"))).toBe(true);
		expect(isUserFacing(new NotFoundError("x"))).toBe(true);
		expect(isUserFacing(new ValidationError("x"))).toBe(true);
		expect(isUserFacing(new CooldownError(1_000, "x"))).toBe(true);
	});

	it("does not treat internal errors as user-facing", () => {
		expect(isUserFacing(new ExternalApiError("tmdb", new Error("boom")))).toBe(false);
		expect(isUserFacing(new ModuleLoadError("a.js", new Error("boom")))).toBe(false);
		expect(isUserFacing(new Error("boom"))).toBe(false);
	});

	it("keeps the retry window on a cooldown error", () => {
		expect(new CooldownError(5_000, "wait").retryAfterMs).toBe(5_000);
	});

	it("normalises anything thrown into an Error", () => {
		expect(toError(new Error("real")).message).toBe("real");
		expect(toError("a string").message).toBe("a string");
		expect(toError({ code: 42 }).message).toBe('{"code":42}');
	});
});

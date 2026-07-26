import { ServiceError, SetupError, toError, UserFacingError } from "../../src/core/errors";

describe("toError", () => {
	it("passes an Error straight through", () => {
		const original = new Error("nope");
		expect(toError(original)).toBe(original);
	});

	it("wraps a thrown string", () => {
		expect(toError("nope").message).toBe("nope");
	});

	it("wraps a thrown object without losing it", () => {
		expect(toError({ code: 42 }).message).toBe('{"code":42}');
	});
});

describe("the error types", () => {
	it("keeps a user-facing message as written", () => {
		expect(new UserFacingError("You need 500 more coins.").message).toBe("You need 500 more coins.");
	});

	it("names the service that failed", () => {
		const error = new ServiceError("TMDB", new Error("timeout"));
		expect(error.message).toBe("TMDB is not responding");
		expect(error.service).toBe("TMDB");
	});

	it("marks a setup problem separately, so it is not reported as a bug", () => {
		expect(new SetupError("Set CHANNEL_ERROR_LOG first.")).toBeInstanceOf(SetupError);
		expect(new SetupError("x")).not.toBeInstanceOf(UserFacingError);
	});
});

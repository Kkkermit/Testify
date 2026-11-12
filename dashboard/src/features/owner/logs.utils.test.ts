import { errorsIn, runFrom } from "@/features/owner/logs.utils";

describe("errorsIn", () => {
	/** A stack shown as one JSON string is unreadable, so each error is pulled out to be drawn line by line. */
	it("takes each error out of the context with its stack, its own fields and what caused it", () => {
		const { errors, rest } = errorsIn({
			err: {
				name: "DiscordAPIError[50035]",
				message: "Invalid Form Body",
				stack: "DiscordAPIError[50035]: Invalid Form Body\n    at handleErrors",
				code: 50035,
				cause: { name: "Error", message: "Unknown message", stack: "Error: Unknown message\n    at clear" },
			},
			command: "clear",
			reference: "DXQV6Z",
		});

		expect(rest).toEqual({ command: "clear", reference: "DXQV6Z" });
		expect(errors).toEqual([
			{
				key: "err",
				stack: "DiscordAPIError[50035]: Invalid Form Body\n    at handleErrors",
				fields: { code: 50035 },
				cause: { key: "cause", stack: "Error: Unknown message\n    at clear", fields: {}, cause: null },
			},
		]);
	});

	it("reads an error the bot stored without a stack, and leaves a cause that is not one among the fields", () => {
		const [error] = errorsIn({ err: { name: "TypeError", message: "x is undefined", cause: "timeout" } }).errors;

		expect(error).toEqual({
			key: "err",
			stack: "TypeError: x is undefined",
			fields: { cause: "timeout" },
			cause: null,
		});
	});

	it("leaves anything that is not an error as context", () => {
		const context = { guildId: "900000000000000001", ms: 900, message: "a word", list: [{ stack: "not an error" }] };

		expect(errorsIn(context)).toEqual({ errors: [], rest: context });
	});
});

describe("runFrom", () => {
	/** The address is typed by anybody, and only an id the API would accept is ever sent to it. */
	it("keeps a run id and drops anything else", () => {
		expect(runFrom("1b2c3d4e-5f60-4718-8a9b-0c1d2e3f4a5b")).toBe("1b2c3d4e-5f60-4718-8a9b-0c1d2e3f4a5b");
		for (const raw of [null, "", "current", "../control", "1b2c3d4e-5f60-4718-8a9b-0c1d2e3f4a5b/x"]) {
			expect(runFrom(raw)).toBeNull();
		}
	});
});

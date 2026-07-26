import { signState, verifyState } from "../../src/features/integrations/services/spotifySession";
import { createMockClient } from "../helpers/context";
import { type TestifyClient } from "../../src/core/client";

function clientWithSecret(secret: string | undefined): TestifyClient {
	const client = createMockClient();
	const env = client.env as unknown as Record<string, string | undefined>;
	env.OAUTH_STATE_SECRET = secret;
	return client;
}

const SECRET = "s".repeat(40);

describe("OAuth state signing", () => {
	it("round-trips the user id", () => {
		const client = clientWithSecret(SECRET);
		expect(verifyState(client, signState(client, "user-1"))).toBe("user-1");
	});

	// Previously the callback took `state` as the Discord user ID with no
	// verification, so anyone could bind their account to someone else's ID.
	it("rejects a forged state", () => {
		const client = clientWithSecret(SECRET);
		expect(() => verifyState(client, `victim.${Date.now()}.forged-signature`)).toThrow(/verification/);
	});

	it("rejects a state signed with a different secret", () => {
		const signed = signState(clientWithSecret(SECRET), "user-1");
		expect(() => verifyState(clientWithSecret("d".repeat(40)), signed)).toThrow(/verification/);
	});

	it("rejects a malformed state", () => {
		const client = clientWithSecret(SECRET);
		expect(() => verifyState(client, "nonsense")).toThrow(/malformed/);
	});

	it("expires an old state", () => {
		const client = clientWithSecret(SECRET);
		const signed = signState(client, "user-1", Date.now() - 20 * 60 * 1_000);

		expect(() => verifyState(client, signed)).toThrow(/expired/);
	});

	it("refuses to sign without a configured secret", () => {
		expect(() => signState(clientWithSecret(undefined), "user-1")).toThrow(/OAUTH_STATE_SECRET/);
	});
});

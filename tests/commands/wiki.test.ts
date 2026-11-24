import wiki from "@commands/community/subcommands/wiki.command";
import { ServiceError, UserFacingError } from "@core/errors";
import { fetchJson } from "@lib/infra";
import { createMockClient, createMockInteraction } from "@tests/helpers/mocks";

jest.mock("@lib/infra", () => ({ ...jest.requireActual<object>("@lib/infra"), fetchJson: jest.fn() }));

const ask = (): Promise<void> | undefined =>
	wiki.run?.(createMockInteraction({ options: { query: "Rust" } }), createMockClient());

/** Every failure read as "Wikipedia has no article", so an outage told people the page did not exist. */
it("says an article is missing only when Wikipedia answers that it is", async () => {
	jest.mocked(fetchJson).mockRejectedValueOnce(new ServiceError("wikipedia", new Error("HTTP 404"), 404));
	await expect(ask()).rejects.toBeInstanceOf(UserFacingError);

	jest.mocked(fetchJson).mockRejectedValueOnce(new ServiceError("wikipedia", new Error("HTTP 503"), 503));
	await expect(ask()).rejects.toBeInstanceOf(ServiceError);
});

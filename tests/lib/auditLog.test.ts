import { type TestifyClient } from "@core/client";
import { AUDIT_EVENTS, writeAuditLog } from "@lib/auditLog.util";
import { createMockClient, createMockGuild } from "@tests/helpers/mocks";

jest.mock("@database/repositories/settingsRepository", () => ({ getAuditLogConfig: jest.fn() }));

const { getAuditLogConfig } = jest.requireMock("@database/repositories/settingsRepository");

type SendMock = jest.Mock<Promise<unknown>, [{ embeds: { toJSON(): Record<string, unknown> }[] }]>;

function clientWith(send: SendMock, channel: Record<string, unknown> | null = null): TestifyClient {
	return createMockClient({
		logger: { warn: jest.fn() },
		channels: {
			fetch: jest.fn(() => Promise.resolve(channel ?? { isTextBased: () => true, isSendable: () => true, send })),
		},
	} as never);
}

const entry = { event: "messageDelete", title: "Message deleted" } as const;

describe("AUDIT_EVENTS", () => {
	it("has no duplicates", () => {
		expect(new Set(AUDIT_EVENTS).size).toBe(AUDIT_EVENTS.length);
	});

	/** The list feeds a Discord choice list, which caps at 25. */
	it("fits in a Discord choice list", () => {
		expect(AUDIT_EVENTS.length).toBeLessThanOrEqual(25);
	});
});

describe("writeAuditLog", () => {
	it("stays silent when the guild has not opted in", async () => {
		const send: SendMock = jest.fn();
		getAuditLogConfig.mockResolvedValue(null);

		await writeAuditLog(clientWith(send), createMockGuild(), entry);

		expect(send).not.toHaveBeenCalled();
	});

	it("posts when the specific event is enabled", async () => {
		const send: SendMock = jest.fn((_payload) => Promise.resolve({}));
		getAuditLogConfig.mockResolvedValue({ channelId: "1", enabledLogs: ["messageDelete"] });

		await writeAuditLog(clientWith(send), createMockGuild(), entry);

		expect(send).toHaveBeenCalled();
	});

	it('posts when the guild opted into "all"', async () => {
		const send: SendMock = jest.fn((_payload) => Promise.resolve({}));
		getAuditLogConfig.mockResolvedValue({ channelId: "1", enabledLogs: ["all"] });

		await writeAuditLog(clientWith(send), createMockGuild(), entry);

		expect(send).toHaveBeenCalled();
	});

	it("stays silent for an event the guild did not enable", async () => {
		const send: SendMock = jest.fn();
		getAuditLogConfig.mockResolvedValue({ channelId: "1", enabledLogs: ["roleCreate"] });

		await writeAuditLog(clientWith(send), createMockGuild(), entry);

		expect(send).not.toHaveBeenCalled();
	});

	it("footers the embed with the event name, so the source is traceable", async () => {
		const send: SendMock = jest.fn((_payload) => Promise.resolve({}));
		getAuditLogConfig.mockResolvedValue({ channelId: "1", enabledLogs: ["all"] });

		await writeAuditLog(clientWith(send), createMockGuild(), entry);

		expect(JSON.stringify(send.mock.calls[0]?.[0].embeds[0]?.toJSON())).toContain("messageDelete");
	});

	it("passes description, fields and thumbnail through when given", async () => {
		const send: SendMock = jest.fn((_payload) => Promise.resolve({}));
		getAuditLogConfig.mockResolvedValue({ channelId: "1", enabledLogs: ["all"] });

		await writeAuditLog(clientWith(send), createMockGuild(), {
			...entry,
			description: "the body",
			fields: [{ name: "Author", value: "alice" }],
			thumbnail: "https://cdn.discord/x.png",
		});

		const rendered = JSON.stringify(send.mock.calls[0]?.[0].embeds[0]?.toJSON());

		expect(rendered).toContain("the body");
		expect(rendered).toContain("alice");
		expect(rendered).toContain("x.png");
	});

	it("skips a channel it cannot send to", async () => {
		const send: SendMock = jest.fn();
		getAuditLogConfig.mockResolvedValue({ channelId: "1", enabledLogs: ["all"] });

		await writeAuditLog(
			clientWith(send, { isTextBased: () => true, isSendable: () => false, send }),
			createMockGuild(),
			entry,
		);

		expect(send).not.toHaveBeenCalled();
	});

	/** Audit logging is a side effect; it must never take the originating action down. */
	it("warns rather than throwing when the lookup fails", async () => {
		getAuditLogConfig.mockRejectedValue(new Error("mongo down"));
		const client = clientWith(jest.fn() as SendMock);

		await expect(writeAuditLog(client, createMockGuild(), entry)).resolves.toBeUndefined();
		expect(client.logger.warn).toHaveBeenCalled();
	});

	it("survives a channel that no longer exists", async () => {
		getAuditLogConfig.mockResolvedValue({ channelId: "1", enabledLogs: ["all"] });
		const client = createMockClient({
			logger: { warn: jest.fn() },
			channels: { fetch: jest.fn(() => Promise.reject(new Error("Unknown Channel"))) },
		} as never);

		await expect(writeAuditLog(client, createMockGuild(), entry)).resolves.toBeUndefined();
	});
});

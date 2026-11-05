import { type Guild, type User } from "discord.js";
import { recordAudit } from "@database/repositories/dashboardAuditRepository";
import { SETTING_READERS } from "@lib/settings/settingsReaders.util";
import { describeChange, recordingChanges, recordsSettings } from "@lib/settings/settingsRecord.util";
import { RESTORABLE, type RestorableAction, restoreOf } from "@testify/shared";

jest.mock("@database/repositories/dashboardAuditRepository", () => ({ recordAudit: jest.fn(() => Promise.resolve()) }));
jest.mock("@lib/settings/settingsReaders.util", () => ({ SETTING_READERS: {} }));

const stored: Record<string, unknown> = {};
const readers = SETTING_READERS as Record<string, (guild: Guild) => Promise<unknown>>;
readers["starboard.update"] = jest.fn(() => Promise.resolve({ ...(stored.starboard as object) }));
readers["settings.prefix"] = jest.fn(() => Promise.resolve({ prefix: { ...(stored.prefix as object) } }));

const error = jest.fn();
const guild = { id: "900000000000000001", client: { logger: { error } } } as unknown as Guild;
const user = { id: "100000000000000002", username: "kate" } as User;

beforeEach(() => {
	stored.starboard = { enabled: false, channelId: "1", threshold: 3, selfStar: false };
	stored.prefix = { prefix: "t?", enabled: true };
	jest.mocked(recordAudit).mockClear();
	error.mockClear();
});

describe("describeChange", () => {
	it("words a switch as one, and names every other field that changed", () => {
		expect(describeChange("starboard.update", { enabled: false }, { enabled: true })).toBe("Turned the starboard on");
		expect(describeChange("lottery.update", { frozen: false }, { frozen: true })).toBe("Froze the lottery");
		expect(
			describeChange(
				"raid.update",
				{ enabled: false, minAccountAgeDays: 0, spikeJoins: 5 },
				{ enabled: true, minAccountAgeDays: 3, spikeJoins: 8 },
			),
		).toBe("Turned raid protection on, changed the minimum account age and joins for a spike for raid protection");
		expect(describeChange("starboard.update", { threshold: 3 }, { threshold: 3 })).toBeNull();
	});

	/** A field with no words would show its code name, such as `lobbyChannelId`, on the Changes page. */
	it("has words for every field of every setting it can be asked about", () => {
		const unworded: string[] = [];
		for (const [action, entry] of Object.entries(RESTORABLE)) {
			for (const field of entry.fields) {
				const summary = describeChange(action as RestorableAction, { [field]: 1 }, { [field]: 2 });
				if (summary === null || (/[A-Z]/.test(field) && summary.includes(field))) unworded.push(`${action}.${field}`);
			}
		}
		expect(unworded).toEqual([]);
	});
});

describe("recordingChanges", () => {
	it("records what a command changed, as the person who ran it, in a form the dashboard can put back", async () => {
		const run = recordingChanges(["starboard.update", "settings.prefix"], () => {
			stored.starboard = { ...(stored.starboard as object), enabled: true, threshold: 5 };
			return Promise.resolve();
		});

		await run({ guild, user });

		expect(recordAudit).toHaveBeenCalledTimes(1);
		const entry = jest.mocked(recordAudit).mock.calls[0]![0];
		expect(entry).toMatchObject({
			actorId: user.id,
			actorTag: "kate",
			guildId: guild.id,
			action: "starboard.update",
			source: "command",
			summary: "Turned the starboard on, changed the stars needed for the starboard",
		});
		expect(restoreOf(entry.action, entry.before, entry.after)?.put).toEqual({ enabled: false, threshold: 3 });
	});

	it("records nothing when nothing changed, or outside a server", async () => {
		await recordingChanges(["starboard.update"], () => Promise.resolve())({ guild, user });
		await recordingChanges(["starboard.update"], () => {
			stored.starboard = { enabled: true };
			return Promise.resolve();
		})({ guild: null, user });

		expect(recordAudit).not.toHaveBeenCalled();
	});

	/** The change happened before the reply failed, so it is recorded and the failure still reaches the user. */
	it("records a change even when the run fails after making it", async () => {
		const run = recordingChanges(["settings.prefix"], () => {
			stored.prefix = { prefix: "!", enabled: true };
			return Promise.reject(new Error("reply failed"));
		});

		await expect(run({ guild, user })).rejects.toThrow("reply failed");
		expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "settings.prefix" }));
	});

	/** A reader that throws rather than rejecting once kept the press itself from running. */
	it("runs the change even when a setting cannot be read at all", async () => {
		const run = jest.fn(() => Promise.resolve());

		await recordingChanges(["welcome.update"], run)({ guild, user });

		expect(run).toHaveBeenCalledTimes(1);
		expect(recordAudit).not.toHaveBeenCalled();
	});

	it("never fails the change over the record", async () => {
		jest.mocked(recordAudit).mockRejectedValueOnce(new Error("database down"));

		await recordingChanges(["settings.prefix"], () => {
			stored.prefix = { prefix: "!", enabled: false };
			return Promise.resolve();
		})({ guild, user });

		expect(error).toHaveBeenCalledTimes(1);
	});

	it("wraps a command's own run and each of its subcommands'", async () => {
		const definition = recordsSettings(["settings.prefix"], {
			name: "x",
			subcommands: [
				{
					name: "y",
					run: (_interaction: unknown) => {
						stored.prefix = { prefix: "?", enabled: true };
						return Promise.resolve();
					},
				},
			],
		});

		await definition.subcommands[0]!.run({ guild, user });

		expect(recordAudit).toHaveBeenCalledTimes(1);
	});
});

import scheduleJobs from "@events/ready/scheduleJobs.event";
import { BOT_FEATURE_KEYS, BOT_FEATURES, switchedOff } from "@testify/shared";
import { createMockClient } from "@tests/helpers/mocks";

jest.mock("@lib/bot", () => ({
	...jest.requireActual<object>("@lib/bot"),
	startEventLoopMonitor: jest.fn(),
	watchDiscordApi: jest.fn(),
}));

function scheduled(off: ReturnType<typeof switchedOff>["off"]): string[] {
	const client = createMockClient({ featuresOff: off });
	void scheduleJobs.run(client, client as never);
	const { every, after } = client.timers as unknown as { every: jest.Mock; after: jest.Mock };
	return [...every.mock.calls, ...after.mock.calls].map(([name]) => String(name));
}

const declared = BOT_FEATURE_KEYS.flatMap((feature) => BOT_FEATURES[feature].jobs ?? []);

/** A job left running for a switched-off feature still pays out, draws and posts, on a bot that says it does none of it. */
it("schedules every declared job, and none a switched-off feature owns", () => {
	const all = scheduled(switchedOff([]).off);
	const none = scheduled(switchedOff([...BOT_FEATURE_KEYS]).off);

	expect(declared.filter((name) => !all.includes(name))).toEqual([]);
	expect(none.filter((name) => declared.includes(name))).toEqual([]);
	expect(none).toEqual(all.filter((name) => !declared.includes(name)));
});

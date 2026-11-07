import commandList from "@repo/docs/commands.md?raw";
import { switchedOff } from "@testify/shared";
import { withoutSwitchedOff } from "@/features/docs/commandList.utils";

const badge = (markdown: string, label: string): number =>
	Number(new RegExp(`!\\[${label}: (\\d+)\\]`).exec(markdown)?.[1] ?? Number.NaN);

describe("the command list with features switched off", () => {
	it("is the generated file itself while every feature is on", () => {
		expect(withoutSwitchedOff(commandList, switchedOff([]).off)).toBe(commandList);
	});

	/** The page is read on a bot without music, so it must not list `/play` or count it. */
	it("drops a switched-off category whole, with its summary line, and lowers the counts", () => {
		const trimmed = withoutSwitchedOff(commandList, switchedOff(["music"]).off);

		expect(trimmed).not.toContain("## 🎵 Music");
		expect(trimmed).not.toContain("[🎵 Music]");
		expect(trimmed).not.toContain("`/play`");
		expect(badge(trimmed, "commands")).toBe(badge(commandList, "commands") - 2);
		expect(trimmed).toContain("## 💰 Economy");
	});

	it("keeps a shared command with only the subcommands still on, and drops a right-click action that is off", () => {
		const trimmed = withoutSwitchedOff(commandList, switchedOff(["economy", "modmail"]).off);
		const leaderboard = trimmed.split("\n").find((line) => line.startsWith("| `/leaderboard`")) ?? "";

		expect(leaderboard).toContain("`levels`");
		expect(leaderboard).not.toContain("`economy`");
		expect(trimmed).not.toContain("**Report message**");
		expect(trimmed).toContain("**Warn**");
		expect(trimmed).not.toContain("`/balance`");
		expect(badge(trimmed, "subcommands")).toBeLessThan(badge(commandList, "subcommands"));
	});
});

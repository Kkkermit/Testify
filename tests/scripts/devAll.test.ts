import { type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BOT_WATCH, prefixLines, stopTree, syncedFolderRead } from "../../scripts/devAll";

/** How a child's output is prefixed; the Windows interrupt behaviour itself needs a Windows terminal. */

describe("prefixing a child's output", () => {
	it("labels every line", () => {
		expect(prefixLines("bot", "one\ntwo\n")).toBe("[bot] one\n[bot] two\n");
	});

	/** A chunk can split mid-line, and a prefix in the middle of a sentence is worse than none. */
	it("labels a trailing partial line without inventing a newline", () => {
		expect(prefixLines("web", "ready in ")).toBe("[web] ready in ");
	});

	it("leaves a blank chunk alone", () => {
		expect(prefixLines("bot", "")).toBe("");
	});

	it("keeps blank lines inside a chunk", () => {
		expect(prefixLines("bot", "one\n\ntwo\n")).toBe("[bot] one\n[bot] \n[bot] two\n");
	});
});

describe("stopping a child", () => {
	function fake(overrides: Partial<ChildProcess> = {}): ChildProcess {
		return { pid: 1234, exitCode: null, signalCode: null, kill: jest.fn(), ...overrides } as unknown as ChildProcess;
	}

	/** Signalling a pid that has been reused by the operating system would kill somebody else's process. */
	it("does nothing for a child that already exited", () => {
		const child = fake({ exitCode: 0 });
		stopTree(child);

		expect(child.kill).not.toHaveBeenCalled();
	});

	it("does nothing for a child already killed by a signal", () => {
		const child = fake({ signalCode: "SIGTERM" });
		stopTree(child);

		expect(child.kill).not.toHaveBeenCalled();
	});

	it("does nothing for a child that never started", () => {
		const child = fake({ pid: undefined });
		stopTree(child);

		expect(child.kill).not.toHaveBeenCalled();
	});

	/** The whole process group is signalled, since the real work runs in a grandchild. */
	it("signals the whole process group, and falls back to the child when there is none", () => {
		// Pinned, because on Windows the real branch runs `taskkill` against pid 1234, whatever that is there.
		const platform = Object.getOwnPropertyDescriptor(process, "platform") ?? { value: process.platform };
		Object.defineProperty(process, "platform", { ...platform, value: "linux" });
		const killSpy = jest.spyOn(process, "kill").mockImplementation(() => {
			throw new Error("ESRCH");
		});
		const child = fake();

		try {
			stopTree(child);
		} finally {
			Object.defineProperty(process, "platform", platform);
		}

		expect(killSpy).toHaveBeenCalledWith(-1234, "SIGTERM");
		expect(child.kill).toHaveBeenCalledWith("SIGTERM");
		killSpy.mockRestore();
	});
});

describe("watching the bot", () => {
	/**
	 * The dev bot read shared's build: a branch switch under a running dev:all crashed it on an export the build lacked,
	 * and rebuilding it at start restarted the bot a second in, because macOS reported the write.
	 */
	it("runs shared from its source, the same way in npm run dev and dev:all", () => {
		const read = (path: string): unknown => JSON.parse(readFileSync(resolve(__dirname, "../..", path), "utf8"));
		const { scripts } = read("package.json") as { scripts: Record<string, string> };
		const { exports } = read("shared/package.json") as { exports: Record<string, Record<string, string>> };

		expect(BOT_WATCH).toContain("--conditions=development");
		expect(exports["."]?.["development"]).toBe("./src/index.ts");
		expect(scripts["dev"]).toContain(`tsx ${BOT_WATCH.join(" ")}`);
	});

	/** A project on an iCloud-synced Desktop crashed on every restart with nothing to say why. */
	it("recognises the read macOS cancels in a synced folder, and nothing else", () => {
		const cancelled = "Error: ECANCELED: operation canceled, read\n    at Object.readFileSync (node:fs:440:20)";

		expect([syncedFolderRead(cancelled), syncedFolderRead("Error: ENOENT: no such file or directory")]).toEqual([
			true,
			false,
		]);
	});
});

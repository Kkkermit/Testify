import { type ChildProcess } from "node:child_process";
import { prefixLines, stopTree } from "../../scripts/devAll";

/**
 * The supervisor exists because `concurrently` spawns every command through a shell — `cmd.exe /s /c` on
 * Windows — and each of those batch layers stops to ask "Terminate batch job (Y/N)?" when the console is
 * interrupted. Two children meant two prompts. These pin the parts that can be tested without spawning
 * anything; the Windows behaviour itself needs a Windows terminal.
 */

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

	/**
	 * The group, not the child: `tsx watch` runs the bot in a grandchild and the web half runs Vite in one, so
	 * signalling only what we hold leaves the process actually holding the port alive.
	 */
	it("signals the whole process group, and falls back to the child when there is none", () => {
		const killSpy = jest.spyOn(process, "kill").mockImplementation(() => {
			throw new Error("ESRCH");
		});
		const child = fake();

		stopTree(child);

		expect(killSpy).toHaveBeenCalledWith(-1234, "SIGTERM");
		expect(child.kill).toHaveBeenCalledWith("SIGTERM");
		killSpy.mockRestore();
	});
});

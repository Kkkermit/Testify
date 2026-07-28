import { spawnSync } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";
import { canStreamNetwork, resolveFfmpeg } from "@lib/ffmpeg.util";

jest.mock("node:child_process", () => ({ spawnSync: jest.fn() }));

const spawn = spawnSync as jest.MockedFunction<typeof spawnSync>;

/** Only the two fields the resolver reads. */
function result(overrides: { status?: number | null; signal?: NodeJS.Signals | null } = {}) {
	return { status: 0, signal: null, ...overrides } as ReturnType<typeof spawnSync>;
}

beforeEach(() => {
	spawn.mockReset();
});

describe("canStreamNetwork", () => {
	/** The whole point: a segfault is the silent failure, and must be caught. */
	it("rejects a binary that segfaults on a hostname lookup", () => {
		spawn.mockReturnValue(result({ signal: "SIGSEGV", status: null }));
		expect(canStreamNetwork("ffmpeg")).toBe(false);
	});

	it("rejects one that reports the segfault as exit 139 instead of a signal", () => {
		spawn.mockReturnValue(result({ status: 139 }));
		expect(canStreamNetwork("ffmpeg")).toBe(false);
	});

	/** A healthy FFmpeg fails this probe — the host does not exist — but does not crash. */
	it("accepts a binary that merely cannot resolve the host", () => {
		spawn.mockReturnValue(result({ status: 1 }));
		expect(canStreamNetwork("ffmpeg")).toBe(true);
	});

	it("probes a hostname that cannot exist, so it works offline", () => {
		spawn.mockReturnValue(result({ status: 1 }));
		canStreamNetwork("ffmpeg");

		expect(spawn.mock.calls[0]?.[1]).toEqual(expect.arrayContaining([expect.stringContaining("ffmpeg.invalid")]));
	});
});

describe("resolveFfmpeg", () => {
	it("takes an explicit override without probing anything", () => {
		expect(resolveFfmpeg("/opt/ffmpeg")).toEqual({ path: "/opt/ffmpeg", source: "override" });
		expect(spawn).not.toHaveBeenCalled();
	});

	it("ignores a blank override rather than running an empty path", () => {
		spawn.mockReturnValue(result({ status: 0 }));
		expect(resolveFfmpeg("").source).not.toBe("override");
	});

	it("prefers a working system FFmpeg over the bundled one", () => {
		spawn.mockReturnValue(result({ status: 0 }));
		expect(resolveFfmpeg()).toEqual({ path: "ffmpeg", source: "system" });
	});

	it("falls back to the bundled binary when there is no system FFmpeg", () => {
		spawn
			.mockReturnValueOnce(result({ status: null, signal: null })) // no system ffmpeg
			.mockReturnValue(result({ status: 1 })); // bundled survives the probe

		expect(resolveFfmpeg()).toEqual({ path: ffmpegStatic, source: "bundled" });
	});

	/** A system FFmpeg that runs but crashes on network input is no better. */
	it("skips a system FFmpeg that segfaults on network input", () => {
		spawn
			.mockReturnValueOnce(result({ status: 0 })) // system -version succeeds
			.mockReturnValueOnce(result({ signal: "SIGSEGV" })) // but it crashes
			.mockReturnValue(result({ status: 1 })); // bundled is fine

		expect(resolveFfmpeg().source).toBe("bundled");
	});

	/**
	 * Still returns the path — music is better off attempting and logging a warning
	 * than being switched off entirely on a diagnosis that could be wrong.
	 */
	it("flags the bundled binary as degraded when it crashes, but still returns it", () => {
		spawn
			.mockReturnValueOnce(result({ status: null })) // no system ffmpeg
			.mockReturnValue(result({ signal: "SIGSEGV" })); // bundled crashes

		expect(resolveFfmpeg()).toEqual({ path: ffmpegStatic, source: "bundled", degraded: true });
	});
});

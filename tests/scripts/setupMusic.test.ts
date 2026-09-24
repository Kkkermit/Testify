import { assetFor } from "../../scripts/setupMusic";

describe("assetFor", () => {
	/** Every Linux machine was handed the x86-64 build, which cannot run on a Raspberry Pi. */
	it("picks the build for the machine's architecture", () => {
		expect(assetFor("linux", "x64")).toBe("yt-dlp_linux");
		expect(assetFor("linux", "arm64")).toBe("yt-dlp_linux_aarch64");
		expect(assetFor("win32", "x64")).toBe("yt-dlp.exe");
		expect(assetFor("win32", "arm64")).toBe("yt-dlp_arm64.exe");
		expect(assetFor("darwin", "arm64")).toBe("yt-dlp_macos");
	});

	it("says there is none rather than handing over one that will not run", () => {
		expect(assetFor("linux", "arm")).toBeNull();
		expect(assetFor("freebsd", "x64")).toBeNull();
	});
});

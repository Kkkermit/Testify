import { createApi } from "@api/server";
import { type Env } from "@config/env";
import { theme } from "@config/theme";
import { ServiceError } from "@core/errors";
import { fetchJson } from "@lib/infra/http.util";
import { type ApiErrorBody, type SiteInfo } from "@testify/shared";
import { createMockClient } from "@tests/helpers/mocks";

jest.mock("@database/connection", () => ({ databaseConnected: jest.fn(() => true) }));
jest.mock("@lib/infra/http.util", () => ({ fetchJson: jest.fn(), fetchRaw: jest.fn() }));

const COMMIT = "a".repeat(40);

function api(dashboard: boolean) {
	return createApi(createMockClient(), {
		DASHBOARD_ENABLED: dashboard,
		DASHBOARD_PORT: 3_000,
		DASHBOARD_BIND: "127.0.0.1",
	} as Env);
}

function github(repo: object | Error): void {
	jest.mocked(fetchJson).mockImplementation((_service, url, schema) => {
		const path = new URL(url).pathname.split("/").slice(4).join("/");
		const answers: Record<string, unknown> = {
			"": repo,
			"git/ref/heads/main": { object: { sha: COMMIT, type: "commit" } },
			[`git/trees/${COMMIT}`]: { truncated: false, tree: [{ path: "README.md", type: "blob", size: 10 }] },
		};
		const answer = answers[path];
		if (answer instanceof Error) return Promise.reject(answer);
		if (answer === undefined) return Promise.reject(new ServiceError("GitHub", new Error("HTTP 404"), 404));
		return Promise.resolve(schema.parse(answer));
	});
}

const repo = (isPrivate = false) => ({
	html_url: theme.repository,
	full_name: "owner/bot",
	description: null,
	private: isPrivate,
	stargazers_count: 1,
	forks_count: 2,
	subscribers_count: 3,
	open_issues_count: 4,
	license: null,
	default_branch: "main",
	pushed_at: null,
});

async function error(response: Response): Promise<{ status: number; code: string }> {
	return { status: response.status, code: ((await response.json()) as ApiErrorBody).error.code };
}

beforeEach(() => jest.clearAllMocks());

describe("GET /api/site", () => {
	/** With the dashboard off the site still answers, and its sign-in button is hidden rather than leading to a refusal. */
	it("says whether the dashboard is on, without a session", async () => {
		const off = (await (await api(false).request("/api/site")).json()) as SiteInfo;
		const on = (await (await api(true).request("/api/site")).json()) as SiteInfo;

		expect(off).toMatchObject({ dashboard: false, repository: theme.repository });
		expect(on.dashboard).toBe(true);
	});
});

describe("the source browser's routes", () => {
	it("answers the repository's standing", async () => {
		github(repo());

		const response = await api(false).request("/api/site/repository");

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ stars: 1, forks: 2, watchers: 3, openIssues: 4, ref: "main" });
	});

	it("refuses a private repository's code by name, and an unlisted file as missing", async () => {
		github(repo(true));
		expect(await error(await api(false).request("/api/site/tree"))).toEqual({
			status: 403,
			code: "private_repository",
		});

		github(repo());
		expect(await error(await api(false).request("/api/site/file?path=src/secret.ts"))).toEqual({
			status: 404,
			code: "unknown_file",
		});
	});

	/** A path is checked before anything is asked of GitHub, so it cannot climb out of the repository. */
	it("refuses a path that climbs, before GitHub is asked", async () => {
		for (const path of ["../.env", "/etc/passwd", "src//index.ts", "a/./b"]) {
			const response = await api(false).request(`/api/site/file?path=${encodeURIComponent(path)}`);
			expect(response.status).toBe(400);
		}
		expect(fetchJson).not.toHaveBeenCalled();
	});

	/** GitHub having a bad hour is a retry for the reader, never a 500 logged as the bot's bug. */
	it("answers GitHub's failure as a 502 and logs it as GitHub's", async () => {
		const client = createMockClient();
		const warn = jest.spyOn(client.logger, "warn");
		const error500 = new ServiceError("GitHub", new Error("HTTP 503"), 503);
		github(error500);

		const app = createApi(client, { DASHBOARD_PORT: 3_000, DASHBOARD_BIND: "127.0.0.1" } as Env);
		const response = await app.request("/api/site/repository");

		expect(await error(response)).toEqual({ status: 502, code: "github_unreachable" });
		expect(warn).toHaveBeenCalledWith(expect.objectContaining({ service: "GitHub", status: 503 }), expect.any(String));
	});
});

import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { type ApiProblem, forbidden, notFound, UpstreamProblem } from "@api/errors";
import { parseQuery } from "@api/validate";
import { theme } from "@config/theme";
import { ServiceError } from "@core/errors";
import { botVersion } from "@lib/bot";
import { type GitHubReader, SiteProblem, type SiteRefusal } from "@lib/site";
import { type SiteInfo, sourceFileQuery } from "@testify/shared";

/** Unauthenticated: the landing page, the docs and the source browser, which are read before any sign-in exists. */

const REFUSALS: Record<SiteRefusal, () => ApiProblem> = {
	no_repository: () => notFound("no_repository", "This bot's code is not in a GitHub repository this page can read."),
	private_repository: () =>
		forbidden("private_repository", "The repository is private, so its code is not shown here."),
	unknown_file: () => notFound("unknown_file", "There is no such file in this release."),
};

/** GitHub's answer becomes a refusal or a retry, never a 500 that reads like a bug in the bot. */
async function fromGitHub<T>(task: () => Promise<T>): Promise<T> {
	try {
		return await task();
	} catch (error) {
		if (error instanceof SiteProblem) throw REFUSALS[error.reason]();
		if (error instanceof ServiceError) {
			const status = error.status ?? 0;
			const limited = status === 403 || status === 429;
			throw new UpstreamProblem(
				status,
				limited
					? "GitHub is limiting how often it is asked. Try again later."
					: "GitHub did not answer. Try again in a moment.",
				"GitHub",
			);
		}
		throw error;
	}
}

export function siteRoutes(github: GitHubReader): Hono<ApiBindings> {
	return new Hono<ApiBindings>()
		.get("/", (context) => {
			const body: SiteInfo = {
				dashboard: context.get("env").DASHBOARD_ENABLED,
				repository: theme.repository,
				version: botVersion(),
			};
			return context.json(body);
		})
		.get("/repository", async (context) => context.json(await fromGitHub(() => github.standing())))
		.get("/traffic", async (context) => context.json(await fromGitHub(() => github.traffic())))
		.get("/tree", async (context) => context.json(await fromGitHub(() => github.tree())))
		.get("/file", async (context) => {
			const { path } = parseQuery(context, sourceFileQuery);
			return context.json(await fromGitHub(() => github.file(path)));
		});
}

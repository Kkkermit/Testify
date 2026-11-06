import { isValidElement } from "react";
import { type RouteObject } from "react-router";
import { RequireAuth } from "@/app/RequireAuth";
import { routes } from "@/routes";

/** Which pages open without signing in, read from the real route tree so a page moved behind the gate is noticed. */
function signedOutPaths(tree: readonly RouteObject[], gated = false): string[] {
	return tree.flatMap((route) => {
		const behind = gated || (isValidElement(route.element) && route.element.type === RequireAuth);
		const own = route.path !== undefined && !behind ? [route.path] : [];
		return [...own, ...signedOutPaths(route.children ?? [], behind)];
	});
}

describe("the pages outside the sign-in gate", () => {
	/** The status page names no server and no member, so a host's users can check on the bot without an account. */
	it("are the website's, the legal pages, appearance and status", () => {
		expect(signedOutPaths(routes).sort()).toEqual(
			[
				"*",
				"/",
				"/appearance",
				"/docs",
				"/docs/:slug",
				"/docs/guides/:articleId",
				"/privacy",
				"/sign-in",
				"/source-code/*",
				"/status",
				"/terms",
			].sort(),
		);
	});
});

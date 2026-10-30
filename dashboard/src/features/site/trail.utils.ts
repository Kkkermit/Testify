import { type TFunction } from "i18next";
import { docPage } from "@/features/docs/docs.pages";
import { nameOf } from "@/features/source/source.utils";

/** The name of the page a trail leads back to, as the reader saw it named there. */
export function trailLabel(pathname: string, t: TFunction): string {
	const source = /^\/source-code\/?(.*)$/.exec(pathname);
	if (source !== null) {
		const path = decoded(source[1] ?? "").replace(/\/+$/, "");
		return path === "" ? t("source.title") : nameOf(path);
	}

	// A help article is named by its guide page, because its own title arrives with the article.
	const page = docPage(/^\/docs\/([^/]+)/.exec(pathname)?.[1]);
	return page === undefined ? t("docs.title") : t(page.titleKey);
}

function decoded(path: string): string {
	try {
		return decodeURIComponent(path);
	} catch {
		return path;
	}
}

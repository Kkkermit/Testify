import { type TFunction } from "i18next";
import { docPage } from "@/features/docs/docs.pages";
import { nameOf } from "@/features/source/source.utils";

export function trailLabel(pathname: string, t: TFunction): string {
	const source = /^\/source-code\/?(.*)$/.exec(pathname);
	if (source !== null) {
		const path = decoded(source[1] ?? "").replace(/\/+$/, "");
		return path === "" ? t("source.title") : nameOf(path);
	}

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

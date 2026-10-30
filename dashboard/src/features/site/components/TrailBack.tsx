import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { BackLink } from "@/components/primitives";
import { trailLabel } from "@/features/site/trail.utils";
import { trailFor } from "@/lib/trail";

/** "Back to …" on a page reached by a docs or source link; `fallback` stands in where the page was opened some other way. */
export function TrailBack({ fallback = null }: { fallback?: ReactNode }): ReactNode {
	const { t } = useTranslation();
	const { key } = useLocation();
	const navigate = useNavigate();
	const trail = trailFor(key);

	if (trail === null) return fallback;

	return (
		<BackLink
			to={`${trail.pathname}${trail.search}${trail.hash}`}
			onClick={(event) => {
				// A modified click opens the page afresh, as any link would.
				if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
				// Back through history rather than forward to the address, so the page opens where it was being read.
				event.preventDefault();
				void navigate(-1);
			}}
		>
			{t("site.backTo", { page: trailLabel(trail.pathname, t) })}
		</BackLink>
	);
}

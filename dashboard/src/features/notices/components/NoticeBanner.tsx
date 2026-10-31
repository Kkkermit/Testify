import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { useNoticeFeed } from "@/features/notices/useNotices";
import { cn } from "@/lib/cn";

export const NOTIFICATIONS_PATH = "/notifications";

/** Shown on every screen while anything is unread, and never on the page that reads them. */
export function NoticeBanner(): React.JSX.Element | null {
	const { t } = useTranslation();
	const { pathname } = useLocation();
	const feed = useNoticeFeed();
	const unread = feed.data?.unread ?? 0;

	if (unread === 0 || pathname === NOTIFICATIONS_PATH) return null;

	return (
		<aside
			aria-label={t("notices.bannerLabel")}
			className="border-primary/40 bg-primary/10 rounded-card flex flex-wrap items-center gap-x-3 gap-y-1 border px-6 py-3"
		>
			<Bell size={16} className="text-primary shrink-0" aria-hidden="true" />
			<p className="text-sm">{t("notices.banner", { count: unread })}</p>
			<Link to={NOTIFICATIONS_PATH} className={cn(INLINE_TARGET, "text-primary text-sm font-medium underline")}>
				{t("notices.open")}
			</Link>
		</aside>
	);
}

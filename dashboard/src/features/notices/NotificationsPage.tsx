import { BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { useMe } from "@/features/auth/useMe";
import { NoticeCard } from "@/features/notices/components/NoticeCard";
import { newNoticeIds } from "@/features/notices/notices.utils";
import { useMarkNoticesSeen, useNoticeFeed } from "@/features/notices/useNotices";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";

/** Opening the page is reading them, so it marks them read once they are on screen. */
export function NotificationsPage(): React.JSX.Element {
	const { t } = useTranslation();
	usePageTitle(t("notices.title"));

	const feed = useNoticeFeed();
	const seen = useMarkNoticesSeen();
	// Held from the first answer, so marking them read does not take the "New" badges away while they are read.
	const [fresh, setFresh] = useState<Set<string> | null>(null);
	const { mutate } = seen;

	useEffect(() => {
		if (feed.data === undefined || fresh !== null) return;
		setFresh(newNoticeIds(feed.data.notices, feed.data.unread));
		if (feed.data.unread > 0) mutate();
	}, [feed.data, fresh, mutate]);

	const me = useMe();
	// A pointer for the owners only; the console behind it is what refuses everybody else.
	const manage =
		me.data?.isOwner === true ? (
			<Link to="/owner?tab=notifications" className={cn(INLINE_TARGET, "text-accent hover:text-foreground text-sm")}>
				{t("notices.manage")}
			</Link>
		) : undefined;
	const header = <PageHeader title={t("notices.title")} subtitle={t("notices.subtitle")} action={manage} />;

	if (feed.isError) {
		return (
			<>
				{header}
				<ErrorState as="h2" error={feed.error} onRetry={() => void feed.refetch()} />
			</>
		);
	}
	if (feed.data === undefined) {
		return (
			<>
				{header}
				<Skeleton className="h-40 w-full" />
			</>
		);
	}

	return (
		<>
			{header}
			{feed.data.notices.length === 0 ? (
				<Card>
					<EmptyState
						icon={<BellOff size={20} aria-hidden="true" />}
						title={t("notices.none")}
						body={t("notices.noneBody")}
					/>
				</Card>
			) : (
				<ul className="flex flex-col gap-4">
					{feed.data.notices.map((notice) => (
						<li key={notice.id}>
							<NoticeCard notice={notice} isNew={fresh?.has(notice.id) === true} />
						</li>
					))}
				</ul>
			)}
		</>
	);
}

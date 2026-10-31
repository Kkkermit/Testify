import { BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/primitives";
import { NoticeCard } from "@/features/notices/components/NoticeCard";
import { newNoticeIds } from "@/features/notices/notices.utils";
import { useMarkNoticesSeen, useNoticeFeed } from "@/features/notices/useNotices";
import { usePageTitle } from "@/hooks/usePageTitle";

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

	const header = <PageHeader title={t("notices.title")} subtitle={t("notices.subtitle")} />;

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

import { inboxCount } from "@testify/shared";
import { Inbox } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { HoverChevron } from "@/components/primitives";
import { inboxSummary } from "@/features/inbox/inbox.utils";
import { useInbox } from "@/features/inbox/useInbox";

export function InboxLine({ guildId }: { guildId: string }): React.JSX.Element | null {
	const { t } = useTranslation();
	const inbox = useInbox(guildId);
	if (inbox.data === undefined || inboxCount(inbox.data) === 0) return null;

	return (
		<Link
			to={`/guilds/${guildId}/inbox`}
			className="bg-card border-border rounded-card hover:bg-muted/60 group flex items-center gap-3 border px-4 py-3 transition-colors duration-150"
		>
			<Inbox size={18} aria-hidden="true" className="text-accent shrink-0" />
			<span className="min-w-0 flex-1">
				<span className="font-medium">{inboxSummary(inbox.data, t)}</span>{" "}
				<span className="text-muted-foreground">{t("inbox.open")}</span>
			</span>
			<HoverChevron />
		</Link>
	);
}

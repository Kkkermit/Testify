import { inviteUrl, type ManageableGuild } from "@testify/shared";
import { ChevronRight, Lock, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Card, cardClass, Avatar, Tooltip } from "@/components/primitives";
import { type GuildGroupKey } from "@/features/guilds/guilds.utils";

export function GuildCard({
	guild,
	group,
	clientId,
}: {
	guild: ManageableGuild;
	group: GuildGroupKey;
	clientId: string | undefined;
}): React.JSX.Element {
	const { t } = useTranslation();
	const body = (
		<>
			<Avatar name={guild.name} url={guild.iconUrl} seed={guild.id} />
			<span className="min-w-0 flex-1">
				<span className="block truncate font-medium">{guild.name}</span>
				<span className="text-muted-foreground block text-xs tabular-nums">
					{guild.memberCount === null ? t("guilds.notHereYet") : t("common.memberCount", { count: guild.memberCount })}
				</span>
			</span>
		</>
	);

	const surface = "flex items-center gap-3 transition-colors duration-150";

	if (group === "configurable") {
		return (
			<Link to={`/guilds/${guild.id}`} className={cardClass("compact", surface, "hover:border-input group")}>
				{body}
				<ChevronRight
					size={16}
					aria-hidden="true"
					className="text-muted-foreground shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
				/>
			</Link>
		);
	}

	// An anchor rather than a Link: the invite is Discord's own consent screen, not a route in this app.
	if (group === "invitable" && clientId !== undefined) {
		return (
			<a
				href={inviteUrl(clientId, guild.id)}
				target="_blank"
				rel="noreferrer"
				className={cardClass("compact", surface, "hover:border-primary group")}
			>
				{body}
				<span className="text-accent flex shrink-0 items-center gap-2 text-sm font-medium">
					<Plus size={15} aria-hidden="true" />
					{t("guilds.add")}
				</span>
			</a>
		);
	}

	return (
		<Card padding="compact" className={`${surface} opacity-70`}>
			{body}
			<Tooltip label={t("guilds.noPermissionHint")}>
				<span tabIndex={0} className="text-muted-foreground flex shrink-0 items-center gap-2 rounded-full text-xs">
					<Lock size={14} aria-hidden="true" />
					{t("guilds.noPermission")}
				</span>
			</Tooltip>
		</Card>
	);
}

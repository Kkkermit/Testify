import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Warning } from "@/components/form";
import { DividedList, HoverChevron, PageHeader, SectionHeading, Skeleton, Summary } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useRoles } from "@/features/levelling/useLevelling";
import { roleSummary, USE_SCREENS, useText } from "@/features/roles/roles.utils";
import { useRoleUses } from "@/features/roles/useRoleUses";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";

export function RolePage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "", roleId = "" } = useParams();
	const overview = useGuildOverview(guildId);
	const roles = useRoles(guildId);
	const uses = useRoleUses(guildId);

	const role = roles.data?.find((entry) => entry.id === roleId);
	const name = role?.name ?? t("roles.deletedRole");
	usePageTitle(name, overview.data?.name);

	if (roles.isError) return <ErrorState error={roles.error} onRetry={() => void roles.refetch()} />;
	if (uses.isError) return <ErrorState error={uses.error} onRetry={() => void uses.refetch()} />;
	if (roles.data === undefined || uses.data === undefined) return <Skeleton className="h-96 w-full" />;

	const list = uses.data.uses[roleId] ?? [];

	return (
		<>
			<PageHeader server={overview.data} title={name} />

			<Link
				to={`/guilds/${guildId}/roles`}
				className={cn(INLINE_TARGET, "text-muted-foreground hover:text-foreground -mt-3 w-fit gap-1 text-sm")}
			>
				<ArrowLeft size={16} aria-hidden="true" /> {t("roles.list")}
			</Link>

			{/* A role already deleted cannot be stopped by deleting it, so it gets the warning instead of the sentence. */}
			{role === undefined && list.length > 0 ? (
				<Warning>{t("roles.roleGone")}</Warning>
			) : (
				<Summary>{roleSummary(list, t)}</Summary>
			)}

			{list.length > 0 && (
				<section aria-labelledby="role-uses" className="flex flex-col gap-3">
					<SectionHeading as="h2" id="role-uses" count={list.length}>
						{t("roles.uses")}
					</SectionHeading>
					<DividedList className="bg-card">
						{list.map((use, index) => {
							const screen = USE_SCREENS[use.kind];
							return (
								<li key={`${use.kind}:${String(index)}`}>
									<Link
										to={`/guilds/${guildId}${screen.path}`}
										className="hover:bg-muted/60 group flex items-center gap-3 px-4 py-3 transition-colors duration-150"
									>
										<span className="min-w-0 flex-1">
											<span className="block font-medium break-words">{useText(use, t)}</span>
											<span className="text-muted-foreground block text-sm">{t(screen.labelKey)}</span>
										</span>
										<HoverChevron />
									</Link>
								</li>
							);
						})}
					</DividedList>
				</section>
			)}
		</>
	);
}

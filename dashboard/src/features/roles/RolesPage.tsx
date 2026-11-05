import { type RoleUse } from "@testify/shared";
import { Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { RoleSwatch } from "@/components/form/RoleSwatch";
import {
	Card,
	DividedList,
	EmptyState,
	HoverChevron,
	PageHeader,
	SectionHeading,
	Skeleton,
	Summary,
} from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useRoles } from "@/features/levelling/useLevelling";
import { deletedRoleIds, rolesSummary } from "@/features/roles/roles.utils";
import { useRoleUses } from "@/features/roles/useRoleUses";
import { usePageTitle } from "@/hooks/usePageTitle";

const ROW = "hover:bg-muted/60 group flex items-center gap-3 px-4 py-3 transition-colors duration-150";

export function RolesPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);
	const roles = useRoles(guildId);
	const uses = useRoleUses(guildId);

	usePageTitle(t("roles.title"), overview.data?.name);

	if (roles.isError) return <ErrorState error={roles.error} onRetry={() => void roles.refetch()} />;
	if (uses.isError) return <ErrorState error={uses.error} onRetry={() => void uses.refetch()} />;
	if (roles.data === undefined || uses.data === undefined) return <Skeleton className="h-96 w-full" />;

	const map = uses.data.uses;
	const deleted = deletedRoleIds(map, roles.data);
	const at = (roleId: string): string => `/guilds/${guildId}/roles/${roleId}`;
	const usage = (list: RoleUse[] | undefined): string =>
		(list?.length ?? 0) === 0 ? t("roles.unused") : t("roles.usedBy", { count: list?.length ?? 0 });

	return (
		<>
			<PageHeader server={overview.data} title={t("roles.title")} subtitle={t("roles.subtitle")} />
			<Summary>{rolesSummary(map, roles.data, t)}</Summary>

			{deleted.length > 0 && (
				<section aria-labelledby="roles-deleted" className="flex flex-col gap-3">
					<SectionHeading as="h2" id="roles-deleted" count={deleted.length}>
						{t("roles.deletedHeading")}
					</SectionHeading>
					<DividedList className="bg-card">
						{deleted.map((roleId) => (
							<li key={roleId}>
								<Link to={at(roleId)} className={ROW}>
									<span className="min-w-0 flex-1">
										<span className="block font-medium">{t("roles.deletedRole")}</span>
										<span className="text-muted-foreground block text-sm">{usage(map[roleId])}</span>
									</span>
									<HoverChevron />
								</Link>
							</li>
						))}
					</DividedList>
				</section>
			)}

			{roles.data.length === 0 ? (
				<Card>
					<EmptyState icon={<Shield size={28} />} title={t("roles.emptyTitle")} body={t("roles.emptyBody")} />
				</Card>
			) : (
				<section aria-labelledby="roles-every" className="flex flex-col gap-3">
					<SectionHeading as="h2" id="roles-every" count={roles.data.length}>
						{t("roles.list")}
					</SectionHeading>
					<DividedList className="bg-card">
						{roles.data.map((role) => (
							<li key={role.id}>
								<Link to={at(role.id)} className={ROW}>
									<span className="min-w-0 flex-1">
										<span className="block font-medium">
											<RoleSwatch name={role.name} colour={role.colour} />
										</span>
										<span className="text-muted-foreground block text-sm">{usage(map[role.id])}</span>
									</span>
									<HoverChevron />
								</Link>
							</li>
						))}
					</DividedList>
				</section>
			)}
		</>
	);
}

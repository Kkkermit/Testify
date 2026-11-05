import { type UseQueryResult } from "@tanstack/react-query";
import { type ChannelSummary, type FeatureStatus, type GuildOverview, type ManageableGuild } from "@testify/shared";
import { Columns3 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { CheckList, Toggle } from "@/components/form";
import { Avatar, Badge, Card, EmptyState, PageHeader, Skeleton } from "@/components/primitives";
import { featureLook } from "@/config/features";
import { useMe } from "@/features/auth/useMe";
import { permissionLabel } from "@/features/commands/permissions.labels";
import {
	chosenFrom,
	comparable,
	COMPARE_LIMITS,
	compareRows,
	missingDiffers,
	rowDiffers,
} from "@/features/compare/compare.utils";
import { useChannelLists, useOverviews } from "@/features/compare/useCompare";
import { describeDetail, featureLabel } from "@/features/guild-overview/featureStatus.labels";
import { usePageTitle } from "@/hooks/usePageTitle";
import { isRefusal } from "@/lib/api";
import { channelLabel } from "@/lib/channels";

const CELL = "border-border min-w-44 border-t px-4 py-3 text-left align-top";
const ROW_HEAD = "bg-card border-border sticky left-0 z-10 min-w-40 border-t px-4 py-3 text-left align-top font-medium";

export function ComparePage(): React.JSX.Element {
	const { t } = useTranslation();
	const me = useMe();
	const [params, setParams] = useSearchParams();
	const [onlyDifferent, setOnlyDifferent] = useState(false);

	usePageTitle(t("compare.title"));

	const candidates = comparable(me.data?.guilds ?? []);
	const chosen = chosenFrom(params.get("servers"), candidates);
	const overviews = useOverviews(chosen);
	const channels = useChannelLists(chosen);

	if (me.isPending) return <Skeleton className="h-96 w-full" />;

	if (candidates.length < 2) {
		return (
			<>
				<PageHeader title={t("compare.title")} subtitle={t("compare.subtitle")} />
				<EmptyState
					icon={<Columns3 size={28} />}
					title={t("compare.needTwoTitle")}
					body={t("compare.needTwoBody")}
					action={
						<Link to="/guilds" className="text-accent underline">
							{t("compare.toServers")}
						</Link>
					}
				/>
			</>
		);
	}

	const answered = overviews.map((query) => query.data);
	const rows = compareRows(answered).filter((row) => !onlyDifferent || rowDiffers(row.cells));
	const showMissing = !onlyDifferent || missingDiffers(answered);

	return (
		<>
			<PageHeader title={t("compare.title")} subtitle={t("compare.subtitle")} />

			<Card className="flex flex-col gap-4">
				<CheckList
					label={t("compare.choose")}
					hint={t("compare.chooseHint", { max: COMPARE_LIMITS.maxServers })}
					max={COMPARE_LIMITS.maxServers}
					value={chosen}
					items={candidates.map((guild) => ({ id: guild.id, label: <ServerName guild={guild} /> }))}
					onChange={(ids) => {
						setParams({ servers: ids.join(",") }, { replace: true });
					}}
				/>
				<Toggle label={t("compare.onlyDifferent")} checked={onlyDifferent} onChange={setOnlyDifferent} />
			</Card>

			{chosen.length < 2 ? (
				<p className="text-muted-foreground text-sm">{t("compare.chooseTwo")}</p>
			) : (
				<div className="bg-card border-border rounded-card overflow-x-auto border">
					<table className="w-full border-collapse text-sm">
						<caption className="sr-only">{t("compare.caption")}</caption>
						<thead>
							<tr>
								<th scope="col" className={`${ROW_HEAD} border-t-0`}>
									{t("compare.feature")}
								</th>
								{chosen.map((guildId, index) => (
									<th key={guildId} scope="col" className={`${CELL} border-t-0 font-medium`}>
										<ServerHead guild={candidates.find((guild) => guild.id === guildId)} query={overviews[index]} />
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => {
								const { icon: Icon, tint } = featureLook(row.key);
								return (
									<tr key={row.key}>
										<th scope="row" className={ROW_HEAD}>
											<span className="flex items-center gap-2">
												<Icon size={16} aria-hidden="true" className={tint} />
												{featureLabel(row.key, row.label, t)}
											</span>
										</th>
										{row.cells.map((cell, index) => (
											<td key={chosen[index]} className={CELL}>
												<FeatureCell
													guildId={chosen[index] ?? ""}
													featureKey={row.key}
													cell={cell}
													failed={overviews[index]?.isError === true}
													channels={channels[index]?.data}
												/>
											</td>
										))}
									</tr>
								);
							})}
							{showMissing && (
								<tr>
									<th scope="row" className={ROW_HEAD}>
										{t("compare.missing")}
									</th>
									{answered.map((overview, index) => (
										<td key={chosen[index]} className={CELL}>
											{overview === undefined ? (
												<Unknown failed={overviews[index]?.isError === true} />
											) : overview.missingPermissions.length === 0 ? (
												<span className="text-muted-foreground">{t("compare.noneMissing")}</span>
											) : (
												<span className="text-warning">
													{overview.missingPermissions
														.map((flag) => permissionLabel(flag, t))
														.join(t("common.listSeparator"))}
												</span>
											)}
										</td>
									))}
								</tr>
							)}
						</tbody>
					</table>
					{onlyDifferent && rows.length === 0 && !showMissing && (
						<p className="text-muted-foreground px-4 py-3 text-sm">{t("compare.allAlike")}</p>
					)}
				</div>
			)}
		</>
	);
}

function ServerName({ guild }: { guild: ManageableGuild }): React.JSX.Element {
	return (
		<span className="flex min-w-0 items-center gap-2">
			<Avatar name={guild.name} url={guild.iconUrl} size={20} seed={guild.id} />
			<span className="truncate">{guild.name}</span>
		</span>
	);
}

function ServerHead({
	guild,
	query,
}: {
	guild: ManageableGuild | undefined;
	query: UseQueryResult<GuildOverview> | undefined;
}): React.JSX.Element {
	const { t } = useTranslation();
	if (guild === undefined) return <span />;

	return (
		<span className="flex flex-col gap-1">
			<Link to={`/guilds/${guild.id}`} className="hover:underline">
				<ServerName guild={guild} />
			</Link>
			{query?.isError === true && (
				<span className="text-warning text-xs font-normal">
					{isRefusal(query.error) ? t("compare.refused") : t("compare.couldNotRead")}
				</span>
			)}
		</span>
	);
}

function Unknown({ failed }: { failed: boolean }): React.JSX.Element {
	const { t } = useTranslation();
	return failed ? (
		<span className="text-muted-foreground">{t("compare.unknown")}</span>
	) : (
		<Skeleton className="h-10 w-full" />
	);
}

function FeatureCell({
	guildId,
	featureKey,
	cell,
	failed,
	channels,
}: {
	guildId: string;
	featureKey: string;
	cell: FeatureStatus | null | undefined;
	failed: boolean;
	channels: ChannelSummary[] | undefined;
}): React.JSX.Element {
	const { t } = useTranslation();
	if (cell === undefined) return <Unknown failed={failed} />;
	if (cell === null) return <span className="text-muted-foreground">{t("compare.unknown")}</span>;

	const channel = (id: string): string => (channels === undefined ? "…" : channelLabel(channels, id, t));
	const { path } = featureLook(featureKey);
	const body = (
		<>
			<Badge tone={cell.enabled ? "success" : "muted"}>{cell.enabled ? t("common.on") : t("common.off")}</Badge>
			<span className="text-muted-foreground">
				{cell.detail === null ? t("overview.notSetUp") : describeDetail(cell.detail, t, channel)}
			</span>
		</>
	);

	return path === undefined ? (
		<span className="flex flex-col items-start gap-1">{body}</span>
	) : (
		<Link to={path(guildId)} className="hover:bg-muted rounded-field -m-1 flex flex-col items-start gap-1 p-1">
			{body}
		</Link>
	);
}

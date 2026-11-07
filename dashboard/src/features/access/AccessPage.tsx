import { ACCESS_LIMITS, type AccessArea, idFromQuery } from "@testify/shared";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { useUndo } from "@/app/undo";
import { Field, FIELD, Refusal, RowActions, SettingRows, Warning } from "@/components/form";
import {
	Avatar,
	Badge,
	Button,
	Card,
	DividedList,
	EmptyState,
	HoverChevron,
	PageHeader,
	SectionHeading,
	Skeleton,
	Summary,
} from "@/components/primitives";
import { refusalKey } from "@/features/access/access.utils";
import { AreaPicker } from "@/features/access/components/AreaPicker";
import { useAccessList, useGrantAccess } from "@/features/access/useAccess";
import { NeedsPermission } from "@/features/guild-overview/components/NeedsPermission";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { mayGrant } from "@/features/guild-overview/useLacks";
import { usePageTitle } from "@/hooks/usePageTitle";
import { dateAndTime, shortDate, since } from "@/lib/datetime";
import { sanitiseInput } from "@/lib/sanitise";

const ROW = "hover:bg-muted/60 group flex items-center gap-3 px-4 py-3 transition-colors duration-150";

export function AccessPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);
	const allowed = mayGrant(overview.data);
	const list = useAccessList(guildId, allowed);
	const grant = useGrantAccess(guildId);
	const [typed, setTyped] = useState("");
	const [areas, setAreas] = useState<AccessArea[]>([]);
	const undo = useUndo();
	const people = list.data?.people.filter((person) => !undo.isHidden(`access:${person.userId}`));

	usePageTitle(t("access.title"), overview.data?.name);

	const userId = idFromQuery(typed);
	const full = (list.data?.people.length ?? 0) >= ACCESS_LIMITS.maxPeople;
	const known = refusalKey(grant.error);

	if (!allowed) {
		return (
			<>
				<PageHeader server={overview.data} title={t("access.title")} subtitle={t("access.subtitle")} />
				{overview.data === undefined ? (
					<Skeleton className="h-40 w-full" />
				) : (
					<NeedsPermission permission="Administrator" />
				)}
			</>
		);
	}

	return (
		<>
			<PageHeader server={overview.data} title={t("access.title")} subtitle={t("access.subtitle")} />
			{people !== undefined && (
				<Summary>
					{people.length === 0 ? t("access.summaryNone") : t("access.summary", { count: people.length })}
				</Summary>
			)}

			<SettingRows title={t("access.addTitle")} description={t("access.addBody")}>
				<Field label={t("access.userId")} hint={t("access.userIdHint")} htmlFor="access-user">
					<input
						id="access-user"
						inputMode="numeric"
						autoComplete="off"
						value={typed}
						disabled={grant.isPending || full}
						onChange={(event) => {
							setTyped(sanitiseInput(event.target.value));
						}}
						className={FIELD}
					/>
				</Field>
				{typed.trim() !== "" && userId === null && <Warning>{t("access.notAnId")}</Warning>}
				<AreaPicker value={areas} disabled={grant.isPending || full} onChange={setAreas} />
				{full && <Warning>{t("access.refusedTooMany", { max: ACCESS_LIMITS.maxPeople })}</Warning>}
				{known === null ? (
					<Refusal error={grant.error} />
				) : (
					<Warning>{t(known, { max: ACCESS_LIMITS.maxPeople })}</Warning>
				)}
				<RowActions>
					<Button
						disabled={userId === null || areas.length === 0 || grant.isPending || full}
						onClick={() => {
							if (userId === null) return;
							grant.mutate(
								{ userId, areas },
								{
									onSuccess: () => {
										setTyped("");
										setAreas([]);
									},
								},
							);
						}}
					>
						{t("access.give", { count: areas.length })}
					</Button>
				</RowActions>
			</SettingRows>

			<section aria-labelledby="access-people" className="flex flex-col gap-3">
				<SectionHeading as="h2" id="access-people" count={people?.length}>
					{t("access.peopleTitle")}
				</SectionHeading>
				{list.isError ? (
					<ErrorState as="h2" error={list.error} onRetry={() => void list.refetch()} />
				) : people === undefined ? (
					<Skeleton className="h-40 w-full" />
				) : people.length === 0 ? (
					<Card>
						<EmptyState icon={<KeyRound size={28} />} title={t("access.emptyTitle")} body={t("access.emptyBody")} />
					</Card>
				) : (
					<DividedList className="bg-card">
						{people.map((person) => (
							<li key={person.userId}>
								<Link to={`/guilds/${guildId}/access/${person.userId}`} className={ROW}>
									<Avatar name={person.username} url={person.avatarUrl} seed={person.userId} size={36} />
									<span className="min-w-0 flex-1">
										<span className="flex flex-wrap items-center gap-2 font-medium">
											<span className="truncate">{person.username}</span>
											{!person.inServer && <Badge>{t("access.left")}</Badge>}
										</span>
										<span className="text-muted-foreground block text-sm">
											{t("access.rowDetail", {
												count: person.areas.length,
												name: person.addedBy.name,
												when: shortDate(person.addedAt),
											})}
										</span>
									</span>
									<span className="text-muted-foreground hidden text-right text-sm sm:block">
										{person.lastSeenAt === null ? (
											t("access.neverHere")
										) : (
											<time dateTime={person.lastSeenAt} title={dateAndTime(person.lastSeenAt)}>
												{t("access.lastHere", { when: since(person.lastSeenAt) })}
											</time>
										)}
									</span>
									<HoverChevron />
								</Link>
							</li>
						))}
					</DividedList>
				)}
			</section>
		</>
	);
}

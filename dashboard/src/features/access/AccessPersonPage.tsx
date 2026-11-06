import { type AccessArea, type AccessPerson } from "@testify/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { useUndo } from "@/app/undo";
import { Refusal, RowActions, SavingIndicator, savingStateOf, SettingRows } from "@/components/form";
import { Avatar, Button, DataList, PageHeader, SectionHeading, Skeleton } from "@/components/primitives";
import { areaLabel, sameAreas } from "@/features/access/access.utils";
import { AreaPicker } from "@/features/access/components/AreaPicker";
import { useAccessPerson, useChangeAccess, useRemoveAccess } from "@/features/access/useAccess";
import { RecentChanges } from "@/features/guild-overview/components/RecentChanges";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { usePageTitle } from "@/hooks/usePageTitle";
import { dateAndTime } from "@/lib/datetime";

export function AccessPersonPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "", userId = "" } = useParams();
	const overview = useGuildOverview(guildId);
	const person = useAccessPerson(guildId, userId);

	usePageTitle(person.data?.person.username ?? t("access.title"), overview.data?.name);

	const back = { to: `/guilds/${guildId}/access`, label: t("access.back") };
	if (person.isError) {
		return (
			<>
				<PageHeader server={overview.data} title={t("access.title")} back={back} />
				<ErrorState as="h2" error={person.error} onRetry={() => void person.refetch()} />
			</>
		);
	}
	if (person.isPending) return <Skeleton className="h-96 w-full" />;

	const { person: who, items } = person.data;
	return (
		<>
			<PageHeader server={overview.data} title={who.username} subtitle={t("access.personSubtitle")} back={back} />
			<Facts person={who} />
			<Screens key={who.areas.join()} guildId={guildId} person={who} />

			<section aria-labelledby="access-activity" className="flex flex-col gap-3">
				<SectionHeading as="h2" id="access-activity" count={items.length}>
					{t("access.activityTitle")}
				</SectionHeading>
				<RecentChanges changes={items} />
			</section>

			<TakeAway guildId={guildId} person={who} />
		</>
	);
}

function Facts({ person }: { person: AccessPerson }): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<SettingRows title={t("access.factsTitle")}>
			<div className="flex items-center gap-3">
				<Avatar name={person.username} url={person.avatarUrl} seed={person.userId} size={48} />
				<span className="text-muted-foreground text-sm">
					{person.inServer ? t("access.inServer") : t("access.notInServer")}
				</span>
			</div>
			<DataList
				rows={[
					{ label: t("access.factId"), value: person.userId, mono: true },
					{
						label: t("access.factAdded"),
						value: t("access.factAddedValue", { name: person.addedBy.name, when: dateAndTime(person.addedAt) }),
					},
					{ label: t("access.factChanged"), value: dateAndTime(person.updatedAt) },
					{
						label: t("access.factSeen"),
						value: person.lastSeenAt === null ? t("access.neverHere") : dateAndTime(person.lastSeenAt),
					},
					{
						label: t("access.factChanges"),
						value:
							person.lastChangeAt === null
								? t("access.noChanges")
								: t("access.factChangesValue", { count: person.changes, when: dateAndTime(person.lastChangeAt) }),
					},
				]}
			/>
		</SettingRows>
	);
}

function Screens({ guildId, person }: { guildId: string; person: AccessPerson }): React.JSX.Element {
	const { t } = useTranslation();
	const change = useChangeAccess(guildId, person.userId);
	const [draft, setDraft] = useState<AccessArea[]>(person.areas);
	const changed = !sameAreas(draft, person.areas);

	return (
		<SettingRows
			title={t("access.screensTitle")}
			description={t("access.screensBody", {
				screens: person.areas.map((area) => t(areaLabel(area))).join(t("common.listSeparator")),
			})}
			action={<SavingIndicator state={savingStateOf(change.isPending, change.isSuccess && !changed)} />}
		>
			<AreaPicker value={draft} disabled={change.isPending} onChange={setDraft} />
			<Refusal error={change.error} />
			<RowActions>
				<Button
					disabled={!changed || draft.length === 0 || change.isPending}
					onClick={() => {
						change.mutate(draft);
					}}
				>
					{t("access.save", { count: draft.length })}
				</Button>
			</RowActions>
		</SettingRows>
	);
}

function TakeAway({ guildId, person }: { guildId: string; person: AccessPerson }): React.JSX.Element {
	const { t } = useTranslation();
	const undo = useUndo();
	const remove = useRemoveAccess(guildId);
	const navigate = useNavigate();

	return (
		<SettingRows title={t("access.removeTitle")} description={t("access.removeBody", { name: person.username })}>
			<RowActions>
				<Button
					variant="destructive"
					onClick={() => {
						undo.schedule({
							key: `access:${person.userId}`,
							label: t("access.removed", { name: person.username }),
							commit: () => remove.mutateAsync(person.userId),
						});
						void navigate(`/guilds/${guildId}/access`);
					}}
				>
					{t("access.remove")}
				</Button>
			</RowActions>
		</SettingRows>
	);
}

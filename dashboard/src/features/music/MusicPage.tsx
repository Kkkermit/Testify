import { MUSIC_LIMITS } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { RoleChecklist, SavingIndicator, savingStateOf, Toggle, Warning } from "@/components/form";
import { Card, CARD_HEADING, PageHeader, Skeleton } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useRoles } from "@/features/levelling/useLevelling";
import { accessOf, missingRoleIds } from "@/features/music/music.utils";
import { useMusic, useSaveMusic } from "@/features/music/useMusic";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";

export function MusicPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const music = useMusic(guildId);
	const roles = useRoles(guildId);
	const overview = useGuildOverview(guildId);
	const save = useSaveMusic(guildId);

	usePageTitle(t("music.title"), overview.data?.name);

	if (music.isError) return <ErrorState error={music.error} onRetry={() => void music.refetch()} />;
	if (music.isPending) return <Skeleton className="h-96 w-full" />;

	const settings = music.data;
	const access = accessOf(settings);
	const stale = missingRoleIds(settings, roles.data ?? []);

	return (
		<>
			<PageHeader
				eyebrow={overview.data?.name}
				title={t("music.title")}
				subtitle={t("music.subtitle")}
				action={<SavingIndicator state={savingStateOf(save.isPending, save.isSuccess)} />}
			/>

			<Card className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h2 className={CARD_HEADING}>{t("music.system")}</h2>
					<p className="text-muted-foreground text-sm">
						{access === "off"
							? t("music.stateOff")
							: access === "everybody"
								? t("music.stateEverybody")
								: t("music.stateDjs", { count: settings.djRoleIds.length })}
					</p>
				</div>

				<Toggle
					label={t("music.enable")}
					checked={settings.enabled}
					disabled={save.isPending}
					onChange={(enabled) => {
						save.mutate({ enabled });
					}}
				/>
			</Card>

			<Card className="flex flex-col gap-4">
				<div>
					<h2 className={CARD_HEADING}>{t("music.djRoles")}</h2>
					<p className="text-muted-foreground text-sm">{t("music.djBody")}</p>
				</div>

				{roles.isError ? (
					<ErrorState as="h2" error={roles.error} onRetry={() => void roles.refetch()} />
				) : roles.isPending ? (
					<Skeleton className="h-64 w-full" />
				) : (
					<RoleChecklist
						roles={roles.data}
						value={settings.djRoleIds}
						label={t("music.djPick")}
						hint={t("music.djHint")}
						max={MUSIC_LIMITS.maxDjRoles}
						onChange={(djRoleIds) => {
							save.mutate({ djRoleIds });
						}}
					/>
				)}

				{stale.length > 0 && <Warning>{t("music.staleRoles", { count: stale.length })}</Warning>}
				{save.error !== null && (
					<Warning>{save.error instanceof ApiError ? save.error.message : t("common.couldNotSave")}</Warning>
				)}
			</Card>
		</>
	);
}

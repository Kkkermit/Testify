import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { NICKNAME_MAX, type GuildNickname, type NicknamePatch } from "@testify/shared";
import { UserPen } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Field, FIELD, savingStateOf, Warning } from "@/components/form";
import { Button } from "@/components/primitives";
import { Section } from "@/features/settings/components/Section";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { keys } from "@/lib/queries";
import { sanitiseInput } from "@/lib/sanitise";

function useNickname(guildId: string): UseQueryResult<GuildNickname> {
	return useQuery({
		queryKey: keys.guild(guildId).nickname(),
		queryFn: () => api.get<GuildNickname>(`/guilds/${guildId}/settings/nickname`),
	});
}

/** The only part of the bot's appearance a manager may change: Discord has no per-server avatar for bots. */
export function NicknameSection({ guildId }: { guildId: string }): React.JSX.Element {
	const { t } = useTranslation();
	const client = useQueryClient();
	const current = useNickname(guildId);
	const save = useMutation({
		mutationFn: (patch: NicknamePatch) => api.patch<GuildNickname>(`/guilds/${guildId}/settings/nickname`, patch),
		onSuccess: (next) => {
			client.setQueryData(keys.guild(guildId).nickname(), next);
		},
	});

	const [draft, setDraft] = useState("");

	useEffect(() => {
		setDraft(current.data?.nickname ?? "");
	}, [current.data?.nickname]);

	const saved = current.data?.nickname ?? "";
	const allowed = current.data?.canChange ?? false;
	const dirty = draft !== saved;

	return (
		<Section
			icon={UserPen}
			tint="text-feature-community"
			title={t("settings.nickTitle")}
			describes={t("settings.nickBody")}
			saving={savingStateOf(save.isPending, save.isSuccess && !dirty)}
			failure={save.error}
		>
			<Field label={t("settings.nickLabel")} htmlFor="nickname">
				<div className="flex flex-wrap items-center gap-2">
					<input
						id="nickname"
						value={draft}
						disabled={!allowed}
						maxLength={NICKNAME_MAX}
						placeholder="Testify"
						onChange={(event) => {
							setDraft(event.target.value);
						}}
						className={cn(FIELD, "max-w-64")}
					/>
					{dirty && allowed && (
						<>
							<Button
								onClick={() => {
									save.mutate({ nickname: draft.trim() === "" ? null : sanitiseInput(draft) });
								}}
							>
								Save name
							</Button>
							<Button
								variant="ghost"
								onClick={() => {
									setDraft(saved);
								}}
							>
								Discard
							</Button>
						</>
					)}
				</div>
			</Field>

			{!allowed && current.data !== undefined && <Warning>{t("settings.nickNeedsPermission")}</Warning>}

			{save.error !== null && (
				<Warning>{save.error instanceof ApiError ? save.error.message : t("common.couldNotSave")}</Warning>
			)}
		</Section>
	);
}

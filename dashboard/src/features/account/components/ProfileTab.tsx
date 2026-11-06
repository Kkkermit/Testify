import { type UseMutationResult } from "@tanstack/react-query";
import { type AccountProfile, PROFILE_LIMITS, type ProfileBody } from "@testify/shared";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { LeaveGuard } from "@/app/LeaveGuard";
import { useUndo } from "@/app/undo";
import { Field, RowActions, SettingRows, Warning } from "@/components/form";
import { FIELD } from "@/components/form/fieldStyles";
import { Button, Skeleton, Summary } from "@/components/primitives";
import {
	profileBodyOf,
	profileDraft,
	type ProfileDraft,
	profileReady,
	profileRefusal,
	sameProfile,
} from "@/features/account/account.utils";
import { useAccountProfile, useDeleteProfile, useSaveProfile } from "@/features/account/useAccount";
import { toLocalInput } from "@/features/scheduled-messages/scheduledMessages.utils";
import { cn } from "@/lib/cn";

const PROFILE_KEY = "profile";

type SaveProfile = UseMutationResult<{ profile: AccountProfile | null }, Error, ProfileBody>;

export function ProfileTab(): React.JSX.Element {
	const { t } = useTranslation();
	const profile = useAccountProfile();
	const save = useSaveProfile();
	const remove = useDeleteProfile();
	const undo = useUndo();

	if (profile.isError) return <ErrorState as="h2" error={profile.error} onRetry={() => void profile.refetch()} />;
	if (profile.isPending) return <Skeleton className="h-96 w-full" />;

	const current = undo.isHidden(PROFILE_KEY) ? null : profile.data.profile;

	return (
		<>
			<Summary>{current === null ? t("account.profileNone") : t("account.profileSummary")}</Summary>
			<ProfileForm
				key={current?.updatedAt ?? "new"}
				profile={current}
				save={save}
				onDelete={
					current === null
						? undefined
						: () => {
								save.reset();
								undo.schedule({
									key: PROFILE_KEY,
									label: t("undo.profile"),
									commit: () => remove.mutateAsync(),
								});
							}
				}
			/>
		</>
	);
}

function ProfileForm({
	profile,
	save,
	onDelete,
}: {
	profile: AccountProfile | null;
	save: SaveProfile;
	onDelete: (() => void) | undefined;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [draft, setDraft] = useState<ProfileDraft>(() => profileDraft(profile));
	const dirty = !sameProfile(draft, profileDraft(profile));
	const today = toLocalInput(new Date()).slice(0, 10);
	const set = (field: keyof ProfileDraft) => (event: { target: { value: string } }) => {
		setDraft((was) => ({ ...was, [field]: event.target.value }));
	};

	return (
		<>
			<LeaveGuard when={dirty} />
			<SettingRows
				title={t("account.profileTitle")}
				description={t("account.profilePublic")}
				onSubmit={(event) => {
					event.preventDefault();
					save.mutate(profileBodyOf(draft));
				}}
			>
				<Field label={t("account.profileAbout")} htmlFor="profile-about">
					<textarea
						id="profile-about"
						rows={4}
						required
						value={draft.about}
						maxLength={PROFILE_LIMITS.about}
						onChange={set("about")}
						className={cn(FIELD, "resize-y")}
					/>
					<span className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
						{t("common.partOf", { part: draft.about.length, whole: PROFILE_LIMITS.about })}
					</span>
				</Field>
				<Field label={t("account.profileSong")} htmlFor="profile-song">
					<input
						id="profile-song"
						required
						value={draft.favouriteSong}
						maxLength={PROFILE_LIMITS.favouriteSong}
						onChange={set("favouriteSong")}
						className={FIELD}
						autoComplete="off"
					/>
				</Field>
				<Field label={t("account.profileGame")} hint={t("account.optional")} htmlFor="profile-game">
					<input
						id="profile-game"
						value={draft.favouriteGame}
						maxLength={PROFILE_LIMITS.favouriteGame}
						onChange={set("favouriteGame")}
						className={FIELD}
						autoComplete="off"
					/>
				</Field>
				<Field label={t("account.profileHobbies")} hint={t("account.optional")} htmlFor="profile-hobbies">
					<input
						id="profile-hobbies"
						value={draft.hobbies}
						maxLength={PROFILE_LIMITS.hobbies}
						onChange={set("hobbies")}
						className={FIELD}
						autoComplete="off"
					/>
				</Field>
				<Field label={t("account.profileBirthday")} hint={t("account.profileBirthdayHint")} htmlFor="profile-birthday">
					<input
						id="profile-birthday"
						type="date"
						value={draft.birthday}
						min={`${String(PROFILE_LIMITS.earliestYear)}-01-01`}
						max={today}
						onChange={set("birthday")}
						className={FIELD}
					/>
				</Field>
				{save.error !== null && <Warning>{t(profileRefusal(save.error))}</Warning>}
				{save.isSuccess && !dirty && (
					<p role="status" className="text-success text-sm">
						{t("account.profileSaved")}
					</p>
				)}
				<RowActions>
					<Button type="submit" disabled={!dirty || !profileReady(draft) || save.isPending}>
						{t("account.profileSave")}
					</Button>
					{onDelete !== undefined && (
						<Button variant="ghost" onClick={onDelete}>
							<Trash2 size={16} aria-hidden="true" /> {t("account.profileDelete")}
						</Button>
					)}
				</RowActions>
			</SettingRows>
		</>
	);
}

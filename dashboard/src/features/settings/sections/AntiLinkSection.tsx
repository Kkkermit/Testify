import { BYPASS_LABELS, BYPASS_PERMISSIONS, type AntiLinkPatch, type AntiLinkSetting } from "@testify/shared";
import { LinkIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Field, savingStateOf, SELECT, Toggle } from "@/components/form";
import { Section } from "@/features/settings/components/Section";
import { useSaveSection } from "@/features/settings/useSettings";
import { oneOf } from "@/lib/oneOf";

export function AntiLinkSection({ guildId, value }: { guildId: string; value: AntiLinkSetting }): React.JSX.Element {
	const { t } = useTranslation();
	const save = useSaveSection<AntiLinkPatch>(guildId, "anti-link");

	return (
		<Section
			icon={LinkIcon}
			tint="text-feature-moderation"
			title={t("settings.linkTitle")}
			describes={t("settings.linkBody")}
			saving={savingStateOf(save.isPending, save.isSuccess)}
			failure={save.error}
		>
			<Toggle
				label={t("settings.linkDelete")}
				hint={t("settings.linkDeleteHint")}
				checked={value.enabled}
				onChange={(enabled) => {
					save.mutate({ enabled });
				}}
			/>

			<Field label={t("settings.linkBypass")} hint={t("settings.linkBypassHint")}>
				<select
					className={SELECT}
					value={value.bypassPermission}
					disabled={!value.enabled}
					onChange={(event) => {
						save.mutate({ bypassPermission: oneOf(BYPASS_PERMISSIONS, event.target.value, "ManageMessages") });
					}}
				>
					{BYPASS_PERMISSIONS.map((permission) => (
						<option key={permission} value={permission}>
							{BYPASS_LABELS[permission]}
						</option>
					))}
				</select>
			</Field>
		</Section>
	);
}

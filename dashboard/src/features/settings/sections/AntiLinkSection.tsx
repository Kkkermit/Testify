import { BYPASS_LABELS, BYPASS_PERMISSIONS, type AntiLinkPatch, type AntiLinkSetting } from "@testify/shared";
import { LinkIcon } from "lucide-react";
import { Field, savingStateOf, SELECT, Toggle } from "@/components/form";
import { Section } from "@/features/settings/components/Section";
import { useSaveSection } from "@/features/settings/useSettings";

export function AntiLinkSection({ guildId, value }: { guildId: string; value: AntiLinkSetting }): React.JSX.Element {
	const save = useSaveSection<AntiLinkPatch>(guildId, "anti-link");

	return (
		<Section
			icon={LinkIcon}
			tint="text-feature-moderation"
			title="Link filtering"
			describes="Deletes links posted by anybody without the bypass permission."
			saving={savingStateOf(save.isPending, save.isSuccess)}
			failure={save.error}
		>
			<Toggle
				label="Delete links"
				hint="Testify needs Manage Messages in the channel for this to work."
				checked={value.enabled}
				onChange={(enabled) => {
					save.mutate({ enabled });
				}}
			/>

			<Field label="Who may still post links" hint="Anybody with this permission is never filtered.">
				<select
					className={SELECT}
					value={value.bypassPermission}
					disabled={!value.enabled}
					onChange={(event) => {
						save.mutate({ bypassPermission: event.target.value as AntiLinkSetting["bypassPermission"] });
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

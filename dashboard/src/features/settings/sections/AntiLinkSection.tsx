import { BYPASS_LABELS, BYPASS_PERMISSIONS, type AntiLinkPatch, type AntiLinkSetting } from "@testify/shared";
import { LinkIcon } from "lucide-react";
import { FIELD, savingStateOf, Toggle } from "@/components/form";
import { Section } from "@/features/settings/components/Section";
import { useSaveSection } from "@/features/settings/useSettings";
import { cn } from "@/lib/cn";

export function AntiLinkSection({ guildId, value }: { guildId: string; value: AntiLinkSetting }): React.JSX.Element {
	const save = useSaveSection<AntiLinkPatch>(guildId, "anti-link");

	return (
		<Section
			icon={LinkIcon}
			tint="text-feature-moderation"
			title="Link filtering"
			describes="Deletes links posted by anybody without the bypass permission."
			saving={savingStateOf(save.isPending, save.isSuccess)}
		>
			<Toggle
				label="Delete links"
				hint="Testify needs Manage Messages in the channel for this to work."
				checked={value.enabled}
				onChange={(enabled) => {
					save.mutate({ enabled });
				}}
			/>

			<label className="block">
				<span className="text-muted-foreground block text-[0.8125rem] font-medium">Who may still post links</span>
				<span className="text-muted-foreground block text-xs">Anybody with this permission is never filtered.</span>
				<select
					className={cn(FIELD, "mt-1")}
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
			</label>
		</Section>
	);
}

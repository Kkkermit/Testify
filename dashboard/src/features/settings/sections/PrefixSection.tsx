import { type PrefixPatch, type PrefixSetting } from "@testify/shared";
import { Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { Field, FIELD, savingStateOf, Toggle, Warning } from "@/components/form";
import { Button } from "@/components/primitives";
import { Section } from "@/features/settings/components/Section";
import { prefixProblem } from "@/features/settings/settings.utils";
import { useSaveSection } from "@/features/settings/useSettings";
import { cn } from "@/lib/cn";
import { sanitiseInput } from "@/lib/sanitise";

/** The one typed field on this page, so it is held locally and saved on blur rather than per keystroke. */
export function PrefixSection({ guildId, value }: { guildId: string; value: PrefixSetting }): React.JSX.Element {
	const save = useSaveSection<PrefixPatch>(guildId, "prefix");
	const [draft, setDraft] = useState(value.prefix);

	useEffect(() => {
		setDraft(value.prefix);
	}, [value.prefix]);

	const problem = prefixProblem(draft);
	const dirty = draft.trim() !== value.prefix;

	function commit(): void {
		if (!dirty || problem !== null) return;
		save.mutate({ prefix: sanitiseInput(draft) });
	}

	return (
		<Section
			icon={Terminal}
			tint="text-feature-levelling"
			title="Command prefix"
			describes="What people type before a command name. Slash commands are unaffected by anything here."
			saving={savingStateOf(save.isPending, save.isSuccess && !dirty)}
			failure={save.error}
		>
			<Toggle
				label="Allow prefix commands"
				hint="Off means only slash commands work in this server."
				checked={value.enabled}
				onChange={(enabled) => {
					save.mutate({ enabled });
				}}
			/>

			<Field label="Prefix" htmlFor="prefix">
				<div className="flex flex-wrap items-center gap-2">
					<input
						id="prefix"
						value={draft}
						disabled={!value.enabled}
						onChange={(event) => {
							setDraft(event.target.value);
						}}
						onBlur={commit}
						className={cn(FIELD, "max-w-40 font-mono", problem !== null && dirty && "border-destructive")}
					/>
					<p className="text-muted-foreground text-sm">
						e.g. <span className="font-mono">{(problem === null ? draft.trim() : value.prefix) || "t?"}ban</span>
					</p>
					{dirty && problem === null && <Button onClick={commit}>Save prefix</Button>}
				</div>
			</Field>

			{dirty && problem !== null && <Warning>{problem}</Warning>}
		</Section>
	);
}

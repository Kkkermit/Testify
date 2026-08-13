import { type ChannelSummary, type CountingPatch, type CountingSetting } from "@testify/shared";
import { Hash } from "lucide-react";
import { useEffect, useState } from "react";
import { ChannelPicker, Field, FIELD, savingStateOf, Toggle, Warning } from "@/components/form";
import { Button } from "@/components/primitives";
import { Section } from "@/features/settings/components/Section";
import { countCapProblem, countProgress } from "@/features/settings/settings.utils";
import { useSaveSection } from "@/features/settings/useSettings";
import { cn } from "@/lib/cn";

export function CountingSection({
	guildId,
	value,
	channels,
}: {
	guildId: string;
	value: CountingSetting;
	channels: ChannelSummary[];
}): React.JSX.Element {
	const save = useSaveSection<CountingPatch>(guildId, "counting");
	const [cap, setCap] = useState(String(value.maxCount));

	useEffect(() => {
		setCap(String(value.maxCount));
	}, [value.maxCount]);

	const problem = countCapProblem(cap);
	const dirty = cap !== String(value.maxCount);

	function commit(): void {
		if (!dirty || problem !== null) return;
		save.mutate({ maxCount: Number(cap) });
	}

	return (
		<Section
			icon={Hash}
			tint="text-feature-community"
			title="Counting"
			describes="One channel where members count upwards, one number each."
			saving={savingStateOf(save.isPending, save.isSuccess && !dirty)}
			failure={save.error}
		>
			<Toggle
				label="Run a counting channel"
				hint="Off removes the configuration. The count is not kept."
				checked={value.enabled}
				onChange={(enabled) => {
					save.mutate({ enabled });
				}}
			/>

			<ChannelPicker
				label="Count in"
				channels={channels}
				value={value.channelId}
				allowNone={false}
				onChange={(channelId) => {
					save.mutate({ channelId });
				}}
			/>

			<Field label="Count up to" htmlFor="counting-cap">
				<div className="flex flex-wrap items-center gap-2">
					<input
						id="counting-cap"
						inputMode="numeric"
						value={cap}
						disabled={!value.enabled}
						onChange={(event) => {
							setCap(event.target.value);
						}}
						onBlur={commit}
						className={cn(FIELD, "max-w-40 font-mono tabular-nums", problem !== null && dirty && "border-destructive")}
					/>
					{dirty && problem === null && <Button onClick={commit}>Save target</Button>}
				</div>
			</Field>

			{value.enabled && (
				<div className="flex flex-col gap-2">
					<div className="flex items-baseline justify-between gap-3">
						<p className="text-muted-foreground text-sm">
							Currently at <span className="text-foreground font-mono">{value.count.toLocaleString()}</span>
						</p>
						<Button
							variant="ghost"
							onClick={() => {
								save.mutate({ reset: true });
							}}
						>
							Reset to zero
						</Button>
					</div>
					<div aria-hidden="true" className="bg-muted h-1.5 overflow-hidden rounded-full">
						<span
							className="bg-primary block h-full rounded-full transition-[width] duration-500"
							style={{ width: `${String(countProgress(value.count, value.maxCount))}%` }}
						/>
					</div>
				</div>
			)}

			{dirty && problem !== null && <Warning>{problem}</Warning>}
		</Section>
	);
}

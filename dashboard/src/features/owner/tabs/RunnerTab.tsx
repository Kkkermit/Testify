import { type CommandOptionSummary } from "@testify/shared";
import { Play, Terminal } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { FIELD, Field, SELECT, Warning } from "@/components/form";
import { Button, Card, EmptyState, Skeleton } from "@/components/primitives";
import { CARD_HEADING } from "@/components/primitives/textStyles";
import { RunOutputs } from "@/features/owner/components/RunOutputs";
import { buildArgs, canRun, controlFor, needsSubcommand, optionsShown } from "@/features/owner/runner.utils";
import { useRunCommand, useRunnable } from "@/features/owner/useRunner";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

/**
 * Runs an owner command and shows what it replied with.
 *
 * The form is generated from the same metadata Discord registers, so a command gaining an option gains a field
 * here with no work. Only the allowlist in `commandRunner.util.ts` is reachable — the panel commands are not
 * here, because a Components V2 tree serialised to JSON is not a settings page.
 */
export function RunnerTab(): React.JSX.Element {
	const { t } = useTranslation();
	const catalogue = useRunnable();
	const run = useRunCommand();

	const [name, setName] = useState("");
	const [subcommand, setSubcommand] = useState<string | null>(null);
	const [guildId, setGuildId] = useState("");
	const [values, setValues] = useState<Record<string, string>>({});

	if (catalogue.isPending) return <Skeleton className="h-64 w-full" />;
	// A picker with nothing in it reads as "no command may be run here" rather than as a failed read.
	if (catalogue.isError) return <ErrorState as="h2" error={catalogue.error} onRetry={() => void catalogue.refetch()} />;

	const commands = catalogue.data.commands;
	const command = commands.find((candidate) => candidate.name === name);
	const options = optionsShown(command, subcommand);

	function choose(next: string): void {
		setName(next);
		setSubcommand(null);
		setValues({});
		run.reset();
	}

	return (
		<div className="flex flex-col gap-4">
			<Card focal className="flex flex-col gap-4">
				<div>
					<h2 className={CARD_HEADING}>{t("owner.runCommand")}</h2>
					<p className="text-muted-foreground text-sm">
						Runs here rather than in a server: nothing is posted to Discord, and the reply comes back below. Only
						read-only owner commands are listed.
					</p>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field htmlFor="runner-command" label={t("owner.command")}>
						<select
							id="runner-command"
							value={name}
							onChange={(event) => {
								choose(event.target.value);
							}}
							className={SELECT}
						>
							<option value="">{t("owner.pickOne")}</option>
							{commands.map((candidate) => (
								<option key={candidate.name} value={candidate.name}>
									/{candidate.name}
								</option>
							))}
						</select>
					</Field>

					{needsSubcommand(command) && (
						<Field htmlFor="runner-subcommand" label={t("owner.part")}>
							<select
								id="runner-subcommand"
								value={subcommand ?? ""}
								onChange={(event) => {
									setSubcommand(event.target.value === "" ? null : event.target.value);
									setValues({});
								}}
								className={SELECT}
							>
								<option value="">{t("owner.pickOne")}</option>
								{(command?.subcommands ?? []).map((part) => (
									<option key={part.name} value={part.name}>
										{part.name}
									</option>
								))}
							</select>
						</Field>
					)}
				</div>

				{command !== undefined && <p className="text-muted-foreground text-sm">{command.description}</p>}

				{command?.guildOnly === true && (
					<Field htmlFor="runner-guild" label={t("owner.serverId")}>
						<input
							id="runner-guild"
							value={guildId}
							inputMode="numeric"
							autoComplete="off"
							placeholder="900000000000000000"
							onChange={(event) => {
								setGuildId(event.target.value.trim());
							}}
							className={cn(FIELD, "font-mono")}
						/>
					</Field>
				)}

				{options.length > 0 && (
					<div className="grid gap-4 sm:grid-cols-2">
						{options.map((option) => (
							<OptionField
								key={option.name}
								option={option}
								value={values[option.name] ?? ""}
								onChange={(next) => {
									setValues((current) => ({ ...current, [option.name]: next }));
								}}
							/>
						))}
					</div>
				)}

				<div>
					<Button
						disabled={!canRun(command, subcommand, values) || run.isPending}
						onClick={() => {
							run.mutate({
								name,
								subcommand,
								guildId: guildId === "" ? null : guildId,
								args: buildArgs(options, values),
							});
						}}
					>
						<Play size={15} aria-hidden="true" />
						Run it
					</Button>
				</div>

				{run.error !== null && (
					<Warning>{run.error instanceof ApiError ? run.error.message : "That could not be run."}</Warning>
				)}
			</Card>

			{run.data === undefined ? (
				<Card>
					<EmptyState
						icon={<Terminal size={20} aria-hidden="true" />}
						title={t("owner.nothingRun")}
						body={t("owner.nothingRunBody")}
					/>
				</Card>
			) : (
				<RunOutputs result={run.data} />
			)}
		</div>
	);
}

function OptionField({
	option,
	value,
	onChange,
}: {
	option: CommandOptionSummary;
	value: string;
	onChange: (next: string) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const id = `runner-arg-${option.name}`;
	const label = option.required ? option.name : `${option.name} (optional)`;
	const kind = controlFor(option);

	return (
		<Field htmlFor={id} label={label} hint={option.description}>
			{kind === "choice" && (
				<select
					id={id}
					value={value}
					onChange={(event) => {
						onChange(event.target.value);
					}}
					className={SELECT}
				>
					<option value="">{t("owner.pickOne")}</option>
					{option.choices.map((choice) => (
						<option key={String(choice.value)} value={String(choice.value)}>
							{choice.name}
						</option>
					))}
				</select>
			)}

			{kind === "boolean" && (
				<select
					id={id}
					value={value}
					onChange={(event) => {
						onChange(event.target.value);
					}}
					className={SELECT}
				>
					<option value="">{t("owner.notSet")}</option>
					<option value="true">Yes</option>
					<option value="false">No</option>
				</select>
			)}

			{kind === "number" && (
				<input
					id={id}
					type="number"
					value={value}
					{...(option.min === null ? {} : { min: option.min })}
					{...(option.max === null ? {} : { max: option.max })}
					onChange={(event) => {
						onChange(event.target.value);
					}}
					className={FIELD}
				/>
			)}

			{(kind === "text" || kind === "id") && (
				<input
					id={id}
					value={value}
					autoComplete="off"
					{...(kind === "id" ? { inputMode: "numeric" as const, placeholder: "A Discord ID" } : {})}
					onChange={(event) => {
						onChange(event.target.value);
					}}
					className={cn(FIELD, kind === "id" && "font-mono")}
				/>
			)}
		</Field>
	);
}

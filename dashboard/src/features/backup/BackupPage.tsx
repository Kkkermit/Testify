import {
	buildBackup,
	planBackup,
	type RestorableAction,
	BACKUP_LIMITS,
	type BackupDocument,
	type BackupStep,
} from "@testify/shared";
import { type TFunction } from "i18next";
import { Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { Field, Refusal, RowActions, SELECT, SettingRows, Warning } from "@/components/form";
import { Button, DividedList, PageHeader, SectionHeading } from "@/components/primitives";
import { useMe } from "@/features/auth/useMe";
import { BACKUP_SECTION_LABELS } from "@/features/backup/backup.labels";
import { backupFileName, readBackup, saveFile } from "@/features/backup/backup.utils";
import { readServerSettings, type ServerSettings, type StepResult, useApplyBackup } from "@/features/backup/useBackup";
import { comparable } from "@/features/compare/compare.utils";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { usePageTitle } from "@/hooks/usePageTitle";
import { dateAndTime } from "@/lib/datetime";

interface Incoming {
	document: BackupDocument;
	here: ServerSettings;
}

export function BackupPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);
	const me = useMe();
	const apply = useApplyBackup(guildId);
	const [busy, setBusy] = useState(false);
	const [problem, setProblem] = useState<string | null>(null);
	const [incoming, setIncoming] = useState<Incoming | null>(null);
	const [sourceId, setSourceId] = useState("");
	const [leftOut, setLeftOut] = useState<RestorableAction[]>([]);

	usePageTitle(t("backup.title"), overview.data?.name);

	const others = comparable(me.data?.guilds ?? []).filter((guild) => guild.id !== guildId);
	const name = overview.data?.name ?? "";

	const run = async (work: () => Promise<void>): Promise<void> => {
		setBusy(true);
		setProblem(null);
		try {
			await work();
		} catch {
			setProblem(t("backup.readFailed"));
		} finally {
			setBusy(false);
		}
	};

	const download = (): Promise<void> =>
		run(async () => {
			const setup = await readServerSettings(guildId);
			const document = buildBackup(name, setup.reads, setup);
			saveFile(backupFileName(name), `${JSON.stringify(document, null, "\t")}\n`);
			setLeftOut(setup.refused);
		});

	const bringIn = (document: BackupDocument): Promise<void> =>
		run(async () => {
			apply.reset();
			setIncoming({ document, here: await readServerSettings(guildId) });
		});

	return (
		<>
			<PageHeader server={overview.data} title={t("backup.title")} subtitle={t("backup.subtitle")} />

			<SettingRows title={t("backup.saveTitle")} description={t("backup.saveBody")}>
				<RowActions>
					<Button onClick={() => void download()} disabled={busy || name === ""}>
						{t("backup.download")}
					</Button>
				</RowActions>
				{leftOut.length > 0 && (
					<p className="text-muted-foreground text-sm">{t("backup.leftOut", { sections: sectionList(leftOut, t) })}</p>
				)}
			</SettingRows>

			<SettingRows title={t("backup.bringTitle")} description={t("backup.bringBody")}>
				<Field label={t("backup.fromFile")} hint={t("backup.fromFileHint")} htmlFor="backup-file">
					<input
						id="backup-file"
						type="file"
						accept="application/json,.json"
						disabled={busy}
						className="text-sm"
						onChange={(event) => {
							const file = event.target.files?.[0];
							event.target.value = "";
							if (file === undefined) return;
							if (file.size > BACKUP_LIMITS.maxBytes) {
								setProblem(t("backup.tooLarge"));
								return;
							}
							void file.text().then((text) => {
								const read = readBackup(text);
								if (typeof read === "string")
									setProblem(t(read === "tooLarge" ? "backup.tooLarge" : "backup.notBackup"));
								else void bringIn(read);
							});
						}}
					/>
				</Field>
				{others.length > 0 && (
					<Field label={t("backup.fromServer")} hint={t("backup.fromServerHint")} htmlFor="backup-source">
						<div className="flex flex-wrap items-center gap-2">
							<select
								id="backup-source"
								className={SELECT}
								value={sourceId}
								onChange={(event) => {
									setSourceId(event.target.value);
								}}
							>
								<option value="" disabled>
									{t("backup.chooseServer")}
								</option>
								{others.map((guild) => (
									<option key={guild.id} value={guild.id}>
										{guild.name}
									</option>
								))}
							</select>
							<Button
								variant="secondary"
								disabled={busy || sourceId === ""}
								onClick={() =>
									void run(async () => {
										const source = others.find((guild) => guild.id === sourceId);
										const setup = await readServerSettings(sourceId);
										await bringIn(buildBackup(source?.name ?? "", setup.reads, setup));
									})
								}
							>
								{t("backup.readServer")}
							</Button>
						</div>
					</Field>
				)}
			</SettingRows>

			{problem !== null && <Warning>{problem}</Warning>}

			{incoming !== null && (
				<Preview
					key={`${incoming.document.guildName}:${incoming.document.exportedAt}`}
					incoming={incoming}
					busy={apply.isPending}
					results={apply.data ?? []}
					onApply={(steps) => {
						apply.mutate(steps);
					}}
				/>
			)}
		</>
	);
}

function missingText(missing: BackupStep["missing"][number], t: TFunction): string {
	if (missing.name === null) {
		return t(missing.kind === "channel" ? "backup.missingChannelUnnamed" : "backup.missingRoleUnnamed");
	}
	return t(missing.kind === "channel" ? "backup.missingChannel" : "backup.missingRole", { name: missing.name });
}

function sectionList(actions: readonly RestorableAction[], t: TFunction): string {
	return actions.map((action) => t(BACKUP_SECTION_LABELS[action])).join(t("common.listSeparator"));
}

function Preview({
	incoming,
	busy,
	results,
	onApply,
}: {
	incoming: Incoming;
	busy: boolean;
	results: readonly StepResult[];
	onApply: (steps: BackupStep[]) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const { document, here } = incoming;
	const plan = planBackup(document, here, here.reads);
	const [skipped, setSkipped] = useState<ReadonlySet<RestorableAction>>(
		() => new Set(plan.steps.filter((step) => step.unchanged).map((step) => step.action)),
	);
	const chosen = plan.steps.filter((step) => !skipped.has(step.action));
	const resultOf = (action: RestorableAction): StepResult | undefined =>
		results.find((result) => result.action === action);

	return (
		<section aria-labelledby="backup-preview" className="flex flex-col gap-3">
			<SectionHeading as="h2" id="backup-preview" count={plan.steps.length}>
				{t("backup.previewTitle", { name: document.guildName })}
			</SectionHeading>
			<p className="text-muted-foreground text-sm">
				{t("backup.previewBody", { time: dateAndTime(document.exportedAt) })}
			</p>

			{plan.steps.length === 0 ? (
				<p className="text-sm">{t("backup.nothing")}</p>
			) : (
				<DividedList>
					{plan.steps.map((step) => {
						const result = resultOf(step.action);
						const id = `backup-${step.action}`;
						return (
							<li key={step.action} className="flex flex-col gap-1 px-4 py-3">
								<label htmlFor={id} className="flex items-center gap-3 text-sm font-medium">
									<input
										id={id}
										type="checkbox"
										checked={!skipped.has(step.action)}
										disabled={busy}
										onChange={(event) => {
											const next = new Set(skipped);
											if (event.target.checked) next.delete(step.action);
											else next.add(step.action);
											setSkipped(next);
										}}
									/>
									{t(BACKUP_SECTION_LABELS[step.action])}
								</label>
								<p className="text-muted-foreground ml-7 text-sm">
									{step.unchanged ? t("backup.same") : t("backup.changes", { count: Object.keys(step.body).length })}
								</p>
								{step.missing.map((missing) => (
									<p key={`${missing.kind}:${missing.name ?? ""}`} className="text-warning ml-7 text-sm">
										{missingText(missing, t)}
									</p>
								))}
								{result?.ok === true && (
									<p className="text-success ml-7 flex items-center gap-1 text-sm">
										<Check size={14} aria-hidden="true" />
										{t("backup.saved")}
									</p>
								)}
								{result?.ok === false && (
									<div className="ml-7">
										<Refusal error={result.error} />
									</div>
								)}
							</li>
						);
					})}
				</DividedList>
			)}

			{plan.left.map(({ action, missing }) => (
				<Warning key={action}>
					{[
						t("backup.leftAsIs", { section: t(BACKUP_SECTION_LABELS[action]) }),
						...missing.map((entry) => missingText(entry, t)),
					].join(t("common.sentenceSeparator"))}
				</Warning>
			))}

			{plan.unusable.length > 0 && (
				<Warning>
					{t("backup.unusable", {
						sections: sectionList(plan.unusable, t),
					})}
				</Warning>
			)}

			<RowActions>
				<Button
					disabled={busy || chosen.length === 0}
					onClick={() => {
						onApply(chosen);
					}}
				>
					{t("backup.apply", { count: chosen.length })}
				</Button>
			</RowActions>
		</section>
	);
}

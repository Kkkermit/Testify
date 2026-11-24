import { buildBackup, type RestorableAction, type BackupDocument, type BackupRefusal } from "@testify/shared";
import { Upload } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { Field, RowActions, SELECT, SettingRows, Warning } from "@/components/form";
import { Button, PageHeader } from "@/components/primitives";
import { useMe } from "@/features/auth/useMe";
import { backupFileName, readChosenFile, saveFile, sectionList } from "@/features/backup/backup.utils";
import { BackupPreview, type Incoming } from "@/features/backup/components/BackupPreview";
import { readServerSettings, useApplyBackup, useReportProgram } from "@/features/backup/useBackup";
import { comparable } from "@/features/compare/compare.utils";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useFeaturesOff } from "@/features/site/useFeaturesOff";
import { usePageTitle } from "@/hooks/usePageTitle";
import { type TranslationKey } from "@/i18n";
import { cn } from "@/lib/cn";

const REFUSALS: Record<BackupRefusal, TranslationKey> = {
	tooLarge: "backup.tooLarge",
	notJson: "backup.notJson",
	program: "backup.program",
	notBackup: "backup.notBackup",
};

export function BackupPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);
	const me = useMe();
	const featuresOff = useFeaturesOff();
	const apply = useApplyBackup(guildId);
	const reportProgram = useReportProgram(guildId);
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
			const setup = await readServerSettings(guildId, featuresOff);
			const document = buildBackup(name, setup.reads, setup);
			saveFile(backupFileName(name), `${JSON.stringify(document, null, "\t")}\n`);
			setLeftOut(setup.refused);
		});

	const compareWithHere = async (document: BackupDocument): Promise<void> => {
		apply.reset();
		setIncoming({ document, here: await readServerSettings(guildId, featuresOff) });
	};

	// Reading the file can fail too, if it was moved or deleted after it was picked.
	const chooseFile = (file: File): Promise<void> =>
		run(async () => {
			const chosen = await readChosenFile(file);
			if (chosen.kind === "program") {
				reportProgram.mutate(chosen.head);
				setProblem(t("backup.program"));
			} else if (chosen.kind === "refused") {
				setProblem(t(REFUSALS[chosen.reason]));
			} else {
				await compareWithHere(chosen.document);
			}
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
						className="peer sr-only"
						onChange={(event) => {
							const file = event.target.files?.[0];
							event.target.value = "";
							if (file !== undefined) void chooseFile(file);
						}}
					/>
					{/* The browser's own picker is in the browser's language, so this label stands in for it. */}
					<label
						htmlFor="backup-file"
						className={cn(
							"border-border bg-muted text-foreground hover:bg-muted/70 rounded-card inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 border px-4 py-2 text-sm font-medium",
							"peer-focus-visible:outline-ring peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2",
							"peer-disabled:pointer-events-none peer-disabled:opacity-50",
						)}
					>
						<Upload size={16} aria-hidden="true" />
						{t("backup.chooseFile")}
					</label>
					<Warning>{t("backup.programWarning")}</Warning>
					<Warning>{t("backup.toldToWarning")}</Warning>
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
										const setup = await readServerSettings(sourceId, featuresOff);
										await compareWithHere(buildBackup(source?.name ?? "", setup.reads, setup));
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
				<BackupPreview
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

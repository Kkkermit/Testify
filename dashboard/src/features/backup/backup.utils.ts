import {
	BACKUP_LIMITS,
	type BackupDocument,
	type BackupRefusal,
	type BackupStep,
	readBackupFile,
	type RestorableAction,
	runsAsProgram,
} from "@testify/shared";
import { type TFunction } from "i18next";
import { BACKUP_SECTION_LABELS } from "@/features/backup/backup.labels";

/** A file name from the server's name and the day, keeping only what every file system accepts. */
export function backupFileName(guildName: string, now = new Date()): string {
	const slug =
		guildName
			.normalize("NFKD")
			.replace(/[^\w\s-]/g, "")
			.trim()
			.replace(/\s+/g, "-")
			.toLowerCase()
			.slice(0, 40) || "server";
	return `${slug}-settings-${now.toISOString().slice(0, 10)}.json`;
}

export function saveFile(name: string, text: string): void {
	const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
	const link = document.createElement("a");
	link.href = url;
	link.download = name;
	link.click();
	URL.revokeObjectURL(url);
}

export type ChosenFile =
	| { kind: "program"; head: Uint8Array }
	| { kind: "refused"; reason: BackupRefusal }
	| { kind: "backup"; document: BackupDocument };

/** A program is judged by its first bytes alone, whatever it is called and however large, before anything else is read. */
export async function readChosenFile(file: File): Promise<ChosenFile> {
	const head = new Uint8Array(await file.slice(0, BACKUP_LIMITS.reportedBytes).arrayBuffer());
	if (runsAsProgram(head)) return { kind: "program", head };
	if (file.size > BACKUP_LIMITS.maxBytes) return { kind: "refused", reason: "tooLarge" };

	const read = readBackupFile({ name: file.name, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) });
	return typeof read === "string" ? { kind: "refused", reason: read } : { kind: "backup", document: read };
}

export function missingText(missing: BackupStep["missing"][number], t: TFunction): string {
	if (missing.name === null) {
		return t(missing.kind === "channel" ? "backup.missingChannelUnnamed" : "backup.missingRoleUnnamed");
	}
	return t(missing.kind === "channel" ? "backup.missingChannel" : "backup.missingRole", { name: missing.name });
}

export function sectionList(actions: readonly RestorableAction[], t: TFunction): string {
	return actions.map((action) => t(BACKUP_SECTION_LABELS[action])).join(t("common.listSeparator"));
}

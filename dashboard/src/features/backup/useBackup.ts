import { useMutation, type UseMutationResult, useQueryClient } from "@tanstack/react-query";
import {
	type ChannelSummary,
	RESTORABLE,
	type RestorableAction,
	type RoleSummary,
	BACKUP_LIMITS,
	BACKUP_SECTIONS,
	type BackupStep,
} from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export interface ServerSettings {
	reads: Partial<Record<RestorableAction, unknown>>;
	/** Sections the reader may not read, which a backup or a copy then leaves out. */
	refused: RestorableAction[];
	channels: ChannelSummary[];
	roles: RoleSummary[];
}

const readPath = (action: RestorableAction): string => {
	const entry = RESTORABLE[action];
	return "read" in entry ? entry.read : entry.path;
};

/** Every setting the reader may read, each from the route its own screen reads it from. */
export async function readServerSettings(guildId: string): Promise<ServerSettings> {
	const paths = [...new Set(BACKUP_SECTIONS.map(readPath))];
	const [answers, channels, roles] = await Promise.all([
		Promise.allSettled(paths.map(async (path) => [path, await api.get<unknown>(`/guilds/${guildId}${path}`)] as const)),
		api.get<ChannelSummary[]>(`/guilds/${guildId}/channels`),
		api.get<RoleSummary[]>(`/guilds/${guildId}/roles`),
	]);
	const read = new Map(answers.flatMap((answer) => (answer.status === "fulfilled" ? [answer.value] : [])));

	const reads: ServerSettings["reads"] = {};
	const refused: RestorableAction[] = [];
	for (const action of BACKUP_SECTIONS) {
		const path = readPath(action);
		if (read.has(path)) reads[action] = read.get(path);
		else refused.push(action);
	}
	return { reads, refused, channels, roles };
}

export type StepResult =
	{ action: RestorableAction; ok: true } | { action: RestorableAction; ok: false; error: unknown };

/** Sends each chosen step to its feature's own route, so every gate decides it as it would decide the screen. */
export function useApplyBackup(guildId: string): UseMutationResult<StepResult[], Error, BackupStep[]> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: async (steps) => {
			const results: StepResult[] = [];
			// In turn, so one refusal is reported beside its own section and the rest still go.
			for (const step of steps) {
				const path = `/guilds/${guildId}${step.path}`;
				try {
					await (step.method === "PUT" ? api.put<unknown>(path, step.body) : api.patch<unknown>(path, step.body));
					results.push({ action: step.action, ok: true });
				} catch (error) {
					results.push({ action: step.action, ok: false, error });
				}
			}
			return results;
		},
		onSettled: () => client.invalidateQueries({ queryKey: keys.guild(guildId).all() }),
	});
}

/** Tells the server a program or a script was chosen, by its first bytes; the server judges them before blocking anybody. */
export function useReportProgram(guildId: string): UseMutationResult<void, Error, Uint8Array> {
	return useMutation({
		mutationFn: (bytes: Uint8Array) =>
			api.post<void>(`/guilds/${guildId}/backup/program`, {
				head: Array.from(bytes.subarray(0, BACKUP_LIMITS.reportedBytes)),
			}),
	});
}

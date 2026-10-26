import { type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import {
	type BanBody,
	type GuildWarning,
	type KickBody,
	type LevelBody,
	type MemberDetail,
	type MoneyBody,
	type NicknameBody,
	type TimeoutBody,
	type WarningAdded,
} from "@testify/shared";
import {
	useBan,
	useChangeMoney,
	useKick,
	useLiftSoftban,
	useLiftTimeout,
	useMemberDetail,
	useRename,
	useSetLevel,
	useTimeout,
} from "@/features/members/useMemberDetail";
import { useAddWarning, useClearWarnings, useEditWarning, useRemoveWarning } from "@/features/warnings/useWarnings";

interface MemberActions {
	member: UseQueryResult<MemberDetail>;
	warn: UseMutationResult<WarningAdded, Error, { userId: string; reason: string }>;
	edit: UseMutationResult<GuildWarning, Error, { userId: string; warnId: string; reason: string }>;
	remove: UseMutationResult<void, Error, { userId: string; warnId: string }>;
	clear: UseMutationResult<void, Error, { userId: string }>;
	money: UseMutationResult<MemberDetail, Error, MoneyBody>;
	level: UseMutationResult<MemberDetail, Error, LevelBody>;
	lift: UseMutationResult<MemberDetail, Error, void>;
	kick: UseMutationResult<MemberDetail, Error, KickBody>;
	ban: UseMutationResult<MemberDetail, Error, BanBody>;
	timeout: UseMutationResult<MemberDetail, Error, TimeoutBody>;
	liftTimeout: UseMutationResult<MemberDetail, Error, void>;
	rename: UseMutationResult<MemberDetail, Error, NicknameBody>;
	/** Any write in flight disables every control, so two cannot race on one member. */
	busy: boolean;
	/** The first failure of whichever write produced one, so the page shows one message rather than several. */
	failure: Error | null;
}

export function useMemberActions(guildId: string, userId: string): MemberActions {
	const member = useMemberDetail(guildId, userId);
	const warn = useAddWarning(guildId);
	const edit = useEditWarning(guildId);
	const remove = useRemoveWarning(guildId);
	const clear = useClearWarnings(guildId);
	const money = useChangeMoney(guildId, userId);
	const level = useSetLevel(guildId, userId);
	const lift = useLiftSoftban(guildId, userId);
	const kick = useKick(guildId, userId);
	const ban = useBan(guildId, userId);
	const timeout = useTimeout(guildId, userId);
	const liftTimeout = useLiftTimeout(guildId, userId);
	const rename = useRename(guildId, userId);

	const writes = [warn, edit, remove, clear, money, level, lift, kick, ban, timeout, liftTimeout, rename];

	return {
		member,
		warn,
		edit,
		remove,
		clear,
		money,
		level,
		lift,
		kick,
		ban,
		timeout,
		liftTimeout,
		rename,
		busy: writes.some((write) => write.isPending),
		failure: writes.map((write) => write.error).find((error) => error !== null) ?? null,
	};
}

import { type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type LevelBody, type MemberDetail, type MoneyBody } from "@testify/shared";
import {
	useChangeMoney,
	useClearWarnings,
	useLiftSoftban,
	useMemberDetail,
	useRemoveWarning,
	useSetLevel,
	useWarn,
} from "@/features/members/useMemberDetail";

export interface MemberActions {
	member: UseQueryResult<MemberDetail>;
	warn: UseMutationResult<MemberDetail, Error, string>;
	remove: UseMutationResult<MemberDetail, Error, string>;
	clear: UseMutationResult<MemberDetail, Error, void>;
	money: UseMutationResult<MemberDetail, Error, MoneyBody>;
	level: UseMutationResult<MemberDetail, Error, LevelBody>;
	lift: UseMutationResult<MemberDetail, Error, void>;
	/** Any write in flight disables every control, so two cannot race on one member. */
	busy: boolean;
	/** The first failure of whichever write produced one, so the page shows one message rather than six. */
	failure: Error | null;
}

export function useMemberActions(guildId: string, userId: string): MemberActions {
	const member = useMemberDetail(guildId, userId);
	const warn = useWarn(guildId, userId);
	const remove = useRemoveWarning(guildId, userId);
	const clear = useClearWarnings(guildId, userId);
	const money = useChangeMoney(guildId, userId);
	const level = useSetLevel(guildId, userId);
	const lift = useLiftSoftban(guildId, userId);

	const writes = [warn, remove, clear, money, level, lift];

	return {
		member,
		warn,
		remove,
		clear,
		money,
		level,
		lift,
		busy: writes.some((write) => write.isPending),
		failure: writes.map((write) => write.error).find((error) => error !== null) ?? null,
	};
}

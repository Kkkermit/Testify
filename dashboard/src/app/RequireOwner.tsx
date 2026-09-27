import { Navigate, Outlet } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { useRecheckOnRefusal } from "@/app/useRecheckOnRefusal";
import { Skeleton } from "@/components/primitives";
import { useMe } from "@/features/auth/useMe";
import { useOwnerAccess } from "@/features/owner/useOwner";
import { isRefusal } from "@/lib/api";
import { keys } from "@/lib/queries";

/** Read by the server list, which says why the reader landed there. */
export const OWNER_ONLY_NOTICE = "owner-only";

/**
 * Draws nothing until the server has confirmed ownership, because `isOwner` on `/auth/me` can be rewritten in the
 * reader's own browser; the API refuses every owner request regardless, and this only decides what the page shows.
 */
export function RequireOwner(): React.JSX.Element {
	const me = useMe();
	const claimsOwner = me.data?.isOwner === true;
	const access = useOwnerAccess(claimsOwner);
	useRecheckOnRefusal((key) => key[0] === "owner", keys.owner.access());

	if (me.isPending || (claimsOwner && access.isPending)) return <Skeleton className="h-64 w-full" />;
	if (!claimsOwner || isRefusal(access.error)) {
		return <Navigate to="/guilds" replace state={{ notice: OWNER_ONLY_NOTICE }} />;
	}
	// A network fault is not a refusal, so an owner whose bot is restarting is offered a retry rather than ejected.
	if (access.isError) return <ErrorState error={access.error} onRetry={() => void access.refetch()} />;

	return <Outlet />;
}

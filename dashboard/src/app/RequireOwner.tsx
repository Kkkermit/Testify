import { Navigate, Outlet } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { useOwnerAccess } from "@/app/useOwnerAccess";
import { useRecheckOnRefusal } from "@/app/useRecheckOnRefusal";
import { Skeleton } from "@/components/primitives";
import { useMe } from "@/features/auth/useMe";
import { isRefusal } from "@/lib/api";
import { keys } from "@/lib/queries";

export const OWNER_ONLY_NOTICE = "owner-only";

/** `isOwner` on `/auth/me` can be rewritten in the browser, so nothing draws until the server confirms ownership. */
export function RequireOwner(): React.JSX.Element {
	const me = useMe();
	const claimsOwner = me.data?.isOwner === true;
	const access = useOwnerAccess(claimsOwner);
	useRecheckOnRefusal((key) => key[0] === "owner", keys.owner.access());

	if (me.isPending || (claimsOwner && access.isPending)) return <Skeleton className="h-64 w-full" />;
	if (!claimsOwner || isRefusal(access.error)) {
		return <Navigate to="/guilds" replace state={{ notice: OWNER_ONLY_NOTICE }} />;
	}
	if (access.isError) return <ErrorState error={access.error} onRetry={() => void access.refetch()} />;

	return <Outlet />;
}

import { Outlet } from "react-router";
import { Skeleton } from "@/components/primitives";
import { useMe } from "@/features/auth/useMe";
import { NotFoundContent } from "@/features/not-found/NotFoundPage";

/**
 * Not access control — `requireOwner` refuses every owner route regardless — but it is what keeps the API's
 * refusal and the page agreeing.
 *
 * The API answers **404** rather than 403 so a server manager never learns the console is there. Rendering the
 * console shell to anyone who types the address undoes that: the data never arrives, but the title and all
 * eight tab names do, which names the whole feature set. Showing the same 404 a mistyped address gets is what
 * makes the two surfaces tell one story.
 */
export function RequireOwner(): React.JSX.Element {
	const me = useMe();

	if (me.isPending) return <Skeleton className="h-64 w-full" />;
	if (me.data?.isOwner !== true) return <NotFoundContent />;

	return <Outlet />;
}

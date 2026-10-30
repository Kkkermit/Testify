import { Outlet, ScrollRestoration, useLocation } from "react-router";
import { remembersScroll } from "@/lib/trail";

/** Above every page: a new site page opens at its top, and going back returns to the place on the page it was left. */
export function ScrollMemory(): React.JSX.Element {
	const { pathname } = useLocation();

	return (
		<>
			{/* The dashboard's screens keep their filters in the address, and a reset to the top would undo each one. */}
			{remembersScroll(pathname) && <ScrollRestoration />}
			<Outlet />
		</>
	);
}

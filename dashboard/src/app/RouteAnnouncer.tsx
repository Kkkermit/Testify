import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

/**
 * Announces the page a navigation landed on.
 *
 * A single-page app replaces the content without a page load, so a screen reader is given no signal that
 * anything happened — the user is left on a page that has silently become a different one. This reads the title
 * the new screen set and says it once.
 *
 * The first render is skipped: arriving at a page is already announced by the page load itself.
 */
export function RouteAnnouncer(): React.JSX.Element {
	const { pathname } = useLocation();
	const [message, setMessage] = useState("");
	const firstRender = useRef(true);

	useEffect(() => {
		if (firstRender.current) {
			firstRender.current = false;
			return;
		}

		// `usePageTitle` runs in its own effect on the new screen, so this waits a frame for it to land.
		const timer = setTimeout(() => {
			setMessage(document.title);
		}, 100);

		return () => {
			clearTimeout(timer);
		};
	}, [pathname]);

	return (
		<p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
			{message}
		</p>
	);
}

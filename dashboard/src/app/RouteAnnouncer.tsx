import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

/**
 * A single-page app replaces its content without a page load, so a screen reader gets no signal that the page
 * changed at all. This reads the title the new screen set and says it once; the first render is skipped, since
 * the page load announces that one itself.
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

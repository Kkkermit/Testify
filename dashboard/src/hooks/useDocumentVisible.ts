import { useEffect, useState } from "react";

/** A background tab still runs its animation loop unless something stops it, which is a laptop's battery. */
export function useDocumentVisible(): boolean {
	const [visible, setVisible] = useState(() => !document.hidden);

	useEffect(() => {
		const onChange = (): void => {
			setVisible(!document.hidden);
		};

		document.addEventListener("visibilitychange", onChange);
		return () => {
			document.removeEventListener("visibilitychange", onChange);
		};
	}, []);

	return visible;
}

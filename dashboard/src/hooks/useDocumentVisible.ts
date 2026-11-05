import { useEffect, useState } from "react";

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

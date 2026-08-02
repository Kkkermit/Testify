import { useEffect, useState } from "react";

/**
 * Trails `value` by `delay`, so a control that is typed into can stay responsive while whatever it drives — a
 * request, an expensive filter — runs once the typing stops.
 */
export function useDebounced<Value>(value: Value, delay = 300): Value {
	const [settled, setSettled] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => {
			setSettled(value);
		}, delay);

		return () => {
			clearTimeout(timer);
		};
	}, [value, delay]);

	return settled;
}

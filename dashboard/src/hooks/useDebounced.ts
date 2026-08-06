import { useEffect, useState } from "react";

/** Trails `value` by `delay`, so a control stays responsive while whatever it drives runs once the typing stops. */
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

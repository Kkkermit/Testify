import { useEffect, useState } from "react";

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

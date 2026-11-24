import { type FocusEvent, type MouseEvent } from "react";

interface LeaveHandlers {
	onBlur: (event: FocusEvent<HTMLElement>) => void;
	onMouseDown: (event: MouseEvent<HTMLElement>) => void;
}

/** For the element holding a field and its own buttons: leaving the group saves, and moving between them does not. */
export function savesOnLeave(save: () => void): LeaveHandlers {
	return {
		onBlur: (event) => {
			if (!event.currentTarget.contains(event.relatedTarget)) save();
		},
		// Safari never focuses a pressed button, so without this the field is left, and saved, before Save or Discard runs.
		onMouseDown: (event) => {
			if (event.target instanceof Element && event.target.closest("button") !== null) event.preventDefault();
		},
	};
}

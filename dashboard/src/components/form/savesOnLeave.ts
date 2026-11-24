import { type FocusEvent, type MouseEvent } from "react";

interface LeaveHandlers {
	onBlur: (event: FocusEvent<HTMLElement>) => void;
	onMouseDown: (event: MouseEvent<HTMLElement>) => void;
}

/** For a button that acts on a field saved when it is left, so pressing it does not leave and save the field first. */
export function holdsFocus(event: MouseEvent<HTMLElement>): void {
	// Safari never focuses a pressed button, so without this the field is left before the press lands.
	event.preventDefault();
}

/** For the element holding a field and its own buttons: leaving the group saves, and moving between them does not. */
export function savesOnLeave(save: () => void): LeaveHandlers {
	return {
		onBlur: (event) => {
			if (!event.currentTarget.contains(event.relatedTarget)) save();
		},
		onMouseDown: (event) => {
			if (event.target instanceof Element && event.target.closest("button") !== null) holdsFocus(event);
		},
	};
}

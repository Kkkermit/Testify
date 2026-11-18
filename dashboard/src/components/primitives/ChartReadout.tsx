import { type ReactNode, useEffect, useRef } from "react";
import tippy, { type Instance } from "tippy.js";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/cn";
import "tippy.js/dist/tippy.css";

const READOUT = "data-readout";

const OPEN_DELAY_MS = 350;
const CLOSE_DELAY_MS = 120;
/** How far a finger may drift before a tap is a slide along the chart instead. */
const TAP_SLOP_PX = 8;
const POINTER_FOCUS_MS = 800;

export interface ReadoutMove {
	at: number;
	count: number;
	columns: number | undefined;
	key: string;
}

/** Where a key moves the picked cell, or null for a key the chart leaves alone. */
export function nextCell({ at, count, columns, key }: ReadoutMove): number | null {
	const last = count - 1;
	const rowStart = columns === undefined ? 0 : at - (at % columns);
	const rowEnd = columns === undefined ? last : Math.min(last, rowStart + columns - 1);

	switch (key) {
		case "ArrowRight":
			return Math.min(at + 1, last);
		case "ArrowLeft":
			return Math.max(at - 1, 0);
		case "ArrowDown":
			return columns === undefined ? null : at + columns <= last ? at + columns : at;
		case "ArrowUp":
			return columns === undefined ? null : at - columns >= 0 ? at - columns : at;
		case "Home":
			return rowStart;
		case "End":
			return rowEnd;
		default:
			return null;
	}
}

/**
 * One tooltip box for a whole chart: hover, a tap or a finger sliding along it picks a cell, and the arrow keys move
 * through them, so the figures are reachable without a mouse.
 */
export function ChartReadout({
	label,
	columns,
	column = false,
	slide = false,
	className,
	children,
}: {
	label: string;
	/** Cells per row, for a grid the up and down keys move through. */
	columns?: number;
	/** Point at the cell's column from above the chart, so the box never covers a bar. */
	column?: boolean;
	/** Let a finger slide sideways along the chart, while an upward or downward swipe still scrolls the page. */
	slide?: boolean;
	className?: string;
	children: ReactNode;
}): React.JSX.Element {
	const frameRef = useRef<HTMLDivElement>(null);
	const instanceRef = useRef<Instance | null>(null);
	const activeRef = useRef<HTMLElement | null>(null);
	const reduced = usePrefersReducedMotion();

	useEffect(() => {
		const frame = frameRef.current;
		if (frame === null) return;

		let opening: ReturnType<typeof setTimeout> | undefined;
		let closing: ReturnType<typeof setTimeout> | undefined;
		let press: { x: number; y: number; sliding: boolean } | null = null;
		let pointerAt = Number.NEGATIVE_INFINITY;
		let keyboardFocus = false;
		let touchOffset = false;
		// Written in place as the pick moves, because `setContent` rebuilds the popper every time.
		const text = document.createElement("span");

		const instance = tippy(frame, {
			content: text,
			theme: "testify",
			trigger: "manual",
			placement: "top",
			offset: [0, 8],
			hideOnClick: false,
			duration: reduced ? 0 : 120,
			aria: { content: "describedby", expanded: false },
			appendTo: () => document.body,
			getReferenceClientRect: () => {
				const cell = activeRef.current;
				if (cell === null) return frame.getBoundingClientRect();
				const at = cell.getBoundingClientRect();
				if (!column) return at;
				const top = frame.getBoundingClientRect().top;
				return new DOMRect(at.left, top, at.width, at.bottom - top);
			},
		});
		instanceRef.current = instance;

		const cells = (): HTMLElement[] => [...frame.querySelectorAll<HTMLElement>(`[${READOUT}]`)];
		const cellOf = (target: EventTarget | null): HTMLElement | null => {
			const cell = target instanceof Element ? target.closest<HTMLElement>(`[${READOUT}]`) : null;
			return cell !== null && frame.contains(cell) ? cell : null;
		};
		// A touch stays with the element it started on, so a sliding finger is found by where it is now.
		const cellUnder = (event: PointerEvent): HTMLElement | null => {
			if (event.pointerType !== "touch" || typeof document.elementFromPoint !== "function") return cellOf(event.target);
			const hit = cellOf(document.elementFromPoint(event.clientX, event.clientY));
			if (hit !== null || !column) return hit;
			return (
				cells().find((cell) => {
					const box = cell.getBoundingClientRect();
					return event.clientX >= box.left && event.clientX <= box.right;
				}) ?? null
			);
		};

		const pick = (cell: HTMLElement, touch = false): void => {
			clearTimeout(opening);
			clearTimeout(closing);
			if (activeRef.current !== cell) {
				activeRef.current?.removeAttribute("data-active");
				cell.setAttribute("data-active", "");
				activeRef.current = cell;
			}
			if (touch !== touchOffset) {
				touchOffset = touch;
				instance.setProps({ offset: [0, touch ? 16 : 8] });
			}
			text.textContent = cell.getAttribute(READOUT) ?? "";
			if (instance.state.isVisible) void instance.popperInstance?.update();
			else instance.show();
		};
		const dismiss = (): void => {
			clearTimeout(opening);
			clearTimeout(closing);
			activeRef.current?.removeAttribute("data-active");
			activeRef.current = null;
			instance.hide();
		};

		const onPointerMove = (event: PointerEvent): void => {
			if (event.pointerType === "touch") {
				if (press === null) return;
				if (!press.sliding && Math.abs(event.clientX - press.x) > TAP_SLOP_PX) press.sliding = true;
				const cell = press.sliding ? cellUnder(event) : null;
				if (cell !== null) pick(cell, true);
				return;
			}

			const cell = cellOf(event.target);
			if (cell === null) return;
			clearTimeout(closing);
			if (instance.state.isVisible) {
				pick(cell);
				return;
			}
			clearTimeout(opening);
			opening = setTimeout(() => {
				pick(cell);
			}, OPEN_DELAY_MS);
		};
		const onPointerLeave = (event: PointerEvent): void => {
			if (event.pointerType === "touch") return;
			clearTimeout(opening);
			if (keyboardFocus) return;
			closing = setTimeout(dismiss, CLOSE_DELAY_MS);
		};
		const onPointerDown = (event: PointerEvent): void => {
			pointerAt = event.timeStamp;
			if (event.pointerType === "touch") press = { x: event.clientX, y: event.clientY, sliding: false };
		};
		const onPointerUp = (event: PointerEvent): void => {
			pointerAt = event.timeStamp;
			if (event.pointerType !== "touch" || press === null) return;
			const tapped = !press.sliding;
			press = null;
			if (!tapped) return;
			const cell = cellUnder(event);
			if (cell === null) return;
			if (cell === activeRef.current && instance.state.isVisible) dismiss();
			else pick(cell, true);
		};
		const onPointerCancel = (): void => {
			press = null;
		};

		// A tap focuses the chart after it lifts, so focus soon after a press is the pointer's, not the keyboard's.
		const onFocusIn = (event: FocusEvent): void => {
			if (event.timeStamp - pointerAt < POINTER_FOCUS_MS) return;
			keyboardFocus = true;
			const first = activeRef.current ?? cells()[0];
			if (first !== undefined) pick(first);
		};
		const onFocusOut = (event: FocusEvent): void => {
			if (frame.contains(event.relatedTarget as Node | null)) return;
			keyboardFocus = false;
			dismiss();
		};
		const onKeyDown = (event: KeyboardEvent): void => {
			const all = cells();
			const current = activeRef.current === null ? -1 : all.indexOf(activeRef.current);
			const moved = nextCell({ at: Math.max(current, 0), count: all.length, columns, key: event.key });
			if (moved === null) return;
			event.preventDefault();
			const cell = all[current === -1 ? 0 : moved];
			if (cell !== undefined) pick(cell);
		};

		// Escape dismisses a box the pointer opened too, whatever has focus (WCAG 2.2, 1.4.13).
		const onDocumentKey = (event: KeyboardEvent): void => {
			if (event.key === "Escape") dismiss();
		};
		const onDocumentPress = (event: PointerEvent): void => {
			if (instance.state.isVisible && !frame.contains(event.target as Node | null)) dismiss();
		};

		frame.addEventListener("pointermove", onPointerMove);
		frame.addEventListener("pointerleave", onPointerLeave);
		frame.addEventListener("pointerdown", onPointerDown);
		frame.addEventListener("pointerup", onPointerUp);
		frame.addEventListener("pointercancel", onPointerCancel);
		frame.addEventListener("focusin", onFocusIn);
		frame.addEventListener("focusout", onFocusOut);
		frame.addEventListener("keydown", onKeyDown);
		document.addEventListener("keydown", onDocumentKey);
		document.addEventListener("pointerdown", onDocumentPress);

		return () => {
			clearTimeout(opening);
			clearTimeout(closing);
			frame.removeEventListener("pointermove", onPointerMove);
			frame.removeEventListener("pointerleave", onPointerLeave);
			frame.removeEventListener("pointerdown", onPointerDown);
			frame.removeEventListener("pointerup", onPointerUp);
			frame.removeEventListener("pointercancel", onPointerCancel);
			frame.removeEventListener("focusin", onFocusIn);
			frame.removeEventListener("focusout", onFocusOut);
			frame.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("keydown", onDocumentKey);
			document.removeEventListener("pointerdown", onDocumentPress);
			activeRef.current?.removeAttribute("data-active");
			activeRef.current = null;
			instanceRef.current = null;
			instance.destroy();
		};
	}, [columns, column, reduced]);

	// New figures under a picked cell are read out at once, and a cell that is gone takes its box with it.
	useEffect(() => {
		const instance = instanceRef.current;
		const cell = activeRef.current;
		if (instance === null || cell === null) return;
		if (frameRef.current?.contains(cell) === true) {
			const text = instance.props.content;
			if (text instanceof HTMLElement) text.textContent = cell.getAttribute(READOUT) ?? "";
			return;
		}
		activeRef.current = null;
		instance.hide();
	});

	return (
		<div
			ref={frameRef}
			role="group"
			aria-label={label}
			tabIndex={0}
			className={cn("rounded-field", slide && "touch-pan-y")}
		>
			<div aria-hidden="true" className={className}>
				{children}
			</div>
		</div>
	);
}

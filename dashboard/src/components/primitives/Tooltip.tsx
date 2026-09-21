import { cloneElement, useEffect, useRef, type ReactElement, type Ref } from "react";
import tippy, { type Instance, type Placement } from "tippy.js";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import "tippy.js/dist/tippy.css";

/** Describes, never names — hence `describedby`. Drives tippy.js directly: `@tippyjs/react` reads `element.ref`, removed in React 19. */
export function Tooltip({
	label,
	placement = "top",
	children,
}: {
	label: string;
	placement?: Placement;
	children: ReactElement<{ ref?: Ref<HTMLElement> }>;
}): React.JSX.Element {
	const anchorRef = useRef<HTMLElement>(null);
	const reduced = usePrefersReducedMotion();

	useEffect(() => {
		const anchor = anchorRef.current;
		if (anchor === null) return;

		const instance: Instance = tippy(anchor, {
			content: label,
			theme: "testify",
			placement,
			// Long enough not to fire while the pointer crosses a row of icons on its way somewhere else, and
			// slow enough to leave that the pointer can reach the box itself (WCAG 2.2 1.4.13, hoverable).
			delay: [350, 120],
			interactive: true,
			interactiveBorder: 8,
			duration: reduced ? 0 : 120,
			// `focusin` is what carries focus through to the anchor, so a keyboard reaches this too.
			trigger: "mouseenter focusin",
			aria: { content: "describedby", expanded: false },
			appendTo: () => document.body,
		});

		// tippy binds no key handler of its own, so without this a tooltip covering the thing underneath it
		// cannot be got rid of without moving the pointer or the focus (WCAG 2.2 1.4.13, dismissible).
		const dismiss = (event: KeyboardEvent): void => {
			if (event.key === "Escape") instance.hide();
		};

		document.addEventListener("keydown", dismiss);

		return () => {
			document.removeEventListener("keydown", dismiss);
			instance.destroy();
		};
	}, [label, placement, reduced]);

	return cloneElement(children, { ref: anchorRef });
}

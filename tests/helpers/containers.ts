import { type ContainerMessage } from "@lib/containers.util";

/**
 * Reading a Components V2 payload back out.
 *
 * A container nests sections inside containers and buttons inside sections, so
 * asserting on one means walking the tree rather than indexing into a flat list
 * of rows the way an embed screen allowed.
 */

function walk(rendered: ContainerMessage, visit: (node: Record<string, unknown>) => void): void {
	const descend = (node: unknown): void => {
		if (node === null || typeof node !== "object") return;
		const record = node as Record<string, unknown>;

		visit(record);
		for (const value of Object.values(record)) {
			if (Array.isArray(value)) value.forEach(descend);
			else if (typeof value === "object") descend(value);
		}
	};

	rendered.components.forEach((component) => descend(component.toJSON()));
}

/** Every custom ID anywhere in the container, however deeply nested. */
export function idsOf(rendered: ContainerMessage): string[] {
	const found: string[] = [];
	walk(rendered, (node) => {
		if (typeof node.custom_id === "string") found.push(node.custom_id);
	});
	return found;
}

/** Anything with `components`, so this works on a V2 container and on plain rows alike. */
interface Rendered {
	components: readonly unknown[];
}

/** Every custom ID in a rendered message, whichever component style it uses. */
export function customIdsOf(rendered: Rendered): string[] {
	const found: string[] = [];

	const descend = (node: unknown): void => {
		if (node === null || typeof node !== "object") return;
		const record = node as Record<string, unknown>;

		if (typeof record.custom_id === "string") found.push(record.custom_id);
		for (const value of Object.values(record)) {
			if (Array.isArray(value)) value.forEach(descend);
			else if (typeof value === "object") descend(value);
		}
	};

	for (const component of rendered.components) {
		const asBuilder = component as { toJSON?: () => unknown };
		descend(typeof asBuilder.toJSON === "function" ? asBuilder.toJSON() : component);
	}

	return found;
}

/**
 * Custom IDs that appear more than once.
 *
 * Discord rejects the **entire message** with `COMPONENT_CUSTOM_ID_DUPLICATED`
 * when two components share an ID — including disabled ones, which is what made
 * a one-page leaderboard impossible to send. Assert this is empty on any screen
 * that builds IDs from state.
 */
export function duplicateIds(rendered: Rendered): string[] {
	const seen = new Set<string>();
	const repeated = new Set<string>();

	for (const id of customIdsOf(rendered)) {
		if (seen.has(id)) repeated.add(id);
		seen.add(id);
	}

	return [...repeated];
}

/** Every button in the container, in the order it appears. */
export function buttonsOf(rendered: ContainerMessage): Record<string, unknown>[] {
	const found: Record<string, unknown>[] = [];
	walk(rendered, (node) => {
		if (node.type === 2) found.push(node);
	});
	return found;
}

/** All the rendered markdown, joined, so copy can be asserted on. */
export function textOf(rendered: ContainerMessage): string {
	const found: string[] = [];
	walk(rendered, (node) => {
		if (typeof node.content === "string") found.push(node.content);
	});
	return found.join("\n");
}

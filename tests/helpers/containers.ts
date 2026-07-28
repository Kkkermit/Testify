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

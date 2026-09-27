/** A bordered dot, never the name's colour: a role set to `#1a1a1a` would be invisible on this background. */
export function RoleSwatch({ name, colour }: { name: string; colour: string | null }): React.JSX.Element {
	return (
		<span className="flex min-w-0 items-center gap-2">
			<span
				aria-hidden="true"
				className="border-input size-2.5 shrink-0 rounded-full border"
				style={colour === null ? undefined : { backgroundColor: colour }}
			/>
			<span className="truncate">{name}</span>
		</span>
	);
}

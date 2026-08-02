/**
 * A role's colour as a bordered dot, never as the name's colour: a role set to `#1a1a1a` would be invisible as
 * text on this background. The border is what keeps a dark swatch visible against the surface.
 */
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

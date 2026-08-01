/**
 * A role's colour as a bordered dot beside its name, never as the name's colour.
 *
 * Role colours are chosen by whoever made the role, so plenty of them are unreadable on a near-black page — one
 * set to `#1a1a1a` would be invisible as text. The border keeps a dark swatch visible against the surface, and
 * the name stays at full contrast.
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

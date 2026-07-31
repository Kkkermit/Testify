/**
 * A guild with no icon is common, and a broken image is the first thing anyone sees in the picker — so the
 * fallback is a lettered tile rather than an alt attribute.
 */
export function GuildIcon({
	name,
	url,
	size = 40,
}: {
	name: string;
	url: string | null;
	size?: number;
}): React.JSX.Element {
	const style = { width: size, height: size };

	if (url === null) {
		return (
			<div
				className="bg-muted text-muted-foreground flex shrink-0 items-center justify-center rounded-full text-sm font-semibold"
				style={style}
				aria-hidden="true"
			>
				{[...name][0]?.toUpperCase() ?? "?"}
			</div>
		);
	}

	return <img src={url} alt="" className="shrink-0 rounded-full" style={style} loading="lazy" />;
}

/** The types more than one module in this domain shares. */

export interface BoardRow {
	rank: number;
	displayName: string;
	avatarUrl: string;
	/** The figure the board is ranked by — a balance, or `Level 12`. */
	primary: string;
	/** The supporting figure, in smaller grey text under the name. */
	secondary: string;
	/** The person reading, whose row is outlined. */
	you?: boolean;
}

export type BoardTheme = "money" | "levels";

export interface BoardCard {
	theme: BoardTheme;
	title: string;
	subtitle: string;
	rows: BoardRow[];
	/** The reader's own row, drawn apart when they are not in `rows`. */
	viewer: BoardRow | null;
	/** Said where the reader's row would go when they are not ranked at all. */
	unranked: string | null;
	empty: string;
	footer: string;
}

/** The types more than one module in this domain shares. */

export interface BoardRow {
	rank: number;
	displayName: string;
	avatarUrl: string;
	/** The headline figure — `Level 12`, or a balance. */
	primary: string;
	/** The supporting figure, in smaller grey text. */
	secondary: string;
}

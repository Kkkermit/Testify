import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import { OwnerRouteError } from "@/app/OwnerRouteError";
import { OWNER_ONLY_NOTICE } from "@/app/RequireOwner";
import { claimAutoReload, reloadPage } from "@/app/routeError.utils";

jest.mock("@/app/routeError.utils", () => ({
	...jest.requireActual<object>("@/app/routeError.utils"),
	claimAutoReload: jest.fn(),
	reloadPage: jest.fn(),
}));

const REFUSED_FILE = new TypeError(
	"Failed to fetch dynamically imported module: https://testify.lol/assets/OwnerPage-x.js",
);

function Landed(): React.JSX.Element {
	const location = useLocation();
	return <p>{`${location.pathname} ${String((location.state as { notice?: string } | null)?.notice)}`}</p>;
}

function renderFailing(thrown: unknown): void {
	function Thrower(): never {
		throw thrown;
	}
	const router = createMemoryRouter(
		[
			{ path: "/owner", element: <Thrower />, errorElement: <OwnerRouteError /> },
			{ path: "/guilds", element: <Landed /> },
		],
		{ initialEntries: ["/owner"] },
	);
	render(<RouterProvider router={router} />);
}

beforeEach(() => jest.clearAllMocks());

describe("the owner console failing to load", () => {
	/** An owner whose tab predates a deploy asks for a file that has moved; one reload fetches the new one. */
	it("reloads once, in case the tab is stale", () => {
		jest.mocked(claimAutoReload).mockReturnValue(true);
		renderFailing(REFUSED_FILE);

		expect(reloadPage).toHaveBeenCalledTimes(1);
	});

	/** Somebody who faked the access check is refused the file; after the reload they are sent away, not invited to retry. */
	it("sends the reader back to their servers with the owner-only notice once a reload has not helped", async () => {
		jest.mocked(claimAutoReload).mockReturnValue(false);
		renderFailing(REFUSED_FILE);

		expect(await screen.findByText(`/guilds ${OWNER_ONLY_NOTICE}`)).toBeInTheDocument();
		expect(reloadPage).not.toHaveBeenCalled();
	});

	it("shows the ordinary error screen for a crash that is not a refused file", async () => {
		renderFailing(new Error("boom"));

		await waitFor(() => expect(screen.queryByText(/\/guilds/)).not.toBeInTheDocument());
		expect(claimAutoReload).not.toHaveBeenCalled();
	});
});

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { AccountPage } from "@/features/account/AccountPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function erasing(): { bodies: unknown[] } {
	const sent = { bodies: [] as unknown[] };
	server.use(
		http.post("/api/auth/erase", async ({ request }) => {
			sent.bodies.push(await request.json());
			return new HttpResponse(null, { status: 204 });
		}),
	);
	return sent;
}

describe("the account page", () => {
	/** It cannot be undone, so nothing is sent until the reader has typed their own username back. */
	it("deletes nothing until the username is typed, then deletes and leaves for the home page", async () => {
		const sent = erasing();
		const user = userEvent.setup();
		const { pathname } = renderWithProviders(<AccountPage />, { path: "*", route: "/account" });

		await user.click(await screen.findByRole("button", { name: "Delete my data" }));
		expect(screen.getByText(/can’t be undone/)).toBeInTheDocument();

		const confirm = screen.getByRole("button", { name: "Delete everything" });
		await user.type(await screen.findByLabelText(/type your username, someone/i), "somebody");
		expect(confirm).toBeDisabled();

		await user.clear(screen.getByLabelText(/type your username/i));
		await user.type(screen.getByLabelText(/type your username/i), "someone");
		await user.click(confirm);

		await waitFor(() => {
			expect(pathname()).toBe("/");
		});
		expect(sent.bodies).toEqual([{ confirm: "someone" }]);
	});

	it("says so when the delete fails, and stays where it is", async () => {
		server.use(
			http.post("/api/auth/erase", () => HttpResponse.json({ error: { code: "x", message: "x" } }, { status: 500 })),
		);
		const user = userEvent.setup();
		const { pathname } = renderWithProviders(<AccountPage />, { path: "*", route: "/account" });

		await user.click(await screen.findByRole("button", { name: "Delete my data" }));
		await user.type(await screen.findByLabelText(/type your username, someone/i), "someone");
		await user.click(screen.getByRole("button", { name: "Delete everything" }));

		expect(await screen.findByText(/couldn’t be deleted/)).toBeInTheDocument();
		expect(pathname()).toBe("/account");
	});

	it("passes axe with the confirmation open", async () => {
		const user = userEvent.setup();
		const { container } = renderWithProviders(<AccountPage />, { path: "*", route: "/account" });

		await user.click(await screen.findByRole("button", { name: "Delete my data" }));
		await screen.findByLabelText(/type your username, someone/i);
		await expectNoViolations(container);
	});
});

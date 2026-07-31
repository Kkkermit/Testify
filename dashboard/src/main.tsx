import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App";
import "@/index.css";

const root = document.getElementById("root");
if (root === null) throw new Error("index.html is missing #root, so there is nowhere to mount.");

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>,
);

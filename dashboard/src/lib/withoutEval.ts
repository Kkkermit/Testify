import { config } from "zod";

// The page's CSP forbids `eval`, so zod's probe for it only raises a violation on every load; it is told not to try.
config({ jitless: true });

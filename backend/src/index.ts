import { run as runMcp } from "./mcp/stdioServer.js";
import { run as runHttp } from "./http/httpServer.js";

// This file is the main entry point if run via "node dist/index.js".
// It defaults to HTTP mode, but can be switched via MODE=mcp.

import { config } from "./config/env.js";

const mode = config.MODE;

if (mode === "mcp") {
    runMcp();
} else {
    runHttp();
}

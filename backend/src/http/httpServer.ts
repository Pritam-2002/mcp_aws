import { createApp } from "./app.js";
import { log, error } from "../utils/logger.js";
import { fileURLToPath } from "url";

import { config } from "../config/env.js";

export async function run() {
    const PORT = config.PORT;

    try {
        const app = createApp();

        app.listen(PORT, () => {
            log(`HTTP Server running on port ${PORT}`);
        });
    } catch (err) {
        error("Failed to start HTTP server:", err);
        process.exit(1);
    }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
    run();
}

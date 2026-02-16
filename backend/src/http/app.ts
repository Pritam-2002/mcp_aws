import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes.js";
import { errorHandler } from "./middleware/error.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = () => {
    const app = express();

    app.use(helmet());
    app.use(cors()); // Configure origin in production!
    app.use(morgan("combined"));
    app.use(express.json());

    app.use("/api", routes);

    // Serve frontend static files
    // In production, frontend build is at ../../public relative to dist/http/app.js
    const publicPath = path.join(__dirname, "../../../public");
    // Double check path: dist/http/app.js. ../.. -> dist. ../../../ -> structure root.
    // Dockerfile copies properties to /app/public.
    // If backend is in /app/dist/http/app.js (compiled), then:
    // /app/dist/http -> /app/dist -> /app -> /app/public.
    // So ../../../public is correct if CWD is not reliable, but usage of __dirname is safer.

    // However, in local dev (ts-node): src/http/app.ts
    // ../.. -> src. ../../../ -> backend. ../../../frontend/dist ? 
    // This path depends heavily on build structure.

    // Let's rely on standard folder structure:
    // Production (Docker): /app/dist/http/app.js, public is /app/public. => ../../../public works.
    // Local (dist): backend/dist/http/app.js, public is nowhere unless copied.
    // Local (src): backend/src/http/app.ts

    // We'll use a safer resolution strategy or ENV var.
    const staticDir = process.env.PUBLIC_DIR || path.join(__dirname, "../../../public");

    app.use(express.static(staticDir));

    // Handle SPA routing
    // Express 5 catch-all using middleware pattern avoids path-to-regexp issues
    app.use((req, res, next) => {
        if (req.path.startsWith("/api")) {
            return next();
        }
        res.sendFile(path.join(staticDir, "index.html"));
    });

    app.use(errorHandler);

    return app;
};

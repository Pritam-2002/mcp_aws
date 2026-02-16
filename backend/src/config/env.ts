import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables from .env file ONLY in development
// In production (Docker/Archestra), env vars fit in via the platform
if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

/**
 * Backend Configuration Schema
 */
const configSchema = z.object({
    // Server Config
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    MODE: z.enum(["web", "mcp"]).default("web"),

    // AWS Configuration (Required)
    AWS_REGION: z.string().min(1, "AWS_REGION is required").default("us-east-1"),
    AWS_ACCESS_KEY_ID: z.string().min(1, "AWS_ACCESS_KEY_ID is required"),
    AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS_SECRET_ACCESS_KEY is required"),
});

/**
 * Validate and export configuration
 */
export const config = (() => {
    try {
        return configSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("❌ Invalid environment variables:");
            error.issues.forEach((issue) => {
                console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
            });
            console.error("\nMake sure your .env file is configured correctly provided in .env.example\n");
            process.exit(1);
        }
        throw error;
    }
})();

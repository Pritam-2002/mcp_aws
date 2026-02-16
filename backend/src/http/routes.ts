import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { listInstances } from "../aws/ec2Service.js";
import { getMetricsSummary } from "../engines/metricsEngine.js";
import { fleetHealth } from "../engines/healthEngine.js";
import { log } from "../utils/logger.js";

const router = Router();

// Zod schemas for validation
const metricsSchema = z.object({
    instanceId: z.string(),
    durationMinutes: z.number().default(60),
});

const fleetHealthSchema = z.object({
    durationMinutes: z.number().default(60),
});

// Middleware for async error handling
const asyncWrapper = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// GET /api/health
router.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GET /api/instances
router.get("/instances", asyncWrapper(async (req: Request, res: Response) => {
    log("HTTP Request: List Instances");
    const instances = await listInstances();
    res.json(instances);
}));

// POST /api/metrics
router.post("/metrics", asyncWrapper(async (req: Request, res: Response) => {
    log("HTTP Request: Get Metrics");

    const result = metricsSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({ error: "Invalid input", details: result.error.issues });
    }

    const { instanceId, durationMinutes } = result.data;
    const metrics = await getMetricsSummary(instanceId, durationMinutes);
    res.json(metrics);
}));

// POST /api/fleet-health
router.post("/fleet-health", asyncWrapper(async (req: Request, res: Response) => {
    log("HTTP Request: Fleet Health");

    const result = fleetHealthSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({ error: "Invalid input", details: result.error.issues });
    }

    const { durationMinutes } = result.data;
    const health = await fleetHealth(durationMinutes);
    res.json(health);
}));

export default router;

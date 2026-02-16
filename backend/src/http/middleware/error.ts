import { Request, Response, NextFunction } from "express";
import { log } from "../../utils/logger.js";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    log("HTTP Error:", err.message);

    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(statusCode).json({
        error: message,
        stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    });
};

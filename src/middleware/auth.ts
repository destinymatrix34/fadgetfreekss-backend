import { Request, Response, NextFunction } from "express";

/**
 * Auth middleware — validates the x-api-key header on all /api/* routes.
 * The expected key is set in the backend .env as API_SECRET_KEY.
 * The frontend sends it via VITE_API_SECRET_KEY env var.
 */
export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const secret = process.env.API_SECRET_KEY;

  if (!secret) {
    // Misconfigured server — fail closed
    res.status(500).json({ error: "Server API key not configured." });
    return;
  }

  const provided = req.headers["x-api-key"];

  if (!provided || provided !== secret) {
    res.status(401).json({ error: "Unauthorized: invalid or missing x-api-key." });
    return;
  }

  next();
}

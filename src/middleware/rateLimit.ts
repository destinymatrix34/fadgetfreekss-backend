import rateLimit from "express-rate-limit";

/**
 * 100 requests per 15 minutes per IP.
 * Adjust windowMs / max as needed for your expected traffic.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,  // Return RateLimit-* headers in response
  legacyHeaders: false,
  message: {
    error: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

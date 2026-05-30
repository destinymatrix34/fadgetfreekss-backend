import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "gadgetfreeks-jwt-secret-change-in-production-2026";

/**
 * Helper to dynamically ensure at least one admin exists in MongoDB.
 * Seeds from .env ADMIN_EMAIL and ADMIN_PASSWORD.
 */
async function ensureAdminExists() {
  try {
    const adminCount = await Admin.countDocuments({});
    if (adminCount === 0) {
      console.log("No administrators found in MongoDB. Automatic seeding triggered...");
      const email = process.env.ADMIN_EMAIL || "admin@gadgetfreeks.com";
      const password = process.env.ADMIN_PASSWORD || "GadgetFreeks@2026";

      const newAdmin = new Admin({
        email,
        name: "Head Editor",
      });
      newAdmin.setPassword(password);
      await newAdmin.save();
      console.log(`🌱 Dynamically seeded default admin account: ${email}`);
    }
  } catch (error) {
    console.error("Failed to automatically seed admin account:", error);
  }
}

/**
 * POST /api/admin/login
 * Validates email + password against MongoDB Admin credentials, returns a JWT token.
 */
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    // Ensure at least one admin exists in DB
    await ensureAdminExists();

    // Query DB for this email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    // Verify password hash
    const isPasswordValid = admin.validPassword(password);
    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    // Generate JWT token valid for 24 hours
    const token = jwt.sign(
      { email: admin.email, name: admin.name || "Admin", role: "admin" },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token,
      expiresIn: 86400, // 24h in seconds
    });
  } catch (error: any) {
    console.error("Error in POST /api/admin/login:", error);
    res.status(500).json({ error: "Login failed." });
  }
});

/**
 * GET /api/admin/verify
 * Verifies a JWT token is still valid.
 */
router.get("/verify", (req: Request, res: Response): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided.", valid: false });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    res.json({ valid: true, user: decoded });
  } catch (error: any) {
    res.status(401).json({ error: "Invalid or expired token.", valid: false });
  }
});

export default router;

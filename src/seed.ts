import "dotenv/config";
import mongoose from "mongoose";
import Blog from "./models/Blog";
import Admin from "./models/Admin";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gadgetfreeks";

const sampleBlogs: any[] = [];

async function seed() {
  try {
    console.log("Connecting to MongoDB for GadgetFreeks seeding...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully to DB!");

    // Clear existing blogs
    console.log("Clearing existing blog posts...");
    await Blog.deleteMany({});

    // Insert sample blogs
    console.log("Seeding sample GadgetFreeks blog posts...");
    await Blog.insertMany(sampleBlogs);

    // Clear and seed Admin
    console.log("Clearing existing admin credentials...");
    await Admin.deleteMany({});

    console.log("Seeding admin credentials from .env...");
    const adminEmail = process.env.ADMIN_EMAIL || "admin@gadgetfreeks.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "GadgetFreeks@2026";
    const seedAdmin = new Admin({
      email: adminEmail,
      name: "Head Editor"
    });
    seedAdmin.setPassword(adminPassword);
    await seedAdmin.save();
    console.log(`🌱 Seeded admin credential successfully for ${adminEmail}`);

    console.log(`🌱 Database seeded successfully with ${sampleBlogs.length} tech blog posts!`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();

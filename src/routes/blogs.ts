import { Router, Request, Response } from "express";
import Blog from "../models/Blog";
import { upload, fileToBase64DataUri } from "../middleware/upload";
import { requireApiKey } from "../middleware/auth";

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS (no auth required)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/blogs
 * Fetch a paginated list of published blog posts. Optional category filter.
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 9);
    const category = req.query.category as string | undefined;

    // Filter criteria: must be published
    const filter: Record<string, any> = { published: true };
    if (category && category !== "All") {
      filter.category = category;
    }

    const total = await Blog.countDocuments(filter);
    const posts = await Blog.find(filter)
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      posts,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("Error in GET /api/blogs:", error);
    res.status(500).json({ error: "Failed to fetch blogs." });
  }
});

/**
 * GET /api/blogs/all
 * Fetch ALL blog posts (published + unpublished) for admin panel.
 */
router.get("/all", async (_req: Request, res: Response): Promise<void> => {
  try {
    const posts = await Blog.find({})
      .sort({ createdAt: -1 });

    res.json({ posts });
  } catch (error: any) {
    console.error("Error in GET /api/blogs/all:", error);
    res.status(500).json({ error: "Failed to fetch all blogs." });
  }
});

/**
 * GET /api/blogs/featured
 * Fetch featured blog posts for the homepage.
 */
router.get("/featured", async (_req: Request, res: Response): Promise<void> => {
  try {
    const posts = await Blog.find({ published: true, featured: true })
      .sort({ publishedAt: -1 })
      .limit(5);
    res.json(posts);
  } catch (error: any) {
    console.error("Error in GET /api/blogs/featured:", error);
    res.status(500).json({ error: "Failed to fetch featured blogs." });
  }
});

/**
 * GET /api/blogs/trending
 * Fetch trending blog posts sorted by views.
 */
router.get("/trending", async (_req: Request, res: Response): Promise<void> => {
  try {
    const posts = await Blog.find({ published: true })
      .sort({ views: -1, publishedAt: -1 })
      .limit(6);
    res.json(posts);
  } catch (error: any) {
    console.error("Error in GET /api/blogs/trending:", error);
    res.status(500).json({ error: "Failed to fetch trending blogs." });
  }
});

/**
 * GET /api/blogs/categories
 * Get all categories with post counts.
 */
router.get("/categories", async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Blog.aggregate([
      { $match: { published: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json(categories.map(c => ({ name: c._id, count: c.count })));
  } catch (error: any) {
    console.error("Error in GET /api/blogs/categories:", error);
    res.status(500).json({ error: "Failed to fetch categories." });
  }
});

/**
 * GET /api/blogs/search
 * Search published blog posts by keyword.
 */
router.get("/search", async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.query.q as string | undefined;
    if (!q) {
      res.json([]);
      return;
    }
    const filter = {
      published: true,
      $or: [
        { title: { $regex: q, $options: "i" } },
        { excerpt: { $regex: q, $options: "i" } },
        { content: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } }
      ]
    };
    const posts = await Blog.find(filter)
      .sort({ publishedAt: -1 })
      .limit(20);
    res.json(posts);
  } catch (error: any) {
    console.error("Error in GET /api/blogs/search:", error);
    res.status(500).json({ error: "Search failed." });
  }
});

/**
 * GET /api/blogs/recent
 * Get latest published blog posts.
 */
router.get("/recent", async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.max(1, Number(req.query.limit) || 5);
    const posts = await Blog.find({ published: true })
      .sort({ publishedAt: -1 })
      .limit(limit);
    res.json(posts);
  } catch (error: any) {
    console.error("Error in GET /api/blogs/recent:", error);
    res.status(500).json({ error: "Failed to fetch recent blogs." });
  }
});

/**
 * GET /api/blogs/:slug
 * Fetch a single blog post by its SEO slug.
 */
router.get("/:slug", async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const post = await Blog.findOne({ slug, published: true });

    if (!post) {
      res.status(404).json({ error: "Blog post not found." });
      return;
    }

    res.json(post);
  } catch (error: any) {
    console.error("Error in GET /api/blogs/:slug:", error);
    res.status(500).json({ error: "Failed to fetch blog post." });
  }
});

/**
 * PATCH /api/blogs/:id/view
 * Increment blog post view count.
 */
router.patch("/:id/view", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const post = await Blog.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!post) {
      res.status(404).json({ error: "Blog post not found." });
      return;
    }
    res.json({ views: post.views });
  } catch (error: any) {
    console.error("Error in PATCH /api/blogs/:id/view:", error);
    res.status(500).json({ error: "Failed to increment view count." });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROTECTED ENDPOINTS (requireApiKey validated)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/blogs
 * Create a new blog post with optional image upload.
 * Accepts multipart/form-data.
 */
router.post(
  "/",
  requireApiKey,
  upload.single("coverImage"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        title,
        slug,
        excerpt,
        content,
        category,
        author,
        published,
        publishedAt,
        featured,
        readTime,
        seoTitle,
        seoDescription,
        tags,
        keywords,
      } = req.body;

      if (!title || !excerpt || !content || !category || !author) {
        res.status(400).json({
          error:
            "Missing required fields: title, excerpt, content, category, author are required.",
        });
        return;
      }

      // Handle cover image — either from file upload or from body
      let coverImage: string | undefined;
      if (req.file) {
        coverImage = fileToBase64DataUri(req.file);
      } else if (req.body.coverImageUrl) {
        coverImage = req.body.coverImageUrl;
      }

      // Parse tags and keywords from comma-separated strings
      const parsedTags = tags
        ? typeof tags === "string"
          ? tags
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean)
          : tags
        : [];

      const parsedKeywords = keywords
        ? typeof keywords === "string"
          ? keywords
              .split(",")
              .map((k: string) => k.trim())
              .filter(Boolean)
          : keywords
        : [];

      const newBlog = new Blog({
        title,
        slug,
        excerpt,
        content,
        category,
        author,
        coverImage,
        published: published !== undefined ? published === "true" || published === true : true,
        publishedAt: publishedAt || new Date(),
        featured: featured !== undefined ? featured === "true" || featured === true : false,
        readTime,
        seoTitle,
        seoDescription,
        tags: parsedTags,
        keywords: parsedKeywords,
      });

      const saved = await newBlog.save();
      res.status(201).json(saved);
    } catch (error: any) {
      console.error("Error in POST /api/blogs:", error);
      if (error.code === 11000) {
        res
          .status(400)
          .json({ error: "A blog post with this slug or title already exists." });
        return;
      }
      res.status(500).json({ error: "Failed to create blog post." });
    }
  }
);

/**
 * PUT /api/blogs/:id
 * Update an existing blog post.
 */
router.put(
  "/:id",
  requireApiKey,
  upload.single("coverImage"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        title,
        slug,
        excerpt,
        content,
        category,
        author,
        published,
        publishedAt,
        featured,
        readTime,
        seoTitle,
        seoDescription,
        tags,
        keywords,
      } = req.body;

      const blog = await Blog.findById(id);
      if (!blog) {
        res.status(404).json({ error: "Blog post not found." });
        return;
      }

      // Handle cover image
      let coverImage = blog.coverImage;
      if (req.file) {
        coverImage = fileToBase64DataUri(req.file);
      } else if (req.body.coverImageUrl) {
        coverImage = req.body.coverImageUrl;
      }

      // Parse tags and keywords
      const parsedTags = tags
        ? typeof tags === "string"
          ? tags.split(",").map((t: string) => t.trim()).filter(Boolean)
          : tags
        : blog.tags;

      const parsedKeywords = keywords
        ? typeof keywords === "string"
          ? keywords.split(",").map((k: string) => k.trim()).filter(Boolean)
          : keywords
        : blog.keywords;

      blog.title = title !== undefined ? title : blog.title;
      blog.slug = slug !== undefined ? slug : blog.slug;
      blog.excerpt = excerpt !== undefined ? excerpt : blog.excerpt;
      blog.content = content !== undefined ? content : blog.content;
      blog.category = category !== undefined ? category : blog.category;
      blog.author = author !== undefined ? author : blog.author;
      blog.coverImage = coverImage;
      blog.published = published !== undefined ? (published === "true" || published === true) : blog.published;
      blog.publishedAt = publishedAt ? new Date(publishedAt) : blog.publishedAt;
      blog.featured = featured !== undefined ? (featured === "true" || featured === true) : blog.featured;
      blog.readTime = readTime !== undefined ? readTime : blog.readTime;
      blog.seoTitle = seoTitle !== undefined ? seoTitle : blog.seoTitle;
      blog.seoDescription = seoDescription !== undefined ? seoDescription : blog.seoDescription;
      blog.tags = parsedTags;
      blog.keywords = parsedKeywords;

      const saved = await blog.save();
      res.json(saved);
    } catch (error: any) {
      console.error("Error in PUT /api/blogs/:id:", error);
      res.status(500).json({ error: "Failed to update blog post." });
    }
  }
);

/**
 * DELETE /api/blogs/:id
 * Delete a blog post by MongoDB _id.
 */
router.delete("/:id", requireApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await Blog.findByIdAndDelete(id);

    if (!deleted) {
      res.status(404).json({ error: "Blog post not found." });
      return;
    }

    res.json({ message: "Blog post deleted successfully.", id });
  } catch (error: any) {
    console.error("Error in DELETE /api/blogs/:id:", error);
    res.status(500).json({ error: "Failed to delete blog post." });
  }
});

export default router;

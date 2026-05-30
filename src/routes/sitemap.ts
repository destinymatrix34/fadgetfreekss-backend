import { Router, Request, Response } from "express";
import Blog from "../models/Blog";

const router = Router();

router.get("/sitemap.xml", async (_req: Request, res: Response) => {
  const BASE_URL = "https://gadgetfreeks.us";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    
    <sitemap>
      <loc>${BASE_URL}/sitemap-pages.xml</loc>
    </sitemap>

    <sitemap>
      <loc>${BASE_URL}/sitemap-blogs.xml</loc>
    </sitemap>

  </sitemapindex>`;

  res.header("Content-Type", "application/xml");
  res.send(xml);
});

router.get("/sitemap-pages.xml", async (_req: Request, res: Response) => {
  const BASE_URL = "https://gadgetfreeks.us";

  const pages = [
    {
      url: "",
      priority: "1.0",
      changefreq: "daily",
    },
    {
      url: "/blog",
      priority: "0.9",
      changefreq: "daily",
    },
    {
      url: "/about",
      priority: "0.8",
      changefreq: "monthly",
    },
    {
      url: "/contact",
      priority: "0.8",
      changefreq: "monthly",
    },
    {
      url: "/privacy",
      priority: "0.5",
      changefreq: "yearly",
    },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  pages.forEach((page) => {
    xml += `
      <url>
        <loc>${BASE_URL}${page.url}</loc>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
      </url>
    `;
  });

  xml += `</urlset>`;

  res.header("Content-Type", "application/xml");
  res.send(xml);
});

router.get("/sitemap-blogs.xml", async (_req: Request, res: Response) => {
  try {
    const BASE_URL = "https://gadgetfreeks.us";

    const blogs = await Blog.find({
      published: true,
    })
      .select("slug updatedAt")
      .lean();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    blogs.forEach((blog: any) => {
      xml += `
        <url>
          <loc>${BASE_URL}/blog/${blog.slug}</loc>
          <lastmod>${new Date(blog.updatedAt).toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>
      `;
    });

    xml += `</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);

  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating blog sitemap");
  }
});

export default router;
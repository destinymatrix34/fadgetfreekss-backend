import mongoose, { Schema, Document } from "mongoose";

export interface IBlog extends Document {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  coverImage?: string;
  published: boolean;
  publishedAt: Date;
  featured: boolean;
  views: number;
  readTime?: string;
  seoTitle?: string;
  seoDescription?: string;
  tags: string[];
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true },
    author: { type: String, required: true },
    coverImage: { type: String },
    published: { type: Boolean, default: false },
    publishedAt: { type: Date, default: Date.now },
    featured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    readTime: { type: String },
    seoTitle: { type: String },
    seoDescription: { type: String },
    tags: [{ type: String }],
    keywords: [{ type: String }],
  },
  { timestamps: true }
);

// Auto-generate slug from title before saving if not provided
BlogSchema.pre("validate", function (this: any) {
  if (this.isModified("title") && !this.get("slug")) {
    const title = this.get("title") || "";
    this.set(
      "slug",
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
    );
  }
});

export default mongoose.model<IBlog>("Blog", BlogSchema);

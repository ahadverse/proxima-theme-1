export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  /** Markdown. Not sent with the post list, only with a single post. */
  content?: string;
  publishedAt: string;
  coverImage?: string;
  tags?: string[];
  seo?: { metaTitle?: string; metaDescription?: string };
}

export const placeholderBlogPosts: BlogPost[] = [
  {
    slug: 'choosing-your-next-smartphone',
    title: "A Buyer's Guide to Choosing Your Next Smartphone",
    excerpt: 'Camera, battery, or performance — here is how to decide what actually matters for you.',
    content:
      'When choosing a new smartphone, start with how you actually use your phone day to day. Heavy camera users should prioritize sensor size and computational photography features over raw megapixel counts. If battery life matters most, look for devices with larger cell capacity and efficient chipsets rather than the fastest processor on paper. For most buyers, a mid-range device from a reputable brand with timely software updates offers the best long-term value.',
    publishedAt: '2026-09-02',
  },
  {
    slug: 'laptop-vs-tablet-for-students',
    title: 'Laptop vs Tablet: What Should Students Buy in 2026?',
    excerpt: 'We break down the real trade-offs between portability and productivity.',
    content:
      'Tablets have closed much of the productivity gap with laptops thanks to better keyboard accessories and more capable apps, but a traditional laptop still wins for heavy multitasking, coding, and file management. If your coursework involves spreadsheets, video editing, or software development, a laptop remains the safer choice. For reading-heavy, note-taking-focused students, a tablet with a stylus can be a lighter, more versatile daily companion.',
    publishedAt: '2026-08-18',
  },
  {
    slug: 'extend-your-gadgets-battery-life',
    title: '7 Simple Habits to Extend Your Gadget’s Battery Life',
    excerpt: 'Small daily habits that add years to your device battery health.',
    content:
      'Avoid letting your battery regularly drain to 0% or sit at 100% for long periods — keeping it between 20% and 80% extends long-term battery health. Use manufacturer-certified chargers, avoid charging overnight on older devices without smart charging features, and keep your device out of direct heat. Software updates often include battery optimizations, so keeping your device updated also helps.',
    publishedAt: '2026-07-30',
  },
];

import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL } from "@/utils/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // JSON search endpoint. Nothing here is a page worth indexing and
        // crawling it burns crawl budget on a dynamic response.
        disallow: ["/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}

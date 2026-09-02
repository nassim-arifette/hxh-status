import type { MetadataRoute } from "next";

import { lastUpdated } from "./data/status";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://hxhstatus.com",
      lastModified: new Date(`${lastUpdated}T00:00:00.000Z`),
    },
  ];
}

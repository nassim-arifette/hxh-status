import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HxH Status - HUNTER×HUNTER Chapter & Production Tracker",
    short_name: "HxH Status",
    description:
      "A sourced tracker for HUNTER×HUNTER chapter releases and Yoshihiro Togashi's confirmed progress on upcoming chapters.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0e0c",
    theme_color: "#0b0e0c",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

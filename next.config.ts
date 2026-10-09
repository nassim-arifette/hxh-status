import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  experimental: {
    // app/global-not-found.tsx: a 404 rendered on its own instead of being
    // serialized into every page's payload.
    globalNotFound: true,
  },
};

export default nextConfig;

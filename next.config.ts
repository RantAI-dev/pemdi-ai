import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // scripts/deploy.sh builds into a side directory and swaps it in, so the running server never loses its files mid-build.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Uploads go through a route handler; mammoth and xlsx read files on the server.
  serverExternalPackages: ["mammoth", "xlsx"],
  // Lets other machines on the office network open the dev server for review.
  allowedDevOrigins: ["192.168.18.174", "100.99.199.33"],
};

export default nextConfig;

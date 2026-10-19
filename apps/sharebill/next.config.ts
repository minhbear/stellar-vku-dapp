import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Standalone output keeps the deployed image small, and the tracing root has
  // to reach the repo root so the workspace packages come along.
  output: "standalone",
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  // The workspace packages ship TypeScript source, so Next compiles them here.
  transpilePackages: ["@vku/ui", "@vku/stellar", "@vku/sharebill-client"],
};

export default nextConfig;

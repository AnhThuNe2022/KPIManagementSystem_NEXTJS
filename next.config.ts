import path from "node:path";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    // Isolate dev cache from production build so `next build` never corrupts `next dev` vendor-chunks
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    outputFileTracingRoot: path.join(__dirname),
    transpilePackages: ["@astryxdesign/core", "@astryxdesign/theme-neutral"],
  };
}

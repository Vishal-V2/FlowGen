import type { NextConfig } from "next";
import path from "path";
import dotenv from "dotenv";

const projectRoot = path.resolve(process.cwd(), "../..");
dotenv.config({ path: path.join(projectRoot, ".env") });

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  eslint: {
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;

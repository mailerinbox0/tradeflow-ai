import type { NextConfig } from "next";
import path from "path";

const isDocker = process.env.DOCKER_BUILD === "1";
const isFirebaseStatic = process.env.FIREBASE_STATIC === "1";

const nextConfig: NextConfig = {
  ...(isDocker ? { output: "standalone" as const } : {}),
  ...(isFirebaseStatic
    ? { output: "export" as const, trailingSlash: true, images: { unoptimized: true } }
    : {}),
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;

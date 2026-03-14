import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-big-calendar ist ein ESM-Paket und muss transpiliert werden
  transpilePackages: ["react-big-calendar"],
};

export default nextConfig;

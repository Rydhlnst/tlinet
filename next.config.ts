import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Folder induk punya lockfile sendiri; tanpa ini Turbopack salah menebak akar proyek.
  turbopack: { root: process.cwd() },
};

export default nextConfig;

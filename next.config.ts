import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.0.0.*", "172.20.10.*", "*.rezakelidari.ir"],
};

export default nextConfig;

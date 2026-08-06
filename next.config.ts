import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

module.exports = {
  allowedDevOrigins: [
    "10.0.0.*",
    "172.20.10.*",
    "*.rezak.dpdns.org",
    "*.rezakelidari.ir",
  ],
};

export default nextConfig;

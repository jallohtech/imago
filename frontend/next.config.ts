import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.imago-images.de',
        port: '',
        pathname: '/bild/**',
      },
    ],
  },
};

export default nextConfig;

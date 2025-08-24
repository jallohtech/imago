import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
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

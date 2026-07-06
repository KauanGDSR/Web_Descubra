import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'brasilapi.com.br' },
    ],
  },
};

export default nextConfig;

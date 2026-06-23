import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/api/profiles/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
      {
        source: '/api/dashboard/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.DASHBOARD_ORIGIN || 'http://localhost:3001',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type',
          },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
    ];
  },
};

export default nextConfig;

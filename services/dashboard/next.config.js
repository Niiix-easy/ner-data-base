/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      // Removed proxy to Backend container, now handled by API Route Proxy

      {
        source: '/api/storage/:path*',
        destination: 'http://localhost:3002/:path*', // Proxy to Storage container
      },
      {
        source: '/api/functions/:path*',
        destination: 'http://localhost:8787/:path*', // Proxy to Functions container
      },
    ];
  },
};

module.exports = nextConfig;

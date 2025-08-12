/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  
  env: {
    NEXT_PUBLIC_RAG_WORKER_URL: process.env.NEXT_PUBLIC_RAG_WORKER_URL,
    NEXT_PUBLIC_PROJECTS_WORKER_URL: process.env.NEXT_PUBLIC_PROJECTS_WORKER_URL,
    NEXT_PUBLIC_NOTION_WORKER_URL: process.env.NEXT_PUBLIC_NOTION_WORKER_URL,
    NEXT_PUBLIC_API_WORKER_URL: process.env.NEXT_PUBLIC_API_WORKER_URL,
  },
  
  reactStrictMode: true,
  
  typescript: {
    ignoreBuildErrors: false,
  },
  
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
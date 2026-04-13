/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Server-side only packages
  serverExternalPackages: ['ollama'],
};

module.exports = nextConfig;

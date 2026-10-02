// Test mode (`npm run dev:test`, never a production build): Clerk is swapped for dummy users chosen at /dev/login,
// and the server keeps its files in .next-test so it can run beside the normal dev server. See lib/dev/.
const testLogin = process.env.NODE_ENV !== 'production' && process.env.STUDIO_TEST_LOGIN === '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(testLogin && {
    distDir: '.next-test',
    turbopack: {
      resolveAlias: {
        '@clerk/nextjs': './lib/dev/clerk-client-stub.tsx',
        '@clerk/nextjs/server': './lib/dev/clerk-server-stub.ts',
      },
    },
  }),
  // An ID photo (and a case attachment) travels through a server action. The default limit is 1 MB; the host's own
  // limit on a request is 4.5 MB, so there is no point allowing more.
  experimental: { serverActions: { bodySizeLimit: '4500kb' } },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;

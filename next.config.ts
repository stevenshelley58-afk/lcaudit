import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Vercel Blob storage (screenshots, reports)
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        // ScreenshotOne CDN
        protocol: 'https',
        hostname: '*.screenshotone.com',
      },
      {
        // Allow any external OG images
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  
  // Performance optimizations
  // Note: swcMinify is enabled by default in Next.js 13+ and removed as an option
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
  },
  
  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Experimental features for performance
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"],
  },
  
  // Production optimizations
  // Note: standalone output is useful for Docker deployments, but may not be needed for Vercel
  // Vercel handles optimization automatically
};

export default nextConfig;

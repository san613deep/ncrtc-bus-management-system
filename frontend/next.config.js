/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development warnings
  reactStrictMode: true,
  
  // Output standalone server build for Docker multi-stage packaging
  output: "standalone",
  
  // Allow images from these external domains (e.g., S3 for incident photos)
  images: {
    domains: ["localhost", "ncrtc-bms-uploads.s3.ap-south-1.amazonaws.com"],
  },
  
  // Required for Leaflet SSR compatibility
  // Leaflet uses window object which doesn't exist during SSR
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

module.exports = nextConfig;

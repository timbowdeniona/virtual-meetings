/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Ignore pdf-parse test files
    config.externals.push({
      "pdf-parse/test": "commonjs pdf-parse/test",
    });
    return config;
  },
};

module.exports = nextConfig;

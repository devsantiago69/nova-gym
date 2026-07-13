import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@gymchallenge/config", "@gymchallenge/database", "@gymchallenge/domain"],
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
  async headers() { return [{ source:"/:path*", headers:[
    {key:"X-Content-Type-Options",value:"nosniff"},{key:"X-Frame-Options",value:"DENY"},
    {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},{key:"Permissions-Policy",value:"camera=(self), microphone=(), geolocation=(self)"},
    {key:"Content-Security-Policy",value:"default-src 'self'; img-src 'self' blob: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self'"}
  ]}]; }
};
export default nextConfig;

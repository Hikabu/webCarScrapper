/** @type {import('next').NextConfig} */
// Default for docker-compose: `api` service.
// Override with `NEXT_PUBLIC_BACKEND_ORIGIN`/`BACKEND_ORIGIN` when running outside Docker.
const backendOrigin = ((process.env.NEXT_PUBLIC_BACKEND_ORIGIN ?? process.env.BACKEND_ORIGIN) ?? 'http://api:8000').replace(/\/$/, '')

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Remove Next.js dev overlay indicators (the "N" button).
  devIndicators: false,
   async rewrites() {
    return [
      {
        source: '/api/:path*',            // frontend request
        // Proxy `/api/*` to the FastAPI backend.
        // Backend routes are mounted at `/auth/*` and `/cars/*` (no `/api` prefix).
        destination: `${backendOrigin}/:path*`,
      },
    ]
  },
}

export default nextConfig

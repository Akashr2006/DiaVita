/** @type {import('next').NextConfig} */
// NEXT_PUBLIC_MOBILE=1 builds the static version that is packaged into the Android app (see scripts/build-mobile.mjs).
const mobile = process.env.NEXT_PUBLIC_MOBILE === '1';

const nextConfig = {
  reactStrictMode: true,
  ...(mobile && {
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
    distDir: 'out', // the static app lands here (Capacitor's webDir); the website's .next folder is untouched
  }),
};

export default nextConfig;

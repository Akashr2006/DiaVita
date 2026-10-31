// Builds the static app that goes inside the Android APK, into ./out (Capacitor's webDir).
// The phone talks to the online API, so its address is fixed at build time.
// Usage: npm run build:mobile            (uses the online API below)
//        NEXT_PUBLIC_API_URL=... npm run build:mobile
import { spawnSync } from 'node:child_process';

const ONLINE_API = 'https://diavita-api.vercel.app/api';

const env = {
  ...process.env,
  NEXT_PUBLIC_MOBILE: '1',
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || ONLINE_API,
};
console.log(`Building the mobile app against ${env.NEXT_PUBLIC_API_URL}`);
const result = spawnSync('npx', ['next', 'build'], { stdio: 'inherit', env, shell: true });
process.exit(result.status ?? 1);

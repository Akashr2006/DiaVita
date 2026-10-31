export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'diavita_token';

export const getToken = () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY));
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the DiaVita server. Is the backend running?');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    clearToken();
    // the Android app is a single page: its start screen sends a logged-out user to login
    if (typeof window !== 'undefined') window.location.href = process.env.NEXT_PUBLIC_MOBILE === '1' ? '/' : '/login';
  }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Glucose helpers shared across pages
export function glucoseStatus(v, lo = 70, hi = 180) {
  if (v < 70) return { label: 'Low', tone: 'red' };
  if (v < lo) return { label: 'Below target', tone: 'amber' };
  if (v <= hi) return { label: 'In range', tone: 'green' };
  if (v <= 250) return { label: 'High', tone: 'amber' };
  return { label: 'Very high', tone: 'red' };
}

export function giLevel(gi) {
  if (gi <= 55) return { label: 'Low GI', tone: 'green' };
  if (gi <= 69) return { label: 'Medium GI', tone: 'amber' };
  return { label: 'High GI', tone: 'red' };
}

export const CONTEXT_LABELS = {
  fasting: 'Fasting',
  pre_meal: 'Before meal',
  post_meal: 'After meal',
  bedtime: 'Bedtime',
  random: 'Random',
};

export const fmtDateTime = (d) =>
  new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
export const fmtDay = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

// Spike Predictor: peak ≈ baseline + k × Σ(item GL × personal food factor) × walk reduction
export function predictSpike(model, plate, walkMin = 0) {
  if (!model) return null;
  const personalGl = plate.reduce((s, { food, qty }) => {
    const gl = (food.gi * food.carbs * qty) / 100;
    return s + gl * (model.food_factors?.[food.name] ?? 1);
  }, 0);
  const walkCut = Math.min(0.35, model.walk_reduction_per_min * walkMin);
  const rise = model.k * personalGl * (1 - walkCut);
  return { rise: Math.round(rise), peak: Math.round(model.baseline + rise) };
}

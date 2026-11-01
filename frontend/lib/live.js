'use client';
import { useEffect, useRef, useState } from 'react';
import { API_URL, getToken } from '@/lib/api';

// Pages reload their data when this event fires: after a change from the live stream or the voice assistant
export const REFRESH_EVENT = 'diavita:refresh';
export const refreshAll = (detail = {}) => window.dispatchEvent(new CustomEvent(REFRESH_EVENT, { detail }));

// Reload a page's data on every live change, when the tab comes back into view, and as a slow safety net
export function useLiveRefresh(load, { everyMs = 60000 } = {}) {
  const ref = useRef(load);
  ref.current = load;
  useEffect(() => {
    const run = () => ref.current();
    const onVisible = () => document.visibilityState === 'visible' && run();
    const timer = setInterval(onVisible, everyMs);
    window.addEventListener(REFRESH_EVENT, run);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener(REFRESH_EVENT, run);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [everyMs]);
}

const POLL_MS = 3000;

// Live sync for an open dashboard. Returns 'connecting' | 'live' | 'offline'.
// A normal server pushes changes over one Server-Sent Events connection; the API on Vercel cannot keep
// connections open, so there the dashboard checks the patient's change counter every few seconds.
export function useLiveConnection() {
  const [status, setStatus] = useState('connecting');
  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;
    let stopped = false;
    let es;
    let timer;
    let seen = null;

    const check = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(`${API_URL}/live/version`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const v = await res.json();
        if (seen !== null && v.version !== seen) refreshAll({ area: v.area, at: v.at });
        seen = v.version;
        setStatus('live');
        return v;
      } catch {
        setStatus('offline');
        return null;
      }
    };

    const stream = () => {
      es = new EventSource(`${API_URL}/live?token=${encodeURIComponent(token)}`);
      es.addEventListener('hello', () => setStatus('live'));
      es.addEventListener('change', (e) => {
        setStatus('live');
        let detail = {};
        try { detail = JSON.parse(e.data); } catch { /* keep empty */ }
        refreshAll(detail);
      });
      es.onerror = () => setStatus(es.readyState === EventSource.CLOSED ? 'offline' : 'connecting');
    };

    check().then((v) => {
      if (stopped) return;
      if (v?.stream && typeof EventSource !== 'undefined') stream();
      else timer = setInterval(check, POLL_MS);
    });
    // back on the screen: catch up at once instead of waiting for the next check
    document.addEventListener('visibilitychange', check);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      es?.close();
    };
  }, []);
  return status;
}

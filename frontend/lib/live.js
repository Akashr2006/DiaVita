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

// One Server-Sent Events connection per open dashboard. Returns 'connecting' | 'live' | 'offline'.
export function useLiveConnection() {
  const [status, setStatus] = useState('connecting');
  useEffect(() => {
    const token = getToken();
    if (!token || typeof EventSource === 'undefined') return undefined;
    const es = new EventSource(`${API_URL}/live?token=${encodeURIComponent(token)}`);
    es.addEventListener('hello', () => setStatus('live'));
    es.addEventListener('change', (e) => {
      setStatus('live');
      let detail = {};
      try { detail = JSON.parse(e.data); } catch { /* keep empty */ }
      refreshAll(detail);
    });
    es.onerror = () => setStatus(es.readyState === EventSource.CLOSED ? 'offline' : 'connecting');
    return () => es.close();
  }, []);
  return status;
}

'use client';
import { useState } from 'react';
import { Database, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { refreshAll } from '@/lib/live';

// Loads 14 days of realistic sample data so every chart and the Food Fingerprint can be demonstrated
export default function DemoDataButton({ className = 'btn btn-ghost', label = 'Load 14-day demo data' }) {
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!window.confirm('This replaces your glucose, meal and activity logs with 14 days of sample data. Continue?')) return;
    setLoading(true);
    try {
      await api('/demo/seed', { method: 'POST' });
      // every open page reloads its data, no full page reload (which the Android app cannot do)
      refreshAll({ area: 'demo' });
      setLoading(false);
    } catch (err) {
      window.alert(err.message);
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={load} className={className} disabled={loading}>
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />} {label}
    </button>
  );
}

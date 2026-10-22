'use client';
import {
  Area, AreaChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

// data: [{ label, value }]
export default function GlucoseChart({ data, lo = 70, hi = 180, height = 260 }) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="gluFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#85d1db" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#c9fdf2" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#d9eff1" vertical={false} />
          <ReferenceArea y1={lo} y2={hi} fill="#b6f2d1" fillOpacity={0.35} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#567277' }} tickLine={false} axisLine={false} minTickGap={12} />
          <YAxis domain={[40, (max) => Math.max(260, Math.ceil(max / 20) * 20)]} tick={{ fontSize: 11, fill: '#567277' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid #d9eff1', fontSize: 12 }}
            formatter={(v) => [`${v} mg/dL`, 'Glucose']}
          />
          <Area type="monotone" dataKey="value" stroke="#2c8a99" strokeWidth={2.5} fill="url(#gluFill)"
            dot={{ r: 3, fill: '#2c8a99' }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

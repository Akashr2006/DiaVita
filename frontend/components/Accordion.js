import { ChevronDown } from 'lucide-react';

// Question-and-answer list built on <details>, so it works without JavaScript
export default function Accordion({ items }) {
  return (
    <div className="card divide-y divide-line">
      {items.map(({ q, a }) => (
        <details key={q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {q}
            <ChevronDown size={18} className="shrink-0 text-muted transition group-open:rotate-180" />
          </summary>
          <p className="-mt-1 px-5 pb-4 text-sm leading-6 text-muted">{a}</p>
        </details>
      ))}
    </div>
  );
}

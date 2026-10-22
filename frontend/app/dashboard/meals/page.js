'use client';
import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Search, Trash2, Utensils, X } from 'lucide-react';
import { Alert, Badge, Empty, PageHeader, Spinner } from '@/components/ui';
import SpikePredictor from '@/components/SpikePredictor';
import { useUser } from '@/components/UserContext';
import { api, fmtDateTime, giLevel } from '@/lib/api';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const RATING = { low: { tone: 'green', text: 'Low glycemic load' }, medium: { tone: 'amber', text: 'Medium glycemic load' }, high: { tone: 'red', text: 'High glycemic load' } };
const glRate = (gl) => (gl <= 10 ? 'low' : gl < 20 ? 'medium' : 'high');

function defaultMealType() {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 19 ? 'snack' : 'dinner';
}

export default function MealsPage() {
  const { user } = useUser();
  const [model, setModel] = useState(null);
  const [foods, setFoods] = useState([]);
  const [meals, setMeals] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [plate, setPlate] = useState([]); // [{ food, qty }]
  const [mealType, setMealType] = useState(defaultMealType);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api('/meals/foods').then(setFoods);
    api('/meals?days=7').then(setMeals);
    api('/smart/spike-model').then(setModel).catch(() => {});
  }, []);

  const categories = useMemo(() => ['All', ...new Set(foods.map((f) => f.category))], [foods]);
  const list = foods.filter((f) => (cat === 'All' || f.category === cat) && f.name.toLowerCase().includes(q.toLowerCase()));

  const totals = plate.reduce((t, { food, qty }) => {
    const c = food.carbs * qty;
    return { carbs: t.carbs + c, cal: t.cal + food.calories * qty, gl: t.gl + (food.gi * c) / 100 };
  }, { carbs: 0, cal: 0, gl: 0 });

  const add = (food) => setPlate((p) => (p.find((x) => x.food.id === food.id)
    ? p.map((x) => (x.food.id === food.id ? { ...x, qty: x.qty + 1 } : x)) : [...p, { food, qty: 1 }]));
  const changeQty = (id, d) => setPlate((p) => p.map((x) => (x.food.id === id ? { ...x, qty: Math.max(0.5, x.qty + d) } : x)));

  async function save() {
    try {
      const res = await api('/meals', { method: 'POST', body: { meal_type: mealType, items: plate.map((x) => ({ food_id: x.food.id, qty: x.qty })) } });
      setMeals((m) => [res.meal, ...(m || [])]);
      setPlate([]);
      setMsg({ type: res.meal.rating === 'high' ? 'warning' : 'success', title: `Meal saved · GL ${res.meal.glycemic_load}`, text: res.swap || 'Great choice! This meal keeps your sugar steady.' });
    } catch (e) {
      setMsg({ type: 'danger', title: 'Could not save', text: e.message });
    }
  }

  async function remove(id) {
    await api(`/meals/${id}`, { method: 'DELETE' });
    setMeals((m) => m.filter((x) => x.id !== id));
  }

  const rating = RATING[glRate(totals.gl)];

  return (
    <div>
      <PageHeader title="Smart Plate" subtitle="Build your meal from the Indian food library — see carbs, calories and glycemic load live." />
      {msg && <div className="mb-4"><Alert type={msg.type} title={msg.title} onClose={() => setMsg(null)}>{msg.text}</Alert></div>}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Food library */}
        <div className="card min-w-0 p-5 lg:col-span-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-10" placeholder="Search idli, chapati, rice…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search foods" />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${cat === c ? 'bg-sky text-ink' : 'bg-soft text-muted hover:bg-slate-200'}`}>
                {c}
              </button>
            ))}
          </div>
          <div className="mt-4 grid max-h-[460px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {!foods.length ? <Spinner /> : list.map((f) => {
              const g = giLevel(f.gi);
              return (
                <button key={f.id} onClick={() => add(f)} className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/50">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{f.name}</div>
                    <div className="text-xs text-slate-500">{f.serving} · {f.carbs}g carbs · {f.calories} kcal</div>
                    <div className="mt-1.5"><Badge tone={g.tone}>GI {f.gi}</Badge></div>
                  </div>
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 group-hover:bg-aqua group-hover:text-ink">
                    <Plus size={16} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Plate */}
        <div className="card flex min-w-0 flex-col p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 font-bold"><Utensils size={18} className="text-brand-600" /> Your plate</h2>
          <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1">
            {MEAL_TYPES.map((t) => (
              <button key={t} onClick={() => setMealType(t)}
                className={`rounded-lg py-1.5 text-xs font-semibold capitalize ${mealType === t ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-500'}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="mt-4 flex-1 space-y-2">
            {!plate.length && <Empty icon={Utensils} title="Plate is empty" text="Tap foods from the library to add them." />}
            {plate.map(({ food, qty }) => (
              <div key={food.id} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{food.name}</div>
                  <div className="text-xs text-slate-500">{(food.carbs * qty).toFixed(0)}g carbs · GL {((food.gi * food.carbs * qty) / 100).toFixed(1)}</div>
                </div>
                <button onClick={() => changeQty(food.id, -0.5)} className="grid h-7 w-7 place-items-center rounded-lg bg-white ring-1 ring-slate-200" aria-label="Less"><Minus size={14} /></button>
                <span className="w-8 text-center text-sm font-bold">{qty}</span>
                <button onClick={() => changeQty(food.id, 0.5)} className="grid h-7 w-7 place-items-center rounded-lg bg-white ring-1 ring-slate-200" aria-label="More"><Plus size={14} /></button>
                <button onClick={() => setPlate((p) => p.filter((x) => x.food.id !== food.id))} className="p-1 text-slate-400 hover:text-rose-600" aria-label="Remove"><X size={16} /></button>
              </div>
            ))}
          </div>

          {plate.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[['Carbs', `${totals.carbs.toFixed(0)}g`], ['Calories', Math.round(totals.cal)], ['Glycemic load', totals.gl.toFixed(1)]].map(([l, v]) => (
                  <div key={l} className="rounded-xl bg-brand-50 p-2.5">
                    <div className="text-lg font-bold text-brand-800">{v}</div>
                    <div className="text-[10px] font-semibold uppercase text-brand-700/70">{l}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center"><Badge tone={rating.tone}>{rating.text}</Badge></div>
              <SpikePredictor model={model} plate={plate} lo={user.target_min} hi={user.target_max} />
              <button onClick={save} className="btn btn-primary w-full">Save {mealType}</button>
            </div>
          )}
        </div>
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 font-bold">Meals this week</div>
        {!meals ? <Spinner /> : !meals.length ? <Empty title="No meals logged yet" /> : (
          <ul className="divide-y divide-slate-100">
            {meals.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold capitalize">
                    {m.meal_type} <Badge tone={RATING[m.rating].tone}>GL {m.glycemic_load}</Badge>
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {m.items.map((i) => `${i.name} ×${i.qty}`).join(', ')} · {m.total_carbs}g carbs · {m.total_calories} kcal
                  </div>
                  <div className="text-xs text-slate-400">{fmtDateTime(m.recorded_at)}</div>
                </div>
                <button onClick={() => remove(m.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete meal"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

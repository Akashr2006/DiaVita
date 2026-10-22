// Help content shared by the in-app Help page and the public home page

export const SUGAR_RANGES = [
  { label: 'Low', range: 'Below 70 mg/dL', text: 'Eat or drink 15 g of sugar now.', tone: 'bg-rose-100 text-rose-800' },
  { label: 'Fasting target', range: '80 – 130 mg/dL', text: 'Before breakfast, after 8 hours without food.', tone: 'bg-ice text-ink' },
  { label: 'After meals', range: 'Below 180 mg/dL', text: 'One to two hours after you start eating.', tone: 'bg-mint text-ink' },
  { label: 'High', range: 'Above 180 mg/dL', text: 'Drink water, walk if you can, check again later.', tone: 'bg-amber-100 text-amber-900' },
];

export const LOW_SUGAR_STEPS = [
  'Take 15 g of fast sugar: 3 teaspoons of sugar in water, or half a glass of fruit juice.',
  'Wait 15 minutes, then check your sugar again.',
  'If it is still below 70 mg/dL, repeat once more.',
  'When it is back above 70, eat a small snack such as two biscuits or a fruit.',
];

export const SEE_DOCTOR = [
  'Your sugar stays above 250 mg/dL for more than a day.',
  'You have low sugar more than twice in a week.',
  'You feel very thirsty, confused, or drowsy.',
];

export const GETTING_STARTED = [
  { title: 'Set your targets', text: 'Open Profile and enter your height, weight and target sugar range.', href: '/dashboard/profile' },
  { title: 'Log your sugar', text: 'Type the reading or tap the mic and say it. Add when you checked it.', href: '/dashboard/glucose' },
  { title: 'Add your meals', text: 'Pick foods on the Smart Plate. You see carbs and glycemic load at once.', href: '/dashboard/meals' },
  { title: 'Check your fingerprint', text: 'After about a week, Food Fingerprint shows which foods raise your sugar most.', href: '/dashboard/fingerprint' },
];

export const PAGE_GUIDE = [
  { page: 'Home', text: 'Your DiaVita Score for today, latest reading, goals and tips. Start every day here.' },
  { page: 'Glucose', text: 'Add readings with the time of the check (fasting, before or after a meal, bedtime). Low and high values show a warning straight away.' },
  { page: 'Smart Plate', text: 'Build a meal from the Indian food list. The Spike Predictor shows how high your sugar may go and how much a walk can lower it.' },
  { page: 'Activity', text: 'Log walks, yoga or exercise. Aim for 30 minutes a day, 150 minutes a week.' },
  { page: 'Medicines', text: 'Add your tablets and insulin once. Tap a dose each day to mark it as taken.' },
  { page: 'Food Fingerprint', text: 'Learns from your own meals and readings which foods raise your sugar more or less than expected.' },
  { page: 'Risk Check', text: 'Four quick questions from the Indian Diabetes Risk Score. Useful for family members.' },
  { page: 'Report', text: 'A 7, 14 or 30 day summary to print or save as PDF for your doctor.' },
];

export const FAQ = [
  { q: 'Do I need a sugar sensor?', a: 'No. DiaVita works with the normal finger-prick glucometer you already use. Each reading you add makes the advice more personal.' },
  { q: 'How does DiaVita learn my food pattern?', a: 'It matches each meal with your sugar reading taken one to three hours later. After a few meals it can tell which foods raise your sugar more than expected.' },
  { q: 'Which languages can I speak in?', a: 'English, Tamil and Hindi. Say the number and when you checked it, for example “sugar 140 after lunch”. The result is read back to you.' },
  { q: 'Voice entry does not start. What should I do?', a: 'Use Chrome or Edge, allow microphone access when the browser asks, and speak after the ring appears. You can always type the reading instead.' },
  { q: 'Is my data safe?', a: 'Your password is stored only in hashed form and every request needs your login token. Your readings are never shared with anyone.' },
  { q: 'Can DiaVita change my medicine dose?', a: 'No. DiaVita gives lifestyle guidance only. Always ask your doctor before changing medicines or insulin.' },
];

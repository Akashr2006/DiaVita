// DiaVita talking assistant.
// Understands short spoken sentences in Tamil, English and Hindi (also mixed Tanglish / Hinglish, as people
// really speak), runs a step-by-step conversation ("How much was it?", "Before or after food?", "Shall I
// save it?") and saves sugar readings, meals, walks and medicines through the normal API.
import { api, predictSpike } from '@/lib/api';

export const ASSISTANT_LANGS = [
  { code: 'ta', speech: 'ta-IN', label: 'தமிழ்' },
  { code: 'en', speech: 'en-IN', label: 'English' },
  { code: 'hi', speech: 'hi-IN', label: 'हिंदी' },
];

// ---------- understanding ----------

const WORDS = {
  sugar: ['sugar', 'suger', 'shugar', 'glucose', 'reading', 'சுகர்', 'ஷுகர்', 'சுகரு', 'சுகர', 'சக்கர', 'சர்க்கரை', 'குளுக்கோஸ்', 'க்ளுக்கோஸ்', 'குளுகோஸ்', 'ரீடிங்', 'शुगर', 'ग्लूकोज', 'शक्कर', 'रीडिंग'],
  check: ['check', 'checked', 'test', 'tested', 'செக்', 'டெஸ்ட்', 'பார்த்தேன்', 'பாத்தேன்', 'பாத்துட்டேன்', 'चेक', 'टेस्ट', 'जांच', 'जाँच'],
  med: ['tablet', 'tablets', 'medicine', 'medicines', 'pill', 'pills', 'insulin', 'metformin', 'maathirai', 'mathirai', 'marundhu', 'marunthu', 'மாத்திரை', 'மாத்திர', 'டேப்லெட்', 'டேப்லட்', 'மருந்து', 'இன்சுலின்', 'ஊசி', 'மெட்ஃபார்மின்', 'மெட்பார்மின்', 'दवा', 'दवाई', 'गोली', 'टैबलेट', 'इंसुलिन', 'इन्सुलिन'],
  walk: ['walk', 'walked', 'walking', 'exercise', 'jogging', 'nadandhen', 'nadanthen', 'nadai', 'நடந்தேன்', 'நடந்த', 'நடை', 'நடக்க', 'வாக்கிங்', 'வாக்', 'உடற்பயிற்சி', 'எக்சர்சைஸ்', 'चला', 'चली', 'चल', 'टहल', 'वॉक', 'सैर', 'व्यायाम', 'कसरत'],
  yoga: ['yoga', 'யோகா', 'योग'],
  eat: ['ate', 'eaten', 'eat', 'had', 'food', 'meal', 'breakfast', 'lunch', 'dinner', 'tiffin', 'saapten', 'sapten', 'saapadu', 'சாப்பிட்டேன்', 'சாப்டேன்', 'சாப்பாடு', 'சாப்ட்டேன்', 'டிபன்', 'உணவு', 'खाया', 'खाई', 'खाना', 'नाश्ता', 'भोजन'],
  status: ['how is', 'hows', 'how much', 'status', 'score', 'eppadi', 'எப்படி', 'நிலைமை', 'ஸ்கோர்', 'कैसा', 'कैसी', 'स्टेटस', 'स्कोर'],
  advice: ['what can i eat', 'what should i eat', 'what to eat', 'suggest', 'enna saapdalam', 'என்ன சாப்பிட', 'எதை சாப்பிட', 'என்ன சாப்டலாம்', 'எது சாப்பிட', 'क्या खा', 'क्या खाऊं', 'क्या खाना चाहिए'],
  hello: ['hello', 'hi', 'hey', 'vanakkam', 'வணக்கம்', 'ஹலோ', 'नमस्ते', 'नमस्कार', 'हेलो'],
  help: ['help', 'உதவி', 'ஹெல்ப்', 'मदद', 'हेल्प'],
  yes: ['yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'save', 'correct', 'right', 'aama', 'aamam', 'sari', 'seri', 'podu', 'ஆமா', 'ஆமாம்', 'சரி', 'ஓகே', 'ஓக்கே', 'போடு', 'பண்ணுங்க', 'பண்ணு', 'சேவ்', 'हाँ', 'हां', 'जी', 'ठीक', 'ओके', 'सही', 'कर दो'],
  no: ['no', 'nope', 'cancel', 'dont', "don't", 'venam', 'vendam', 'illa', 'இல்ல', 'இல்லை', 'வேண்டாம்', 'வேணாம்', 'வேணா', 'கேன்சல்', 'नहीं', 'नही', 'मत', 'कैंसल', 'रहने दो'],
  stop: ['stop', 'bye', 'thank you', 'thanks', 'போதும்', 'நன்றி', 'நிறுத்து', 'பை', 'बस', 'धन्यवाद', 'शुक्रिया', 'बाय'],
  unsure: ['dont know', "don't know", 'not sure', 'theriyala', 'தெரியல', 'தெரியாது', 'पता नहीं', 'मालूम नहीं'],
};

const CONTEXT_WORDS = [
  ['bedtime', ['bedtime', 'bed time', 'night', 'sleep', 'thoonga', 'இரவு', 'ராத்திரி', 'தூங்க', 'நைட்', 'रात', 'सोने', 'नाइट']],
  ['post_meal', ['after', 'post', 'apram', 'appuram', 'pinnadi', 'பின்', 'பிறகு', 'அப்புறம்', 'அப்பறம்', 'ஆஃப்டர்', 'बाद']],
  ['pre_meal', ['before', 'pre', 'munnadi', 'munnaadi', 'முன்', 'முன்னாடி', 'முன்னால', 'பிஃபோர்', 'पहले']],
  ['fasting', ['fasting', 'empty stomach', 'verum vayiru', 'வெறும்', 'வெறு வயிறு', 'காலை', 'பாஸ்டிங்', 'फास्टिंग', 'खाली पेट', 'सुबह']],
  ['random', ['random', 'சும்மா', 'ரேண்டம்', 'रैंडम']],
];

const MEAL_TYPE_WORDS = [
  ['breakfast', ['breakfast', 'tiffin', 'டிபன்', 'காலை', 'नाश्ता']],
  ['lunch', ['lunch', 'மதியம்', 'மத்தியானம்', 'लंच', 'दोपहर']],
  ['dinner', ['dinner', 'இரவு', 'ராத்திரி', 'நைட்', 'डिनर', 'रात']],
  ['snack', ['snack', 'ஸ்நாக்ஸ்', 'नमकीन']],
];

// Spoken food words -> food library names. More specific names come first.
const FOOD_WORDS = [
  ['Ragi Dosa', ['ragi', 'ராகி', 'கேழ்வரகு', 'रागी']],
  ['Brown Rice', ['brown rice', 'பிரவுன் ரைஸ்', 'ब्राउन राइस']],
  ['Foxtail Millet Rice', ['millet', 'thinai', 'தினை', 'சிறுதானியம்', 'कंगनी', 'बाजरा']],
  ['Veg Biryani', ['biryani', 'பிரியாணி', 'बिरयानी']],
  ['Whole Wheat Bread', ['wheat bread', 'கோதுமை பிரட்', 'आटा ब्रेड']],
  ['Idli', ['idli', 'idly', 'இட்லி', 'इडली']],
  ['Plain Dosa', ['dosa', 'dosai', 'தோசை', 'डोसा']],
  ['Rava Upma', ['upma', 'உப்புமா', 'उपमा']],
  ['Ven Pongal', ['pongal', 'பொங்கல்', 'पोंगल']],
  ['Poha', ['poha', 'aval', 'அவல்', 'पोहा']],
  ['Oats Porridge', ['oats', 'ஓட்ஸ்', 'ओट्स']],
  ['Chapati (Whole Wheat)', ['chapati', 'chapathi', 'roti', 'சப்பாத்தி', 'ரொட்டி', 'रोटी', 'चपाती']],
  ['White Rice', ['rice', 'sadam', 'satham', 'soru', 'சாதம்', 'சோறு', 'அரிசி', 'चावल', 'भात']],
  ['Sambar', ['sambar', 'சாம்பார்', 'सांभर', 'सांबर']],
  ['Dal (Lentils)', ['dal', 'paruppu', 'பருப்பு', 'दाल']],
  ['Chicken Curry', ['chicken', 'சிக்கன்', 'கோழி', 'चिकन']],
  ['Paneer', ['paneer', 'பன்னீர்', 'पनीर']],
  ['Boiled Egg', ['egg', 'eggs', 'muttai', 'முட்டை', 'अंडा', 'अंडे']],
  ['Sprouts Salad', ['sprouts', 'முளைகட்டிய', 'स्प्राउट']],
  ['Curd', ['curd', 'thayir', 'தயிர்', 'दही']],
  ['Banana', ['banana', 'வாழைப்பழம்', 'வாழை', 'केला']],
  ['Apple', ['apple', 'ஆப்பிள்', 'सेब']],
  ['Guava', ['guava', 'koyya', 'கொய்யா', 'अमरूद']],
  ['Mango', ['mango', 'மாம்பழம்', 'आम']],
  ['Vegetable Salad', ['salad', 'சாலட்', 'सलाद']],
  ['Almonds', ['almond', 'almonds', 'badam', 'பாதாம்', 'बादाम']],
  ['White Bread', ['bread', 'பிரட்', 'ब्रेड']],
  ['Gulab Jamun', ['jamun', 'gulab', 'ஜாமூன்', 'जामुन']],
  ['Tea with Sugar', ['tea', 'chai', 'டீ', 'தேநீர்', 'चाय']],
  ['Black Coffee', ['coffee', 'காபி', 'காப்பி', 'कॉफी', 'कॉफ़ी']],
  ['Soft Drink', ['soft drink', 'coke', 'pepsi', 'கூல் டிரிங்க்', 'कोल्ड ड्रिंक']],
];
// a more specific food replaces the general one it contains
const REPLACES = { 'Ragi Dosa': 'Plain Dosa', 'Brown Rice': 'White Rice', 'Foxtail Millet Rice': 'White Rice', 'Whole Wheat Bread': 'White Bread' };

// Number words. Speech recognition usually gives digits, but older people often say the words.
const NUM_WORDS = {
  // Tamil (formal and spoken forms)
  ஒன்று: 1, ஒண்ணு: 1, ஒரு: 1, இரண்டு: 2, ரெண்டு: 2, இரெண்டு: 2, மூன்று: 3, மூணு: 3, நான்கு: 4, நாலு: 4, ஐந்து: 5, அஞ்சு: 5,
  ஆறு: 6, ஏழு: 7, எட்டு: 8, ஒன்பது: 9, பத்து: 10, பதினைந்து: 15, பதினஞ்சு: 15, இருபது: 20, இருவது: 20, இருபத்தி: 20, இருபத்து: 20,
  முப்பது: 30, முப்பத்தி: 30, நாற்பது: 40, நாப்பது: 40, நாற்பத்தி: 40, நாப்பத்தி: 40, ஐம்பது: 50, அம்பது: 50, ஐம்பத்தி: 50, அம்பத்தி: 50,
  அறுபது: 60, அறுபத்தி: 60, எழுபது: 70, எழுபத்தி: 70, எண்பது: 80, எம்பது: 80, எண்பத்தி: 80, தொண்ணூறு: 90, தொண்ணூற்று: 90,
  நூறு: 100, நூற்று: 100, நூத்தி: 100, நூத்து: 100, இருநூறு: 200, இருநூற்று: 200, இருநூத்தி: 200, எருநூறு: 200, எர்நூத்தி: 200,
  முன்னூறு: 300, முந்நூறு: 300, முன்னூற்று: 300, முன்னூத்தி: 300, நானூறு: 400, நானூற்று: 400, ஐநூறு: 500,
  அரை: 0.5,
  // Hindi
  एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, पाँच: 5, छह: 6, सात: 7, आठ: 8, नौ: 9, दस: 10, पंद्रह: 15, बीस: 20, तीस: 30, चालीस: 40,
  पचास: 50, साठ: 60, सत्तर: 70, अस्सी: 80, नब्बे: 90, आधा: 0.5,
  // English
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, half: 0.5, rendu: 2, moonu: 3, naalu: 4,
};
const HUNDRED = { सौ: 100, hundred: 100 };

function normalise(text) {
  return String(text)
    .replace(/[௦-௯]/g, (d) => String(d.charCodeAt(0) - 0x0be6))
    .replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x0966))
    .toLowerCase()
    .replace(/[.,!?।"“”']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const isLatin = (w) => /^[a-z0-9 ']+$/.test(w);
function has(text, words) {
  return words.some((w) => (isLatin(w) ? new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(text) : text.includes(w)));
}
// position of the first matching word; English food words also match their plural ("idlis")
function firstIndex(text, words) {
  let best = -1;
  for (const w of words) {
    const m = isLatin(w) ? text.match(new RegExp(`(^|[^a-z])${w}(s|es)?([^a-z]|$)`)) : null;
    const i = isLatin(w) ? (m ? m.index + m[1].length : -1) : text.indexOf(w);
    if (i >= 0 && (best < 0 || i < best)) best = i;
  }
  return best;
}

// All numbers in the sentence, from digits or number words ("நூத்தி நாப்பது" -> 140, "एक सौ चालीस" -> 140)
export function extractNumbers(text) {
  const t = normalise(text);
  const out = [];
  for (const m of t.matchAll(/\d+(\.\d+)?/g)) out.push({ value: Number(m[0]), index: m.index });
  let run = null;
  let pos = 0;
  for (const tok of t.split(' ')) {
    const idx = t.indexOf(tok, pos);
    pos = idx + tok.length;
    // exact word first, otherwise the longest number word the token starts with ("நூத்திநாப்பது" -> நூத்தி)
    const word = NUM_WORDS[tok] !== undefined ? tok
      : Object.keys(NUM_WORDS).filter((w) => w.length >= 3 && tok.startsWith(w)).sort((a, b) => b.length - a.length)[0];
    if (word) {
      run = run ? { value: run.value + NUM_WORDS[word], index: run.index } : { value: NUM_WORDS[word], index: idx };
    } else if (HUNDRED[tok] && run) {
      run.value *= HUNDRED[tok];
    } else if (HUNDRED[tok]) {
      run = { value: 100, index: idx };
    } else if (run) {
      out.push(run);
      run = null;
    }
  }
  if (run) out.push(run);
  return out.sort((a, b) => a.index - b.index);
}

function findFoods(t) {
  const found = [];
  for (const [name, words] of FOOD_WORDS) {
    const i = firstIndex(t, words);
    if (i >= 0 && !found.some((f) => f.name === name)) found.push({ name, index: i });
  }
  const names = new Set(found.map((f) => f.name));
  return found
    .filter((f) => !Object.entries(REPLACES).some(([specific, general]) => f.name === general && names.has(specific)))
    .map((f) => {
      // a small number in the word just before the food is its quantity: "2 idli", "ரெண்டு இட்லி"
      const prevWord = t.slice(0, f.index).trim().split(' ').pop() || '';
      const before = extractNumbers(prevWord).pop();
      const spoken = Boolean(before && before.value > 0 && before.value <= 12);
      return { name: f.name, qty: spoken ? before.value : 1, spoken };
    });
}

// Reads one sentence and returns everything useful in it
export function understand(text) {
  const t = normalise(text);
  const numbers = extractNumbers(t).map((n) => n.value);
  const context = CONTEXT_WORDS.find(([, w]) => has(t, w))?.[0] || null;
  const mealType = MEAL_TYPE_WORDS.find(([, w]) => has(t, w))?.[0] || null;
  const foods = findFoods(t);
  const flags = Object.fromEntries(Object.entries(WORDS).map(([k, w]) => [k, has(t, w)]));
  const glucose = numbers.find((n) => n >= 20 && n <= 600);
  const minutesMatch = numbers.find((n) => n >= 1 && n <= 300);
  const hourWords = has(t, ['hour', 'hours', 'மணி', 'மணிநேரம்', 'घंटा', 'घंटे']);
  const hours = numbers.find((n) => n > 0 && n <= 3);
  return {
    text: t, numbers, context, mealType, foods, ...flags,
    value: glucose ?? null,
    // "half an hour" / "அரை மணி" -> 30, "ஒரு மணி நேரம்" -> 60, "20 நிமிஷம்" -> 20
    minutes: hourWords ? Math.round((hours || 1) * 60) : minutesMatch ?? null,
  };
}

// ---------- what the assistant says ----------

const FOOD_NAMES = {
  ta: { Idli: 'இட்லி', 'Plain Dosa': 'தோசை', 'Ragi Dosa': 'ராகி தோசை', 'Rava Upma': 'உப்புமா', 'Ven Pongal': 'பொங்கல்', Poha: 'அவல்', 'Oats Porridge': 'ஓட்ஸ்', 'Chapati (Whole Wheat)': 'சப்பாத்தி', 'White Rice': 'சாதம்', 'Brown Rice': 'பிரவுன் ரைஸ்', 'Foxtail Millet Rice': 'தினை சாதம்', 'Veg Biryani': 'பிரியாணி', Sambar: 'சாம்பார்', 'Dal (Lentils)': 'பருப்பு', 'Chicken Curry': 'சிக்கன் குழம்பு', Paneer: 'பன்னீர்', 'Boiled Egg': 'முட்டை', 'Sprouts Salad': 'முளைகட்டிய பயறு', Curd: 'தயிர்', Banana: 'வாழைப்பழம்', Apple: 'ஆப்பிள்', Guava: 'கொய்யா', Mango: 'மாம்பழம்', 'Vegetable Salad': 'சாலட்', Almonds: 'பாதாம்', 'White Bread': 'பிரட்', 'Whole Wheat Bread': 'கோதுமை பிரட்', 'Gulab Jamun': 'குலாப் ஜாமூன்', 'Tea with Sugar': 'டீ', 'Black Coffee': 'காபி', 'Soft Drink': 'கூல் டிரிங்க்' },
  taRoman: { Idli: 'idli', 'Plain Dosa': 'dosai', 'Ragi Dosa': 'ragi dosai', 'Rava Upma': 'upma', 'Ven Pongal': 'pongal', Poha: 'aval', 'Oats Porridge': 'oats', 'Chapati (Whole Wheat)': 'chapathi', 'White Rice': 'saadham', 'Brown Rice': 'brown rice', 'Foxtail Millet Rice': 'thinai saadham', 'Veg Biryani': 'biryani', Sambar: 'sambar', 'Dal (Lentils)': 'paruppu', 'Chicken Curry': 'chicken kuzhambu', Paneer: 'paneer', 'Boiled Egg': 'muttai', 'Sprouts Salad': 'mulaikattiya payaru', Curd: 'thayir', Banana: 'vaazhaipazham', Apple: 'apple', Guava: 'koyya', Mango: 'maambazham', 'Vegetable Salad': 'salad', Almonds: 'badam', 'White Bread': 'bread', 'Whole Wheat Bread': 'wheat bread', 'Gulab Jamun': 'gulab jamun', 'Tea with Sugar': 'tea', 'Black Coffee': 'coffee', 'Soft Drink': 'cool drink' },
  hi: { Idli: 'इडली', 'Plain Dosa': 'डोसा', 'Ragi Dosa': 'रागी डोसा', 'Rava Upma': 'उपमा', 'Ven Pongal': 'पोंगल', Poha: 'पोहा', 'Oats Porridge': 'ओट्स', 'Chapati (Whole Wheat)': 'रोटी', 'White Rice': 'चावल', 'Brown Rice': 'ब्राउन राइस', 'Foxtail Millet Rice': 'कंगनी चावल', 'Veg Biryani': 'बिरयानी', Sambar: 'सांभर', 'Dal (Lentils)': 'दाल', 'Chicken Curry': 'चिकन करी', Paneer: 'पनीर', 'Boiled Egg': 'अंडा', 'Sprouts Salad': 'अंकुरित सलाद', Curd: 'दही', Banana: 'केला', Apple: 'सेब', Guava: 'अमरूद', Mango: 'आम', 'Vegetable Salad': 'सलाद', Almonds: 'बादाम', 'White Bread': 'ब्रेड', 'Whole Wheat Bread': 'आटा ब्रेड', 'Gulab Jamun': 'गुलाब जामुन', 'Tea with Sugar': 'चाय', 'Black Coffee': 'कॉफ़ी', 'Soft Drink': 'कोल्ड ड्रिंक' },
};
const foodName = (lang, name) => FOOD_NAMES[lang]?.[name] || name;
const foodList = (lang, items) => items.map((i) => `${i.qty !== 1 ? `${i.qty} ` : ''}${foodName(lang, i.name)}`).join(', ');

const CTX = {
  ta: { fasting: 'வெறும் வயிற்றுல', pre_meal: 'சாப்பிடுறதுக்கு முன்னாடி', post_meal: 'சாப்பிட்ட பின்னாடி', bedtime: 'தூங்குறதுக்கு முன்னாடி', random: 'சும்மா பார்த்தது' },
  taRoman: { fasting: 'verum vayitrula', pre_meal: 'saapdradhukku munnadi', post_meal: 'saapta pinnadi', bedtime: 'thoongradhukku munnadi', random: 'summa paathadhu' },
  en: { fasting: 'fasting', pre_meal: 'before food', post_meal: 'after food', bedtime: 'at bedtime', random: 'a random check' },
  hi: { fasting: 'खाली पेट', pre_meal: 'खाने से पहले', post_meal: 'खाने के बाद', bedtime: 'सोने से पहले', random: 'कभी भी' },
};
const LEVEL = {
  ta: { low: 'குறைவு', ok: 'சரியான அளவு', high: 'அதிகம்', veryhigh: 'ரொம்ப அதிகம்' },
  taRoman: { low: 'kuraivu', ok: 'sariyana alavu', high: 'adhigam', veryhigh: 'romba adhigam' },
  en: { low: 'low', ok: 'in range', high: 'high', veryhigh: 'very high' },
  hi: { low: 'कम', ok: 'सही', high: 'ज़्यादा', veryhigh: 'बहुत ज़्यादा' },
};
const ACT = { ta: { walking: 'நடை', yoga: 'யோகா' }, taRoman: { walking: 'nadai', yoga: 'yoga' }, en: { walking: 'walking', yoga: 'yoga' }, hi: { walking: 'सैर', yoga: 'योग' } };

// Every message in Tamil (script + romanised for voices that cannot read Tamil), English and Hindi
const MSG = {
  greet: {
    ta: (p) => `வணக்கம் ${p.name}! நான் DiaVita. சுகர், சாப்பாடு, மாத்திரை, நடை — எதை பதிவு பண்ணணும்னு சொல்லுங்க.`,
    taRoman: (p) => `Vanakkam ${p.name}! Naan DiaVita. Sugar, saapaadu, maathirai, nadai, edhai padhivu pannanum-nu sollunga.`,
    en: (p) => `Hello ${p.name}! I am DiaVita. Tell me your sugar reading, food, tablets or walk, and I will save it.`,
    hi: (p) => `नमस्ते ${p.name}! मैं DiaVita हूँ। शुगर, खाना, दवा या सैर — जो भी बताना हो, बोलिए।`,
  },
  help: {
    ta: () => 'இப்படி சொல்லலாம்: "சுகர் 140 சாப்பிட்ட பின்", "ரெண்டு இட்லி சாப்பிட்டேன்", "மாத்திரை போட்டுட்டேன்", "20 நிமிஷம் நடந்தேன்", "என் சுகர் எப்படி இருக்கு?"',
    taRoman: () => 'Ippadi sollalaam: sugar 140 saapta pinnadi, rendu idli saapten, maathirai pottuten, 20 nimisham nadandhen, en sugar eppadi irukku.',
    en: () => 'You can say: "sugar 140 after lunch", "I ate 2 idlis", "I took my tablet", "I walked 20 minutes", or "how is my sugar?"',
    hi: () => 'आप ऐसे बोल सकते हैं: "शुगर 140 खाने के बाद", "दो इडली खाई", "दवा ले ली", "20 मिनट टहला", "मेरी शुगर कैसी है?"',
  },
  askValue: {
    ta: () => 'சரி மா, பதிவு பண்றேன். சுகர் எவ்வளவு வந்துச்சு? நம்பரை சொல்லுங்க.',
    taRoman: () => 'Sari maa, padhivu panren. Sugar evlo vandhuchu? Number-a sollunga.',
    en: () => 'Sure, I will add it. What was the reading? Please tell me the number.',
    hi: () => 'ठीक है, मैं जोड़ देती हूँ। शुगर कितनी आई? नंबर बताइए।',
  },
  askNumberAgain: {
    ta: () => 'நம்பர் சரியா கேட்கல. "நூத்தி நாப்பது" இல்ல "140" மாதிரி சொல்லுங்க.',
    taRoman: () => 'Number sariyaa ketkala. Nootthi naappadhu, illa 140 maadhiri sollunga.',
    en: () => 'I did not catch the number. Please say it like "140".',
    hi: () => 'नंबर ठीक से सुनाई नहीं दिया। "140" जैसे बोलिए।',
  },
  askContext: {
    ta: (p) => `${p.value}. சாப்பிடுறதுக்கு முன்னாடியா, சாப்பிட்ட பின்னாடியா, இல்ல வெறும் வயிற்றுலயா?`,
    taRoman: (p) => `${p.value}. Saapdradhukku munnadiyaa, saapta pinnadiyaa, illa verum vayitrula-vaa?`,
    en: (p) => `${p.value}. Was it before food, after food, fasting, or at bedtime?`,
    hi: (p) => `${p.value}। खाने से पहले, खाने के बाद, खाली पेट या सोने से पहले?`,
  },
  confirmSugar: {
    ta: (p) => `${p.value}, ${CTX.ta[p.context]}. சேவ் பண்ணட்டுமா?`,
    taRoman: (p) => `${p.value}, ${CTX.taRoman[p.context]}. Save pannattumaa?`,
    en: (p) => `${p.value} milligrams, ${CTX.en[p.context]}. Shall I save it?`,
    hi: (p) => `${p.value}, ${CTX.hi[p.context]}। सेव कर दूँ?`,
  },
  savedSugar: {
    ta: (p) => `பதிவு பண்ணிட்டேன். ${{
      low: 'சுகர் ரொம்ப குறைவா இருக்கு! உடனே 3 ஸ்பூன் சர்க்கரை தண்ணில கலந்து குடிங்க. 15 நிமிஷம் கழிச்சு திரும்ப செக் பண்ணுங்க.',
      ok: 'சுகர் சரியான அளவுல இருக்கு. ரொம்ப நல்லது!',
      high: 'சுகர் கொஞ்சம் அதிகமா இருக்கு. தண்ணி குடிச்சு, 10 நிமிஷம் நடங்க.',
      veryhigh: 'சுகர் ரொம்ப அதிகமா இருக்கு. நிறைய தண்ணி குடிங்க. இப்படியே இருந்தா டாக்டரை பாருங்க.',
    }[p.level]}`,
    taRoman: (p) => `Padhivu pannitten. ${{
      low: 'Sugar romba kammiyaa irukku! Udane moonu spoon sakkarai thanni-la kalandhu kudinga. Padhinanju nimisham kazhichu thirumba check pannunga.',
      ok: 'Sugar sariyana alavula irukku. Romba nalladhu!',
      high: 'Sugar konjam adhigamaa irukku. Thanni kudichu, pathu nimisham nadanga.',
      veryhigh: 'Sugar romba adhigamaa irukku. Niraiya thanni kudinga. Ippadiye irundhaa doctor-a paarunga.',
    }[p.level]}`,
    en: (p) => `Saved. ${{
      low: 'Your sugar is low! Take 3 spoons of sugar in water now, and check again in 15 minutes.',
      ok: 'Your sugar is in the healthy range. Well done!',
      high: 'Your sugar is a little high. Drink water and take a 10 minute walk.',
      veryhigh: 'Your sugar is very high. Drink plenty of water. If it stays this high, please call your doctor.',
    }[p.level]}`,
    hi: (p) => `सेव कर दिया। ${{
      low: 'शुगर बहुत कम है! अभी 3 चम्मच चीनी पानी में घोलकर पिएँ, 15 मिनट बाद फिर जाँचें।',
      ok: 'शुगर सही सीमा में है। बहुत अच्छे!',
      high: 'शुगर थोड़ी ज़्यादा है। पानी पिएँ और 10 मिनट टहलें।',
      veryhigh: 'शुगर बहुत ज़्यादा है। खूब पानी पिएँ। ऐसी ही रहे तो डॉक्टर से बात करें।',
    }[p.level]}`,
  },
  medNone: {
    ta: () => 'இன்னிக்கு மாத்திரை எதுவும் பாக்கி இல்ல. எல்லாம் போட்டாச்சு!',
    taRoman: () => 'Innikku maathirai edhuvum baakki illa. Ellaam pottaachu!',
    en: () => 'No medicine is pending today. All done!',
    hi: () => 'आज कोई दवा बाकी नहीं है। सब हो गया!',
  },
  medNoList: {
    ta: () => 'உங்க மாத்திரை லிஸ்ட் இன்னும் சேர்க்கல. மாத்திரை பக்கத்துல ஒரு தடவை சேர்த்துடுங்க.',
    taRoman: () => 'Unga maathirai list innum serkkala. Maathirai pakkathula oru thadavai serthudunga.',
    en: () => 'Your medicine list is empty. Please add your medicines once on the Medicines page.',
    hi: () => 'आपकी दवा की सूची खाली है। दवा वाले पेज पर एक बार दवाएँ जोड़ दीजिए।',
  },
  confirmMed: {
    ta: (p) => `${p.name} ${p.dosage}, ${p.time} மணி மாத்திரை போட்டீங்கன்னு குறிச்சிடட்டுமா?`,
    taRoman: (p) => `${p.name} ${p.dosage}, ${p.time} mani maathirai potteenga-nu kurichidattumaa?`,
    en: (p) => `Shall I mark ${p.name} ${p.dosage}, the ${p.time} dose, as taken?`,
    hi: (p) => `${p.name} ${p.dosage}, ${p.time} बजे वाली दवा — ले ली, लिख दूँ?`,
  },
  savedMed: {
    ta: (p) => (p.left ? `குறிச்சிட்டேன். இன்னும் ${p.left} மாத்திரை பாக்கி இருக்கு.` : 'குறிச்சிட்டேன். இன்னிக்கு எல்லா மாத்திரையும் முடிஞ்சது. சூப்பர்!'),
    taRoman: (p) => (p.left ? `Kurichitten. Innum ${p.left} maathirai baakki irukku.` : 'Kurichitten. Innikku ella maathiraiyum mudinjadhu. Super!'),
    en: (p) => (p.left ? `Done. ${p.left} more dose${p.left > 1 ? 's' : ''} left today.` : 'Done. All of today\'s medicines are taken. Great!'),
    hi: (p) => (p.left ? `लिख दिया। आज ${p.left} दवा और बाकी है।` : 'लिख दिया। आज की सारी दवाएँ हो गईं। बहुत बढ़िया!'),
  },
  askMinutes: {
    ta: (p) => `எவ்வளவு நிமிஷம் ${p.type === 'yoga' ? 'யோகா பண்ணீங்க' : 'நடந்தீங்க'}?`,
    taRoman: (p) => `Evlo nimisham ${p.type === 'yoga' ? 'yoga panneenga' : 'nadandheenga'}?`,
    en: (p) => `How many minutes did you ${p.type === 'yoga' ? 'do yoga' : 'walk'}?`,
    hi: (p) => `कितने मिनट ${p.type === 'yoga' ? 'योग किया' : 'टहले'}?`,
  },
  confirmWalk: {
    ta: (p) => `${p.minutes} நிமிஷம் ${ACT.ta[p.type]}. சேவ் பண்ணட்டுமா?`,
    taRoman: (p) => `${p.minutes} nimisham ${ACT.taRoman[p.type]}. Save pannattumaa?`,
    en: (p) => `${p.minutes} minutes of ${ACT.en[p.type]}. Shall I save it?`,
    hi: (p) => `${p.minutes} मिनट ${ACT.hi[p.type]}। सेव कर दूँ?`,
  },
  savedWalk: {
    ta: (p) => `சேவ் பண்ணிட்டேன். இன்னிக்கு மொத்தம் ${p.total} நிமிஷம். ${p.total >= 30 ? 'இன்னிக்கு இலக்கு முடிஞ்சது!' : `இன்னும் ${30 - p.total} நிமிஷம் நடந்தா இலக்கு முடியும்.`}`,
    taRoman: (p) => `Save pannitten. Innikku mottham ${p.total} nimisham. ${p.total >= 30 ? 'Innikku ilakku mudinjadhu!' : `Innum ${30 - p.total} nimisham nadandhaa ilakku mudiyum.`}`,
    en: (p) => `Saved. ${p.total} active minutes today. ${p.total >= 30 ? 'Today\'s goal is done!' : `${30 - p.total} more minutes to reach today's goal.`}`,
    hi: (p) => `सेव कर दिया। आज कुल ${p.total} मिनट। ${p.total >= 30 ? 'आज का लक्ष्य पूरा!' : `लक्ष्य के लिए ${30 - p.total} मिनट और।`}`,
  },
  askFood: {
    ta: () => 'என்ன சாப்பிட்டீங்க?',
    taRoman: () => 'Enna saapteenga?',
    en: () => 'What did you eat?',
    hi: () => 'क्या खाया?',
  },
  confirmMeal: {
    ta: (p) => `${foodList('ta', p.items)}. இந்த சாப்பாட்டுக்கு சுகர் சுமார் ${p.peak} வரைக்கும் போகலாம். 15 நிமிஷம் நடந்தா ${p.peakWalk} தான். சேவ் பண்ணட்டுமா?`,
    taRoman: (p) => `${foodList('taRoman', p.items)}. Indha saapaattukku sugar sumaar ${p.peak} varaikkum pogalaam. Padhinanju nimisham nadandhaa ${p.peakWalk} thaan. Save pannattumaa?`,
    en: (p) => `${foodList('en', p.items)}. This meal may take your sugar to about ${p.peak}. A 15 minute walk keeps it near ${p.peakWalk}. Shall I save it?`,
    hi: (p) => `${foodList('hi', p.items)}। इस खाने से शुगर लगभग ${p.peak} तक जा सकती है। 15 मिनट टहलें तो ${p.peakWalk} तक। सेव कर दूँ?`,
  },
  savedMeal: {
    ta: (p) => `சேவ் பண்ணிட்டேன்.${p.swap ? ` அடுத்த தடவை ${foodName('ta', p.swap)} ட்ரை பண்ணுங்க, சுகர் குறைவா ஏறும்.` : ''}`,
    taRoman: (p) => `Save pannitten.${p.swap ? ` Adutha thadavai ${foodName('taRoman', p.swap)} try pannunga, sugar kammiyaa yerum.` : ''}`,
    en: (p) => `Saved.${p.swap ? ` Next time, try ${p.swap}. It raises sugar less.` : ''}`,
    hi: (p) => `सेव कर दिया।${p.swap ? ` अगली बार ${foodName('hi', p.swap)} खाकर देखिए, शुगर कम बढ़ेगी।` : ''}`,
  },
  status: {
    ta: (p) => `உங்க கடைசி சுகர் ${p.value}, ${CTX.ta[p.context]} — ${LEVEL.ta[p.level]}. இந்த வாரம் ${p.tir}% நேரம் சரியான அளவுல இருந்துச்சு. இன்னிக்கு ஸ்கோர் ${p.score}.`,
    taRoman: (p) => `Unga kadaisi sugar ${p.value}, ${CTX.taRoman[p.context]}, ${LEVEL.taRoman[p.level]}. Indha vaaram ${p.tir} sadhaveedham sariyana alavula irundhuchu. Innikku score ${p.score}.`,
    en: (p) => `Your last reading was ${p.value}, ${CTX.en[p.context]}, which is ${LEVEL.en[p.level]}. This week you were in range ${p.tir}% of the time. Today's score is ${p.score}.`,
    hi: (p) => `आपकी पिछली शुगर ${p.value} थी, ${CTX.hi[p.context]} — ${LEVEL.hi[p.level]}। इस हफ़्ते ${p.tir}% समय शुगर सही रही। आज का स्कोर ${p.score} है।`,
  },
  statusNone: {
    ta: () => 'இன்னும் சுகர் பதிவு எதுவும் இல்ல. முதல்ல ஒரு ரீடிங் சொல்லுங்க.',
    taRoman: () => 'Innum sugar padhivu edhuvum illa. Mudhalla oru reading sollunga.',
    en: () => 'There are no readings yet. Tell me your first sugar reading.',
    hi: () => 'अभी कोई रीडिंग नहीं है। पहली शुगर रीडिंग बताइए।',
  },
  advice: {
    ta: (p) => `உங்களுக்கு நல்ல சாப்பாடு: ${p.good.map((n) => foodName('ta', n)).join(', ')}. குறைவா சாப்பிட வேண்டியது: ${p.avoid.map((n) => foodName('ta', n)).join(', ')}.`,
    taRoman: (p) => `Ungalukku nalla saapaadu: ${p.good.map((n) => foodName('taRoman', n)).join(', ')}. Kuraivaa saapida vendiyadhu: ${p.avoid.map((n) => foodName('taRoman', n)).join(', ')}.`,
    en: (p) => `Good foods for you: ${p.good.join(', ')}. Eat less of: ${p.avoid.join(', ')}.`,
    hi: (p) => `आपके लिए अच्छा खाना: ${p.good.map((n) => foodName('hi', n)).join(', ')}। कम खाएँ: ${p.avoid.map((n) => foodName('hi', n)).join(', ')}।`,
  },
  adviceNone: {
    ta: () => 'உங்க சாப்பாட்டு பழக்கத்தை கத்துக்க இன்னும் கொஞ்சம் சாப்பாடும் சுகர் ரீடிங்கும் வேணும்.',
    taRoman: () => 'Unga saapaattu pazhakkatha kathukka innum konjam saapaadum sugar readingum venum.',
    en: () => 'I need a few more meals and after-meal readings to learn your food pattern.',
    hi: () => 'आपका खाने का पैटर्न सीखने के लिए कुछ और खाने और रीडिंग चाहिए।',
  },
  cancelled: {
    ta: () => 'சரி, விட்டுடுறேன்.',
    taRoman: () => 'Sari, vittudren.',
    en: () => 'Okay, I will not save it.',
    hi: () => 'ठीक है, रहने देते हैं।',
  },
  anythingElse: {
    ta: () => 'வேற ஏதாவது சொல்லணுமா?',
    taRoman: () => 'Vera edhaavadhu sollanumaa?',
    en: () => 'Anything else?',
    hi: () => 'और कुछ?',
  },
  bye: {
    ta: () => 'சரி மா, உடம்ப பாத்துக்கோங்க!',
    taRoman: () => 'Sari maa, udamba paathukonga!',
    en: () => 'Okay, take care!',
    hi: () => 'ठीक है, अपना ख़याल रखिए!',
  },
  notUnderstood: {
    ta: () => 'மன்னிக்கணும், புரியல. கீழே இருக்கிற பட்டனை அழுத்துங்க, இல்ல திரும்ப சொல்லுங்க.',
    taRoman: () => 'Mannikkanum, puriyala. Keezhe irukkira button-a azhuthunga, illa thirumba sollunga.',
    en: () => 'Sorry, I did not understand. Tap a button below or say it again.',
    hi: () => 'माफ़ कीजिए, समझ नहीं आया। नीचे बटन दबाइए या फिर से बोलिए।',
  },
  error: {
    ta: () => 'மன்னிக்கணும், சேவ் ஆகல. இன்டர்நெட்டை பாருங்க, திரும்ப முயற்சி பண்ணுங்க.',
    taRoman: () => 'Mannikkanum, save aagala. Internet-a paarunga, thirumba muyarchi pannunga.',
    en: () => 'Sorry, it did not save. Please check the internet and try again.',
    hi: () => 'माफ़ कीजिए, सेव नहीं हुआ। इंटरनेट देखिए और फिर कोशिश कीजिए।',
  },
};

// One reply: what to show and what to speak (romanised Tamil is used when no Tamil voice is installed)
function say(lang, key, p = {}) {
  const m = MSG[key];
  return { text: m[lang](p), roman: lang === 'ta' ? m.taRoman(p) : null };
}
function join(...replies) {
  return { text: replies.map((r) => r.text).join(' '), roman: replies.every((r) => r.roman) ? replies.map((r) => r.roman).join(' ') : null };
}

// Buttons under the conversation, in the patient's language
const LABELS = {
  ta: { sugar: 'சுகர்', meal: 'சாப்பாடு', med: 'மாத்திரை போட்டேன்', walk: 'நடந்தேன்', status: 'என் சுகர் எப்படி?', advice: 'என்ன சாப்பிடலாம்?', yes: 'ஆமா, சேவ்', no: 'வேண்டாம்', fasting: 'வெறும் வயிறு', pre_meal: 'சாப்பாட்டுக்கு முன்', post_meal: 'சாப்பிட்ட பின்', bedtime: 'தூங்கும் முன்', unsure: 'தெரியல' },
  en: { sugar: 'Sugar', meal: 'Food', med: 'Took tablet', walk: 'Walked', status: 'How is my sugar?', advice: 'What can I eat?', yes: 'Yes, save', no: 'No', fasting: 'Fasting', pre_meal: 'Before food', post_meal: 'After food', bedtime: 'Bedtime', unsure: 'Not sure' },
  hi: { sugar: 'शुगर', meal: 'खाना', med: 'दवा ले ली', walk: 'टहला', status: 'मेरी शुगर कैसी है?', advice: 'क्या खाऊँ?', yes: 'हाँ, सेव', no: 'नहीं', fasting: 'खाली पेट', pre_meal: 'खाने से पहले', post_meal: 'खाने के बाद', bedtime: 'सोने से पहले', unsure: 'पता नहीं' },
};
const QUICK_FOODS = ['Idli', 'Plain Dosa', 'Chapati (Whole Wheat)', 'White Rice', 'Ven Pongal', 'Rava Upma', 'Ragi Dosa', 'Tea with Sugar'];

export function quickReplies(lang, state) {
  const L = LABELS[lang];
  if (state.step === 'confirm') return [{ label: L.yes, input: { yes: true }, tone: 'yes' }, { label: L.no, input: { no: true }, tone: 'no' }];
  if (state.step === 'ask_context') return ['fasting', 'pre_meal', 'post_meal', 'bedtime', 'unsure'].map((c) => ({ label: L[c], input: { context: c === 'unsure' ? 'random' : c } }));
  if (state.step === 'ask_food') return QUICK_FOODS.map((f) => ({ label: foodName(lang === 'en' ? 'en' : lang, f), input: { foods: [{ name: f, qty: 1 }] } }));
  if (state.step === 'ask_minutes') return [10, 15, 20, 30, 45].map((m) => ({ label: `${m}`, input: { minutes: m } }));
  if (state.step === 'ask_value') return [];
  return ['sugar', 'meal', 'med', 'walk', 'status', 'advice'].map((k) => ({ label: L[k], input: { intent: k } }));
}

// ---------- conversation ----------

export const newConversation = () => ({ step: 'idle', intent: null, slots: {}, firstText: '' });

const levelOf = (v, hi) => (v < 70 ? 'low' : v <= hi ? 'ok' : v <= 250 ? 'high' : 'veryhigh');
const mealTypeNow = () => { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 19 ? 'snack' : 'dinner'; };
const hhmm = (t) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''}`; };

// Data the assistant needs is loaded once per conversation and kept here
async function cached(cache, key, path) {
  if (!cache[key]) cache[key] = await api(path);
  return cache[key];
}

// Moves the conversation one step. input = { text } from speech/typing, or a button's { intent | yes | no | context | foods | minutes }.
// Returns { state, reply, done, saved } — reply = { text, roman }, saved = what changed (for live refresh).
export async function converse(state, input, { lang, user, cache }) {
  const u = input.text ? understand(input.text) : { numbers: [], foods: [] };
  if (input.intent) u[input.intent === 'meal' ? 'eat' : input.intent] = true;
  if (input.yes) u.yes = true;
  if (input.no) u.no = true;
  if (input.context) u.context = input.context;
  if (input.foods) u.foods = input.foods;
  if (input.minutes) { u.minutes = input.minutes; u.numbers = [input.minutes]; }
  const s = { ...state, slots: { ...state.slots } };
  const reply = (key, p, extra = {}) => ({ state: s, reply: say(lang, key, p), ...extra });

  if (u.stop && !u.yes) return { state: newConversation(), reply: say(lang, 'bye'), done: true };

  // --- answers to a question the assistant asked ---
  if (s.step === 'confirm') {
    // a different number is a correction ("இல்ல, 150"), not a yes or no
    if (s.intent === 'sugar' && u.value && u.value !== s.slots.value) { s.slots.value = u.value; if (u.context) s.slots.context = u.context; return reply('confirmSugar', s.slots); }
    if (s.intent === 'walk' && u.minutes && u.minutes !== s.slots.minutes && !u.yes) { s.slots.minutes = u.minutes; return reply('confirmWalk', s.slots); }
    if (u.yes && !u.no) return save(s, { lang, user, cache });
    if (u.no) return { state: newConversation(), reply: join(say(lang, 'cancelled'), say(lang, 'anythingElse')) };
    return reply(s.intent === 'sugar' ? 'confirmSugar' : s.intent === 'walk' ? 'confirmWalk' : s.intent === 'med' ? 'confirmMed' : 'confirmMeal', s.slots);
  }
  if (s.step === 'ask_value') {
    if (u.no) return { state: newConversation(), reply: say(lang, 'cancelled') };
    if (!u.value) return reply('askNumberAgain');
    s.slots.value = u.value;
    if (u.context) s.slots.context = u.context;
    return sugarNext(s, lang);
  }
  if (s.step === 'ask_context') {
    if (u.no) return { state: newConversation(), reply: say(lang, 'cancelled') };
    if (u.context || u.unsure) { s.slots.context = u.context || 'random'; return sugarNext(s, lang); }
    return reply('askContext', s.slots);
  }
  if (s.step === 'ask_minutes') {
    if (u.no) return { state: newConversation(), reply: say(lang, 'cancelled') };
    if (!u.minutes) return reply('askMinutes', s.slots);
    s.slots.minutes = u.minutes;
    s.step = 'confirm';
    return reply('confirmWalk', s.slots);
  }
  if (s.step === 'ask_food') {
    if (u.no) return { state: newConversation(), reply: say(lang, 'cancelled') };
    if (!u.foods.length) return reply('askFood');
    return mealNext(s, u, { lang, cache });
  }

  // --- a new request ---
  s.firstText = input.text || '';
  if (u.med) {
    const meds = await api('/medications');
    if (!meds.length) return { state: newConversation(), reply: say(lang, 'medNoList') };
    const pending = meds.filter((m) => !m.taken_today);
    if (!pending.length) return { state: newConversation(), reply: say(lang, 'medNone') };
    const now = new Date().getHours() * 60 + new Date().getMinutes();
    const byName = pending.find((m) => u.text?.includes(m.name.toLowerCase()));
    const mins = (m) => { const [h, mm] = m.schedule_time.split(':').map(Number); return Math.abs(h * 60 + mm - now); };
    const med = byName || [...pending].sort((a, b) => mins(a) - mins(b))[0];
    Object.assign(s, { step: 'confirm', intent: 'med' });
    s.slots = { id: med.id, name: med.name, dosage: med.dosage, time: hhmm(med.schedule_time), left: pending.length - 1 };
    return reply('confirmMed', s.slots);
  }
  if (u.advice) {
    const fp = await cached(cache, 'fingerprint', '/smart/food-response');
    const foods = (fp.foods || []).filter((f) => f.meals >= 1);
    if (foods.length < 4) return { state: newConversation(), reply: say(lang, 'adviceNone') };
    const good = foods.slice(-3).reverse().map((f) => f.name);
    const avoid = foods.slice(0, 2).map((f) => f.name);
    return { state: newConversation(), reply: say(lang, 'advice', { good, avoid }) };
  }
  if (u.status && !u.value) {
    const sum = await api('/insights/summary');
    const last = sum.glucose.latest;
    if (!last) return { state: newConversation(), reply: say(lang, 'statusNone') };
    const value = Math.round(last.value);
    return { state: newConversation(), reply: say(lang, 'status', { value, context: last.context, level: levelOf(value, user.target_max), tir: sum.glucose.week.time_in_range ?? 0, score: sum.score }) };
  }
  if (u.walk || u.yoga) {
    Object.assign(s, { intent: 'walk' });
    s.slots = { type: u.yoga ? 'yoga' : 'walking', minutes: u.minutes };
    if (!u.minutes) { s.step = 'ask_minutes'; return reply('askMinutes', s.slots); }
    s.step = 'confirm';
    return reply('confirmWalk', s.slots);
  }
  // "சாப்பிட்ட பின்" (after food) describes a sugar reading, so eating words count as a meal only without a time-of-check word
  const mealWords = u.foods.length || (u.eat && !u.context);
  if (u.sugar || u.check || (u.value && !mealWords)) {
    Object.assign(s, { intent: 'sugar' });
    s.slots = { value: u.value, context: u.context };
    if (!u.value) { s.step = 'ask_value'; return reply('askValue'); }
    return sugarNext(s, lang);
  }
  if (mealWords) {
    Object.assign(s, { intent: 'meal' });
    s.slots = { mealType: u.mealType || mealTypeNow() };
    if (!u.foods.length) { s.step = 'ask_food'; return reply('askFood'); }
    return mealNext(s, u, { lang, cache });
  }
  if (u.help) return { state: newConversation(), reply: say(lang, 'help') };
  if (u.hello) return { state: newConversation(), reply: say(lang, 'greet', { name: user.name.split(' ')[0] }) };
  return { state: newConversation(), reply: say(lang, 'notUnderstood') };
}

// People count pieces ("2 idli") but the food library counts servings ("2 pieces" = 1 serving).
// A food named without a number counts as one usual serving.
function servingsFor({ qty, spoken, food }) {
  if (!spoken) return 1;
  const m = /^(\d+(?:\.\d+)?)\s*(pieces?|slices?|nuts?|eggs?|medium|piece)/i.exec(food.serving || '');
  const perServing = m ? Number(m[1]) : 1;
  return Math.max(0.5, Math.round((qty / perServing) * 2) / 2);
}

function sugarNext(s, lang) {
  if (!s.slots.context) { s.step = 'ask_context'; return { state: s, reply: say(lang, 'askContext', s.slots) }; }
  s.step = 'confirm';
  return { state: s, reply: say(lang, 'confirmSugar', s.slots) };
}

async function mealNext(s, u, { lang, cache }) {
  const [foods, model] = await Promise.all([cached(cache, 'foods', '/meals/foods'), cached(cache, 'model', '/smart/spike-model').catch(() => null)]);
  const items = u.foods.map((f) => ({ ...f, food: foods.find((x) => x.name === f.name) })).filter((f) => f.food)
    .map((i) => ({ ...i, servings: servingsFor(i) }));
  if (!items.length) { s.step = 'ask_food'; return { state: s, reply: say(lang, 'askFood') }; }
  const plate = items.map((i) => ({ food: i.food, qty: i.servings }));
  const now = model ? predictSpike(model, plate, 0) : null;
  const walk = model ? predictSpike(model, plate, 15) : null;
  s.slots = { ...s.slots, items: items.map(({ name, qty, spoken, servings, food }) => ({ name, qty: spoken ? qty : 1, servings, id: food.id, gi: food.gi })), peak: now?.peak ?? '—', peakWalk: walk?.peak ?? '—' };
  s.step = 'confirm';
  return { state: s, reply: say(lang, 'confirmMeal', s.slots) };
}

async function save(s, { lang, user, cache }) {
  const done = { state: newConversation() };
  try {
    if (s.intent === 'sugar') {
      const value = Math.round(s.slots.value);
      await api('/glucose', { method: 'POST', body: { value, context: s.slots.context, source: 'voice', note: `Voice: ${s.firstText || value}` } });
      delete cache.model;
      return { ...done, saved: 'glucose', reply: join(say(lang, 'savedSugar', { level: levelOf(value, user.target_max) }), say(lang, 'anythingElse')) };
    }
    if (s.intent === 'med') {
      await api(`/medications/${s.slots.id}/toggle`, { method: 'POST' });
      return { ...done, saved: 'medications', reply: join(say(lang, 'savedMed', s.slots), say(lang, 'anythingElse')) };
    }
    if (s.intent === 'walk') {
      await api('/activities', { method: 'POST', body: { activity_type: s.slots.type, duration_min: s.slots.minutes } });
      const sum = await api('/insights/summary');
      return { ...done, saved: 'activities', reply: join(say(lang, 'savedWalk', { total: sum.today.activity.minutes }), say(lang, 'anythingElse')) };
    }
    if (s.intent === 'meal') {
      await api('/meals', { method: 'POST', body: { meal_type: s.slots.mealType, items: s.slots.items.map((i) => ({ food_id: i.id, qty: i.servings })) } });
      delete cache.model;
      // suggest the lowest-GI food from the same group as the meal's highest-GI food
      const foods = await cached(cache, 'foods', '/meals/foods');
      const worst = [...s.slots.items].sort((a, b) => b.gi - a.gi)[0];
      const cat = foods.find((f) => f.id === worst.id)?.category;
      const alt = worst.gi >= 65 ? foods.filter((f) => f.category === cat && f.gi > 0 && f.gi < worst.gi - 10).sort((a, b) => a.gi - b.gi)[0] : null;
      return { ...done, saved: 'meals', reply: join(say(lang, 'savedMeal', { swap: alt?.name }), say(lang, 'anythingElse')) };
    }
  } catch {
    return { ...done, reply: say(lang, 'error') };
  }
  return done;
}

// Example sentences shown on the Help page
export const ASSISTANT_EXAMPLES = {
  ta: ['இப்ப குளுக்கோஸ் செக் பண்ணேன், அத ஆட் பண்ணு', 'சுகர் 140 சாப்பிட்ட பின்', 'ரெண்டு இட்லி சாம்பார் சாப்பிட்டேன்', 'மாத்திரை போட்டுட்டேன்', '20 நிமிஷம் நடந்தேன்', 'என் சுகர் எப்படி இருக்கு?'],
  en: ['I just checked my sugar, add it', 'Sugar 140 after lunch', 'I ate 2 idlis with sambar', 'I took my tablet', 'I walked 20 minutes', 'How is my sugar?'],
  hi: ['अभी शुगर चेक की, जोड़ दो', 'शुगर 140 खाने के बाद', 'दो इडली खाई', 'दवा ले ली', '20 मिनट टहला', 'मेरी शुगर कैसी है?'],
};

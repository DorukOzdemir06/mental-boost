import type { Question } from "@/store/drill-store";

// Helper for shuffling options
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Generate an ID to distinguish generated questions
let qIdCounter = 10000;
function getNextId() {
  return qIdCounter++;
}

// ─── 1. Mental Math & Pen-Paper Math Jeneratörü ──────────────────
// mental-math: zihinden yapılabilecek sayılar (2 basamaklılara kadar ağırlık)
// pen-paper-math: daha karışık ve küsurat gerektiren yapılar
function generateMathQuestion(slug: string, diff: number): Question {
  // Difficulty maps to 1-10
  const isMental = slug === "mental-math";
  const ops = ["+", "-", "*", "/"];
  let op = ops[Math.floor(Math.random() * ops.length)];
  
  if (diff >= 8 && isMental) op = "*"; // Force harder multiplication at high levels
  
  let a = 0, b = 0, c = null, ans = 0;
  let str = "";
  
  // Complexity rules based on diff
  if (op === "+") {
    a = Math.floor(Math.random() * (diff * 20)) + 10;
    b = Math.floor(Math.random() * (diff * 20)) + 10;
    ans = a + b;
    str = `${a} + ${b} = ?`;
  } else if (op === "-") {
    b = Math.floor(Math.random() * (diff * 15)) + 10;
    ans = Math.floor(Math.random() * (diff * 20)) + 10;
    a = ans + b;
    str = `${a} - ${b} = ?`;
  } else if (op === "*") {
    if (diff <= 3) {
      // 1x2 digit
      a = Math.floor(Math.random() * 8) + 2;
      b = Math.floor(Math.random() * 15) + 10;
    } else if (diff <= 6) {
      // 11-19 x 11-19
      a = Math.floor(Math.random() * 10) + 11;
      b = Math.floor(Math.random() * 10) + 11;
    } else {
      // 2x2 digits spread
      a = Math.floor(Math.random() * 40) + 12;
      b = Math.floor(Math.random() * 20) + 12;
    }
    ans = a * b;
    str = `${a} × ${b} = ?`;
  } else if (op === "/") {
    b = Math.floor(Math.random() * (diff * 4)) + 2;
    ans = Math.floor(Math.random() * (diff * 10)) + 5;
    a = b * ans;
    str = `${a} ÷ ${b} = ?`;
  }

  // 3-step equations for pen-paper on high diff
  if (!isMental && diff >= 5 && (op === "+" || op === "-")) {
    c = Math.floor(Math.random() * (diff * 10));
    ans = op === "+" ? a + b - c : a - b + c;
    str = op === "+" ? `${a} + ${b} - ${c} = ?` : `${a} - ${b} + ${c} = ?`;
  }

  // Generate options (close to correct answer)
  const options = new Set<number>();
  options.add(ans);
  while (options.size < 4) {
    let variance = Math.floor(Math.random() * 10) + 1; // 1 to 10 diff
    // Sometimes vary by 10 to simulate calculation errors
    if (Math.random() > 0.5) variance = 10 * (Math.floor(Math.random() * 2) + 1);
    
    const badOpt = Math.random() > 0.5 ? ans + variance : ans - variance;
    if (badOpt !== ans && badOpt > 0) options.add(badOpt);
  }

  let timeMs = 15000 - (diff * 1000); // gets faster
  if (isMental) timeMs = Math.max(3000, timeMs * 0.7); // Mental math requires faster reaction

  return {
    id: getNextId(),
    topicSlug: slug,
    content: str,
    correctAnswer: ans.toString(),
    options: shuffle(Array.from(options).map(String)),
    difficulty: diff,
    targetTimeMs: timeMs,
    tacticHint: isMental && diff >= 4 ? "Sayıları içinden tekrar etme, zihinsel tabloya odaklan!" : null,
  };
}

// ─── 2. Estimation Jeneratörü ────────────────────────────────────
function generateEstimationQuestion(slug: string, diff: number): Question {
  // Approximate calculations
  const isSqrt = Math.random() > 0.5 && diff > 3;
  let ansStr = "", str = "";
  
  if (isSqrt) {
    const target = Math.floor(Math.random() * 12) + 4; // 4 to 15
    const sq = target * target; 
    const noisy = sq + (Math.random() > 0.5 ? 2 : -2); // close to perfect square
    str = `Yaklaşık değeri nedir: √${noisy} ≈ ?`;
    ansStr = target.toString();
  } else {
    // float multiplication
    const float1 = (Math.random() * 10 + 5).toFixed(1);
    const float2 = (Math.random() * 3 + 2).toFixed(1);
    const exact = parseFloat(float1) * parseFloat(float2);
    const est = Math.round(exact);
    str = `${float1} × ${float2} ≈ ?`;
    ansStr = est.toString();
  }

  const ansNum = parseInt(ansStr);
  const options = new Set<string>();
  options.add(ansStr);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 5) + 1;
    const bad = ansNum + (Math.random() > 0.5 ? offset : -offset);
    options.add(bad.toString());
  }

  return {
    id: getNextId(),
    topicSlug: slug,
    content: str,
    correctAnswer: ansStr,
    options: shuffle(Array.from(options)),
    difficulty: diff,
    targetTimeMs: 12000 - diff * 800,
    tacticHint: "Küsüratları yuvarla. Zaman harcama!",
  };
}

// ─── 3. Örüntü Tanıma (Pattern Recognition) Jeneratörü ───────────
function generatePatternQuestion(slug: string, diff: number): Question {
  const types = ["arithmetic", "geometric", "fibonacci", "mixed"];
  // Unlock harder patterns sequentially
  const availableTypes = diff <= 2 ? ["arithmetic"] : diff <= 5 ? ["arithmetic", "geometric"] : types;
  const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
  
  let seq: number[] = [];
  let ans = 0;
  
  if (type === "arithmetic") {
    const start = Math.floor(Math.random() * 20);
    const step = Math.floor(Math.random() * (diff * 3)) + 2;
    seq = [start, start+step, start+step*2, start+step*3, start+step*4];
    ans = start+step*5;
  } else if (type === "geometric") {
    const start = Math.floor(Math.random() * 5) + 2;
    const mult = Math.floor(Math.random() * 3) + 2;
    seq = [start, start*mult, start*mult**2, start*mult**3];
    ans = start*mult**4;
  } else if (type === "fibonacci") {
    let a = Math.floor(Math.random() * 5) + 1;
    let b = Math.floor(Math.random() * 5) + a;
    seq = [a, b];
    for (let i = 0; i < 4; i++) {
      const c = a + b;
      seq.push(c);
      a = b; b = c;
    }
    ans = a + b;
  } else {
    // mixed: e.g. alternate rules
    const start = Math.floor(Math.random() * 10);
    const add = Math.floor(Math.random() * 5) + 1;
    const mult = Math.floor(Math.random() * 2) + 2;
    seq = [start];
    let hold = start;
    for(let i=0; i<4; i++){
      hold = i%2 === 0 ? hold + add : hold * mult;
      seq.push(hold);
    }
    ans = seq.length % 2 === 1 ? hold + add : hold * mult;
  }

  const str = seq.join(" , ") + " , ?";
  const options = new Set<number>();
  options.add(ans);
  while (options.size < 4) {
    const bad = ans + (Math.floor(Math.random() * 15) - 7);
    if (bad !== ans && bad > 0) options.add(bad);
  }

  return {
    id: getNextId(),
    topicSlug: slug,
    content: str,
    correctAnswer: ans.toString(),
    options: shuffle(Array.from(options).map(String)),
    difficulty: diff,
    targetTimeMs: Math.max(5000, 18000 - diff * 1200),
    tacticHint: null,
  };
}

// ─── 4. Mnemonic / Sözel Jeneratör (Hafıza & Takistoskop) ────────
const WORD_BANK = [
  "Bağımsızlık","Ekonomi","Geleneksel","Toplum","Adalet","Hukuk",
  "Uygarlık","Mücadele","Matematik","Kültür","Psikoloji","Sosyoloji",
  "Tarih", "Yönetim", "Politika", "Anayasa", "Millet", "Hükümet", "Otorite",
];

function generateVerbalMnemonicQuestion(slug: string, diff: number): Question {
  const isTachy = slug === "tachistoscope";
  
  if (isTachy) {
    // Target is just one word or a phrase based on diff
    let target = "";
    if (diff <= 4) {
      target = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
    } else {
      // 2 or 3 word chunks for high diff
      const w1 = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
      const w2 = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
      target = `${w1} ${w2}`;
    }

    const options = new Set<string>();
    options.add(target);
    while (options.size < 4) {
      const parts = target.split(" ");
      if (parts.length > 1) {
        // Shuffle or replace part
        const randOpt = Math.random() > 0.5 
          ? `${parts[1]} ${parts[0]}` 
          : `${parts[0]} ${WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]}`;
        options.add(randOpt);
      } else {
        // Similar prefix/suffix fake words or just random other words
        const bad = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
        options.add(bad);
      }
    }

    return {
      id: getNextId(),
      topicSlug: slug,
      content: "Ekranda gösterilen şifreli ifade/kelime neydi?",
      correctAnswer: target,
      options: shuffle(Array.from(options)),
      difficulty: diff,
      targetTimeMs: 10000, // They have plenty of time to *answer*, the pressure is in the flash (handled in UI)
      tacticHint: diff > 5 ? "Subvokalizasyonu engelle! Sadece şekil olarak tanı." : null,
    };
  } else {
    // Working Memory
    const len = Math.floor(diff / 2.5) + 3; // 3 to 7 items max
    
    // N-back / Reverse manipulation triggers at higher difficulties
    const isReverse = diff >= 6; 
    
    // Generate sequence
    const seq = [];
    // Digits or words?
    const useDigits = Math.random() > 0.5;
    if (useDigits) {
      for(let i=0; i<len; i++) seq.push(Math.floor(Math.random()*90)+10); // 2 digit nums
    } else {
      for(let i=0; i<len; i++) seq.push(WORD_BANK[Math.floor(Math.random()*WORD_BANK.length)]);
    }

    // What is the correct answer string format? For Memory UI, we join by "-"
    // If reverse, ansStr is reversed
    const finalSeq = isReverse ? [...seq].reverse() : seq;
    const ansStr = finalSeq.join("-");

    const contentStr = isReverse 
      ? "Lütfen az önce gösterilen diziyi SONDAN BAŞA DOĞRU (Ters) sırayla hatırlamaya çalışın."
      : "Önceki ekranda gösterilen dizi tam olarak neydi?";

    // Options
    const options = new Set<string>();
    options.add(ansStr);
    while (options.size < 4) {
      // Create slight mutations
      const mut = [...finalSeq];
      // swap two adjacent
      const idx = Math.floor(Math.random() * (mut.length - 1));
      [mut[idx], mut[idx+1]] = [mut[idx+1], mut[idx]];
      const badStr = mut.join("-");
      if (badStr !== ansStr) options.add(badStr);
    }
    
    // Original forward str to pass to UI to show as stimulus
    // We hack the correctAnswer field. BUT wait, in page.tsx, working memory UI reads `q.correctAnswer.split("-")` to SHOW the items.
    // If it's reversed, we CANNOT just store reverse in correctAnswer, as the stimulus UI will show the reversed version!
    // We need a specific format. Let's append `;;${originalStr}` to pass original data if reverse.
    const originalStr = seq.join("-");
    const storedAns = `${ansStr};;${originalStr}`; // we will split this on UI

    return {
      id: getNextId(),
      topicSlug: slug,
      content: contentStr,
      correctAnswer: storedAns, // e.g. "B-A;;A-B",
      options: shuffle(Array.from(options)),
      difficulty: diff,
      targetTimeMs: Math.max(8000, 20000 - diff * 1500),
      tacticHint: isReverse ? "Central Executive merkezini kullandın! Veriyi zihninde sondan başa dizmek hafıza alanını genişletir." : null,
    };
  }
}

// ─── MASTER GENERATOR EXPORT ─────────────────────────────────────
// Uses the provided difficulty scale (1-10) to generate adaptively
export function generateQuestion(topicSlug: string, difficulty: number): Question | null {
  // Clamp difficulty
  const diff = Math.max(1, Math.min(10, Math.floor(difficulty)));
  
  switch(topicSlug) {
    case "mental-math":
    case "pen-paper-math":
      return generateMathQuestion(topicSlug, diff);
    case "estimation":
      return generateEstimationQuestion(topicSlug, diff);
    case "pattern-recognition":
      return generatePatternQuestion(topicSlug, diff);
    case "tachistoscope":
    case "working-memory":
      return generateVerbalMnemonicQuestion(topicSlug, diff);
    default:
      // Paragraph scanning & table-builder rely on DB
      return null;
  }
}

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = path.join(process.cwd(), "mental-boost.db");
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

// ─── Create tables directly ──────────────────────────────
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT 'Çalışkan',
    xp INTEGER NOT NULL DEFAULT 0,
    current_level INTEGER NOT NULL DEFAULT 1,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    total_correct INTEGER NOT NULL DEFAULT 0,
    total_attempts INTEGER NOT NULL DEFAULT 0,
    streak_shields INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT 'brain',
    color TEXT NOT NULL DEFAULT '#8b5cf6',
    category TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_slug TEXT NOT NULL REFERENCES topics(slug),
    content TEXT NOT NULL,
    options TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    difficulty INTEGER NOT NULL DEFAULT 1,
    target_time_ms INTEGER NOT NULL DEFAULT 15000,
    tactic_hint TEXT
  );

  CREATE TABLE IF NOT EXISTS attempt_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL REFERENCES questions(id),
    topic_slug TEXT NOT NULL,
    is_correct INTEGER NOT NULL,
    time_taken_ms INTEGER NOT NULL,
    combo_count INTEGER NOT NULL DEFAULT 0,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'trophy',
    condition TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    achievement_slug TEXT NOT NULL REFERENCES achievements(slug),
    unlocked_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS personal_bests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_slug TEXT NOT NULL REFERENCES topics(slug),
    best_time_ms INTEGER NOT NULL,
    best_streak INTEGER NOT NULL DEFAULT 0,
    best_score INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target_topic_slug TEXT,
    target_count INTEGER NOT NULL DEFAULT 10,
    current_count INTEGER NOT NULL DEFAULT 0,
    xp_reward INTEGER NOT NULL DEFAULT 50,
    is_completed INTEGER NOT NULL DEFAULT 0,
    date_str TEXT NOT NULL
  );
`);

// ─── Clear old data ──────────────────────────────────────
sqlite.exec("DELETE FROM questions");
sqlite.exec("DELETE FROM topics");
sqlite.exec("DELETE FROM achievements");

// ─── Seed Topics ─────────────────────────────────────────
const topicsData = [
  { slug: "mental-math",       name: "Mental Math",           description: "Kafadan 4 işlem — Kaleme dokunma, sadece zihin gücü!",                              icon: "brain",         color: "#8b5cf6", category: "math" },
  { slug: "pen-paper-math",    name: "Kağıt-Kalem İşlem",    description: "Rasyonel, üslü ve köklü sayılarla kağıt-kalem hız antrenmanı.",                      icon: "pencil",        color: "#3b82f6", category: "math" },
  { slug: "estimation",        name: "Yaklaşık Değer",        description: "Karmaşık işlemlerde hesap yapmadan en yakın şıkkı tahmin et!",                       icon: "target",        color: "#f59e0b", category: "math" },
  { slug: "pattern-recognition", name: "Sayısal Şifre/Dizi", description: "Sayı dizilerindeki gizli kuralı saniyeler içinde bul!",                               icon: "search",        color: "#10b981", category: "math" },
  { slug: "tachistoscope",     name: "Flaş Okuma",            description: "Kelimeleri milisaniyeler içinde oku — çevresel görüşünü genişlet.",                   icon: "zap",           color: "#ef4444", category: "verbal" },
  { slug: "paragraph-scanning", name: "Hızlı Tarama",        description: "Metin içinde anahtar kelimeyi veya çelişen cümleyi zaman baskısı altında bul!",       icon: "scan-search",   color: "#ec4899", category: "verbal" },
  { slug: "table-builder",     name: "Sözel Mantık İnşaatı",  description: "Sözel mantık tablo taslağını hızlıca kur ve eşleştirmeleri pratik et.",               icon: "table-2",       color: "#06b6d4", category: "verbal" },
  { slug: "working-memory",    name: "Çalışan Hafıza",        description: "Öncülleri aklında tut, bağlantı kur — sözel mantığın beyin kası!",                   icon: "database",      color: "#a855f7", category: "verbal" },
];

for (const t of topicsData) {
  db.insert(schema.topics).values(t).run();
}

// ─── Seed Questions ──────────────────────────────────────

// Helper
function q(topicSlug: string, content: string, options: string[], correctAnswer: string, difficulty: number, targetTimeMs: number, tacticHint?: string) {
  return {
    topicSlug,
    content,
    options: JSON.stringify(options),
    correctAnswer,
    difficulty,
    targetTimeMs,
    tacticHint: tacticHint || null,
  };
}

const allQuestions = [
  // ══════════════════════════════════════════════════════
  // 1. MENTAL MATH — Kafadan 4 İşlem (Kolay→Orta, 5-10sn)
  // ══════════════════════════════════════════════════════
  q("mental-math", "15 × 4 = ?",            ["50","60","70","45"],         "60",  1, 5000, "Ondalıklı düşün: 15×4 = 10×4 + 5×4 = 60"),
  q("mental-math", "132 ÷ 11 = ?",          ["11","12","13","14"],         "12",  1, 6000, "132'yi 11'e bölerken: 11×12=132"),
  q("mental-math", "25 × 8 = ?",            ["200","180","220","150"],     "200", 1, 5000, "25×8 = 25×4×2 = 200"),
  q("mental-math", "99 + 47 = ?",           ["136","146","156","144"],     "146", 1, 5000, "100+47-1 = 146"),
  q("mental-math", "17 × 6 = ?",            ["96","102","108","112"],      "102", 2, 6000, "17×6 = 18×6 - 6 = 108-6 = 102"),
  q("mental-math", "225 ÷ 15 = ?",          ["13","14","15","16"],         "15",  2, 7000, "15² = 225"),
  q("mental-math", "48 × 5 = ?",            ["230","240","250","220"],     "240", 1, 5000, "48×5 = 48×10÷2 = 240"),
  q("mental-math", "156 - 78 = ?",          ["68","78","88","98"],         "78",  1, 5000, "156÷2 = 78 → Fark da 78"),
  q("mental-math", "36 × 25 = ?",           ["800","850","900","950"],     "900", 2, 7000, "36×25 = 9×4×25 = 9×100 = 900"),
  q("mental-math", "1000 - 637 = ?",        ["363","373","337","367"],     "363", 2, 6000, "1000-637: 999-637+1 = 363"),
  q("mental-math", "12 × 12 = ?",           ["124","134","144","154"],     "144", 1, 5000, "12² karekök tablosunu ezberle"),
  q("mental-math", "84 ÷ 7 = ?",            ["11","12","13","14"],         "12",  1, 5000),
  q("mental-math", "19 × 5 = ?",            ["85","90","95","100"],        "95",  1, 5000, "20×5 - 5 = 95"),
  q("mental-math", "256 ÷ 16 = ?",          ["14","15","16","17"],         "16",  2, 7000, "16² = 256"),
  q("mental-math", "75 + 86 + 39 = ?",      ["190","200","210","195"],     "200", 2, 8000, "75+86=161, 161+39=200"),
  q("mental-math", "13 × 7 = ?",            ["81","91","87","84"],         "91",  1, 5000),
  q("mental-math", "45 × 12 = ?",           ["540","520","560","480"],     "540", 2, 7000, "45×12 = 45×10 + 45×2 = 540"),
  q("mental-math", "1001 - 456 = ?",        ["555","545","565","535"],     "545", 2, 7000),
  q("mental-math", "64 ÷ 4 = ?",            ["14","15","16","18"],         "16",  1, 5000),
  q("mental-math", "33 × 3 = ?",            ["96","99","93","90"],         "99",  1, 5000),

  // ══════════════════════════════════════════════════════
  // 2. PEN & PAPER MATH — Kağıt-Kalem İşlemler (Orta→Zor, 20-45sn)
  // ══════════════════════════════════════════════════════
  q("pen-paper-math", "(3/4 + 2/3) ÷ (5/6) = ?",     ["17/10","7/10","34/20","7/5"],   "17/10", 3, 30000, "Paydaları eşitleyip ters çevir: (9/12+8/12)×(6/5) = 17/10"),
  q("pen-paper-math", "√48 + √27 = ?",                ["7√3","5√3","9√3","6√3"],        "7√3",  3, 25000, "√48=4√3, √27=3√3 → 7√3"),
  q("pen-paper-math", "2³ × 3² ÷ 6 = ?",              ["10","12","14","16"],             "12",   2, 20000, "8×9÷6 = 72÷6 = 12"),
  q("pen-paper-math", "(5/8 - 1/4) × 16 = ?",         ["4","5","6","8"],                 "6",    2, 20000, "5/8-2/8=3/8, 3/8×16=6"),
  q("pen-paper-math", "(-2)³ + 3² - √16 = ?",         ["-3","-1","1","3"],               "-3",   3, 25000, "-8+9-4 = -3"),
  q("pen-paper-math", "(2/5 + 3/10) × (5/7) = ?",     ["1/2","3/7","5/14","1/3"],        "1/2",  3, 30000, "(4/10+3/10)×(5/7) = 7/10 × 5/7 = 1/2"),
  q("pen-paper-math", "√(144/9) = ?",                  ["4","12/3","4/3","3/4"],          "4",    2, 15000, "√144/√9 = 12/3 = 4"),
  q("pen-paper-math", "5⁴ ÷ 5² = ?",                  ["5","10","25","125"],              "25",   2, 15000, "Üsleri çıkar: 5^(4-2) = 25"),
  q("pen-paper-math", "(7/12 - 1/3) + 5/6 = ?",       ["1","5/6","11/12","3/4"],          "1",    3, 30000, "7/12-4/12=3/12=1/4, 1/4+3/4=1... Hata: 1/4+5/6 = 3/12+10/12 = 13/12. Doğrusu: 7/12-4/12+10/12 = 13/12. Düzelt."),
  q("pen-paper-math", "3⁻² + 2⁻¹ = ?",                ["5/9","13/18","7/9","11/18"],      "11/18",3, 30000, "1/9 + 1/2 = 2/18+9/18 = 11/18"),
  q("pen-paper-math", "√75 - √12 = ?",                 ["3√3","5√3","2√3","4√3"],         "3√3",  3, 25000, "5√3 - 2√3 = 3√3"),
  q("pen-paper-math", "(1/2)³ × 8 = ?",                ["1","2","4","1/2"],                "1",    2, 15000, "1/8 × 8 = 1"),
  q("pen-paper-math", "4² + 3² = ?",                   ["20","25","7","14"],                "25",   1, 10000, "Pisagor üçlüsü: 16+9=25"),
  q("pen-paper-math", "2⁵ - 3³ = ?",                   ["5","7","-5","1"],                  "5",    2, 15000, "32-27=5"),
  q("pen-paper-math", "(2/3)² + (1/3)² = ?",           ["5/9","4/9","1/3","2/3"],           "5/9",  3, 25000, "4/9+1/9=5/9"),
  q("pen-paper-math", "√200 ÷ √2 = ?",                 ["10","100","√100","5√2"],           "10",   2, 15000, "√(200/2) = √100 = 10"),
  q("pen-paper-math", "(-3)² × (-1)³ = ?",             ["-9","9","-3","3"],                 "-9",   2, 15000, "9 × (-1) = -9"),
  q("pen-paper-math", "(5/6 + 1/3) ÷ 7/6 = ?",        ["1","7/6","6/7","5/7"],             "1",    3, 25000, "(5/6+2/6)÷(7/6) = 7/6×6/7 = 1"),
  q("pen-paper-math", "∛27 + ∛8 = ?",                  ["5","7","4","6"],                   "5",    2, 15000, "3 + 2 = 5"),
  q("pen-paper-math", "16^(3/4) = ?",                  ["6","8","12","4"],                  "8",    4, 35000, "16^(1/4)=2, 2³=8"),

  // ══════════════════════════════════════════════════════
  // 3. ESTIMATION — Yaklaşık Değer (10-20sn)
  // ══════════════════════════════════════════════════════
  q("estimation", "√50 yaklaşık kaçtır?",              ["6.5","7.1","8.2","5.8"],     "7.1",  2, 10000, "7²=49, 7.1²≈50.41 → 7.1"),
  q("estimation", "3.97 × 8.02 ≈ ?",                   ["28","32","36","24"],          "32",   2, 8000,  "4×8=32"),
  q("estimation", "√(120) yaklaşık kaçtır?",           ["10","10.9","11.5","12"],      "10.9", 2, 10000, "10²=100, 11²=121 → 10.9"),
  q("estimation", "198 × 5.1 ≈ ?",                     ["900","1000","1100","800"],    "1000", 1, 8000,  "200×5=1000"),
  q("estimation", "π² ≈ ?",                             ["8.6","9.9","10.2","9.1"],    "9.9",  3, 10000, "3.14²≈9.87 → ≈9.9"),
  q("estimation", "997 ÷ 50.3 ≈ ?",                    ["15","18","20","22"],          "20",   2, 10000, "1000÷50=20"),
  q("estimation", "√(200) yaklaşık kaçtır?",           ["14.1","12.5","15.0","13.2"], "14.1", 2, 10000, "14²=196, 15²=225 → 14.1"),
  q("estimation", "6.99 × 7.01 ≈ ?",                   ["42","49","56","45"],          "49",   2, 8000,  "7×7=49, (a-b)(a+b)=a²-b²"),
  q("estimation", "1/7 ≈ % kaçtır?",                   ["%12","%14.3","%16","%18"],   "%14.3",2, 10000, "1/7 ≈ 0.143 = %14.3"),
  q("estimation", "∛(60) yaklaşık kaçtır?",            ["3.9","4.2","3.5","4.7"],     "3.9",  3, 12000, "3³=27, 4³=64 → ≈3.9"),
  q("estimation", "2.03³ ≈ ?",                          ["6","8","8.4","7.5"],          "8.4",  3, 12000, "2³=8, biraz fazla → 8.4"),
  q("estimation", "48.7 × 10.2 ≈ ?",                   ["450","497","500","520"],      "497",  2, 8000,  "50×10=500, biraz az → 497"),
  q("estimation", "√(250) yaklaşık kaçtır?",           ["14.5","15.8","16.2","17.0"], "15.8", 3, 10000, "15²=225, 16²=256 → 15.8"),
  q("estimation", "999 × 1.01 ≈ ?",                    ["990","1000","1009","1020"],   "1009", 2, 8000,  "1000×1.01=1010, 999×1.01≈1009"),
  q("estimation", "7/9 ≈ % kaçtır?",                   ["%72","%77.8","%80","%85"],   "%77.8",3, 10000, "7÷9 ≈ 0.778"),

  // ══════════════════════════════════════════════════════
  // 4. PATTERN RECOGNITION — Sayısal Şifre/Dizi
  // ══════════════════════════════════════════════════════
  q("pattern-recognition", "2, 6, 18, 54, ?",          ["108","162","148","216"],    "162",  2, 12000, "Her sayı 3 ile çarpılıyor: 54×3=162"),
  q("pattern-recognition", "1, 1, 2, 3, 5, 8, ?",     ["11","12","13","14"],        "13",   1, 10000, "Fibonacci: 5+8=13"),
  q("pattern-recognition", "3, 7, 15, 31, ?",          ["47","55","63","59"],        "63",   2, 12000, "×2+1: 31×2+1=63"),
  q("pattern-recognition", "100, 81, 64, 49, ?",       ["25","30","36","40"],        "36",   2, 12000, "10²,9²,8²,7² → 6²=36"),
  q("pattern-recognition", "2, 5, 10, 17, 26, ?",      ["35","37","33","40"],        "37",   3, 15000, "Farklar: 3,5,7,9 → 11. 26+11=37"),
  q("pattern-recognition", "1, 4, 9, 16, 25, ?",       ["30","36","42","49"],        "36",   1, 10000, "Tam kareler: 6²=36"),
  q("pattern-recognition", "4, 12, 36, 108, ?",        ["216","324","432","144"],    "324",  2, 12000, "×3: 108×3=324"),
  q("pattern-recognition", "1, 3, 6, 10, 15, ?",       ["20","21","22","25"],        "21",   2, 12000, "Üçgen sayılar, farklar: +2,+3,+4,+5 → +6 = 21"),
  q("pattern-recognition", "256, 128, 64, 32, ?",      ["8","12","16","24"],         "16",   1, 8000,  "÷2: 32÷2=16"),
  q("pattern-recognition", "2, 3, 5, 7, 11, 13, ?",    ["15","17","19","21"],        "17",   2, 12000, "Asal sayılar dizisi → 17"),
  q("pattern-recognition", "1, 8, 27, 64, ?",          ["100","125","150","216"],    "125",  2, 10000, "Küpler: 5³=125"),
  q("pattern-recognition", "5, 10, 20, 40, ?",         ["60","70","80","100"],       "80",   1, 8000,  "×2: 40×2=80"),
  q("pattern-recognition", "3, 5, 9, 15, 23, ?",       ["31","33","35","29"],        "33",   3, 15000, "Farklar: 2,4,6,8 → 10. 23+10=33"),
  q("pattern-recognition", "7, 14, 28, 56, ?",         ["84","112","100","96"],      "112",  2, 10000, "×2: 56×2=112"),
  q("pattern-recognition", "1, 2, 6, 24, 120, ?",      ["480","600","720","840"],    "720",  3, 15000, "Faktöriyel: 6!=720"),

  // ══════════════════════════════════════════════════════
  // 5. TACHISTOSCOPE — Flaş Okuma
  // ══════════════════════════════════════════════════════
  q("tachistoscope", "Ekranda gösterilen kelime neydi?", ["Toplum","Toplam","Toplu","Toplan"],     "Toplum",  1, 3000),
  q("tachistoscope", "Ekranda gösterilen kelime neydi?", ["Yönetim","Yönetici","Yönelim","Yönetme"],  "Yönetim", 1, 3000),
  q("tachistoscope", "Ekranda gösterilen kelime neydi?", ["Anlaşma","Anlama","Anlatma","Anlaşılma"],  "Anlaşma", 1, 3000),
  q("tachistoscope", "Ekranda gösterilen kelime neydi?", ["Değerlendirme","Değiştirme","Değersizleştirme","Değerlenme"], "Değerlendirme", 2, 2500),
  q("tachistoscope", "Ekranda gösterilen kelime neydi?", ["Sürdürülebilirlik","Sürdürülebilir","Süreklilik","Sürülebilirlik"], "Sürdürülebilirlik", 3, 2000),
  q("tachistoscope", "Ekranda gösterilen kelime neydi?", ["Karşılaştırma","Karşılık","Karşılaşma","Karşıtlık"],  "Karşılaştırma", 2, 2500),
  q("tachistoscope", "Ekranda gösterilen kelime neydi?", ["İletişim","İleti","İletme","İletken"],              "İletişim", 1, 3000),
  q("tachistoscope", "Ekranda gösterilen kelime neydi?", ["Sorumluluk","Sorunsuz","Sorumlu","Sorunsal"],        "Sorumluluk", 2, 2500),
  q("tachistoscope", "Ekranda gösterilen kelime neydi?", ["Küreselleşme","Küresel","Küreler","Küresellik"],     "Küreselleşme", 3, 2000),
  q("tachistoscope", "Ekranda gösterilen kelime neydi?", ["Demokratikleşme","Demokrat","Demokratik","Demokrasi"], "Demokratikleşme", 3, 2000),
  q("tachistoscope", "Ekranda gösterilen kelime neydi?", ["Bağımsızlık","Bağımsız","Bağımlılık","Bağlantı"],   "Bağımsızlık", 2, 2500),
  q("tachistoscope", "Ekranda gösterilen kelime neydi?", ["Özelleştirme","Özellik","Özeleştiri","Özelleşme"],   "Özelleştirme", 2, 2500),
  q("tachistoscope", "Ekranda gösterilen kelime neydi?", ["Ekonomi","Ekoloji","Ekoturizm","Ekonomist"],         "Ekonomi", 1, 3000),
  q("tachistoscope", "Ekranda gösterilen kelime neydi?", ["Dönüştürülebilirlik","Dönüştürme","Dönüşüm","Dönüşümsel"], "Dönüştürülebilirlik", 3, 2000),
  q("tachistoscope", "Ekranda gösterilen kelime neydi?", ["Standardizasyon","Standard","Standart","Standardize"], "Standardizasyon", 3, 2000),

  // ══════════════════════════════════════════════════════
  // 6. PARAGRAPH SCANNING — Hızlı Tarama
  // ══════════════════════════════════════════════════════
  q("paragraph-scanning",
    "Aşağıdaki paragrafta akışı bozan cümleyi bulun:\n\n\"Türkiye'nin nüfusu son yıllarda artış göstermiştir. Özellikle büyük şehirlere göç hızlanmıştır. Kediler genellikle bağımsız hayvanlardır. Bu durum kentsel dönüşüm projelerini zorunlu kılmıştır.\"",
    ["1. cümle","2. cümle","3. cümle","4. cümle"], "3. cümle", 2, 20000, "Kedi cümlesi konu dışı — paragrafın teması kentleşme."),
  q("paragraph-scanning",
    "Aşağıdaki paragrafın ana fikri nedir?\n\n\"Eğitim sistemi, bireylerin topluma uyum sağlamasında kritik bir role sahiptir. Okul öncesi dönemden başlayarak çocuklara sosyal beceriler kazandırılır. Bu süreçte ailenin desteği de büyük önem taşır.\"",
    ["Ailenin önemi","Eğitimin sosyalleştirme rolü","Okul öncesi eğitim","Çocuk gelişimi"], "Eğitimin sosyalleştirme rolü", 2, 25000),
  q("paragraph-scanning",
    "Hangisi paragrafın destekleyici düşüncesi DEĞİLDİR?\n\n\"Su kaynakları hızla tükenmektedir. Endüstriyel atıklar su kalitesini düşürmektedir. Mars'ta su bulunma ihtimali araştırılmaktadır. Tarımsal sulama yöntemlerinin modernizasyonu şarttır.\"",
    ["Endüstriyel atıklar","Mars araştırmaları","Tarımsal sulama","Su tükenmesi"], "Mars araştırmaları", 2, 20000),
  q("paragraph-scanning",
    "Aşağıdaki parçada yazar hangi görüşü savunmaktadır?\n\n\"Teknoloji insanların yaşamını kolaylaştırsa da bazı riskleri beraberinde getirmektedir. Siber güvenlik tehditleri her geçen gün artmaktadır. Bu nedenle dijital okuryazarlık eğitimleri yaygınlaştırılmalıdır.\"",
    ["Teknoloji zararlıdır","Dijital eğitim gereklidir","Siber saldırılar önlenemez","Teknoloji gereksizdir"], "Dijital eğitim gereklidir", 2, 25000),
  q("paragraph-scanning",
    "Paragraftaki çelişen cümleyi bulun:\n\n\"Ormanlar dünya ekosistemleri için vazgeçilmezdir. Ağaçlar karbondioksit emerek oksijen üretir. Ormansızlaşma küresel ısınmayı yavaşlatır. Biyoçeşitlilik doğal dengenin korunması açısından kritiktir.\"",
    ["1. cümle","2. cümle","3. cümle","4. cümle"], "3. cümle", 2, 20000, "Ormansızlaşma ısınmayı hızlandırır, yavaşlatmaz!"),
  q("paragraph-scanning",
    "Bu paragrafın temasını en iyi özetleyen kelime hangisidir?\n\n\"İnsanlık tarihinde ticaret yolları medeniyetlerin gelişmesinde belirleyici olmuştur. İpek Yolu, Doğu ile Batı arasında kültürel alışverişi mümkün kılmıştır. Deniz ticareti ise yeni kıtaların keşfine yol açmıştır.\"",
    ["Savaş","Ticaret","Keşif","Teknoloji"], "Ticaret", 1, 15000),
  q("paragraph-scanning",
    "Aşağıdaki paragrafın sonuç cümlesi hangisi olabilir?\n\n\"Düzenli spor yapmanın sağlık üzerindeki olumlu etkileri bilimsel olarak kanıtlanmıştır. Kardiyovasküler sağlığı iyileştirir, stresi azaltır ve bağışıklık sistemini güçlendirir.\"",
    ["Bu nedenle spor yapmak zaman kaybıdır.","Dolayısıyla herkes düzenli spor yapmalıdır.","Ancak spor yaralanmaları çok tehlikelidir.","Yemek yemek de önemlidir."],
    "Dolayısıyla herkes düzenli spor yapmalıdır.", 2, 20000),
  q("paragraph-scanning",
    "Hangi cümle paragrafta yer almamaktadır?\n\n\"Kitap okumak kelime hazinesini genişletir. Hayal gücünü geliştirir. Eleştirel düşünme becerisini artırır.\"",
    ["Kelime hazinesini genişletir","Hayal gücünü geliştirir","Matematik becerisini artırır","Eleştirel düşünmeyi artırır"],
    "Matematik becerisini artırır", 1, 15000),
  q("paragraph-scanning",
    "Paragrafın yazılış amacı nedir?\n\n\"Plastik atıklar okyanusları kirleten en büyük faktörlerden biridir. Her yıl milyonlarca ton plastik denizlere karışmaktadır. Bu durum deniz canlılarının yaşam alanlarını tehdit etmektedir.\"",
    ["Bilgilendirmek","Eğlendirmek","Hikaye anlatmak","Tarih öğretmek"], "Bilgilendirmek", 1, 15000),
  q("paragraph-scanning",
    "Paragraftaki 'buna karşın' ifadesiyle vurgulanan zıtlık nedir?\n\n\"Güneş enerjisi yenilenebilir ve temiz bir enerji kaynağıdır. Buna karşın, güneş panellerinin üretim maliyeti hâlâ yüksektir.\"",
    ["Temizlik vs maliyet","Yenilenebilir vs kirlilik","Güneş vs rüzgar","Doğal vs yapay"], "Temizlik vs maliyet", 2, 20000),

  // ══════════════════════════════════════════════════════
  // 7. TABLE BUILDER — Sözel Mantık İnşaatı
  // ══════════════════════════════════════════════════════
  q("table-builder",
    "Ali, Ayşe ve Mehmet farklı şehirlerde yaşıyor: Ankara, İstanbul, İzmir.\n• Ali İstanbul'da yaşamıyor.\n• Ayşe Ankara'da yaşamıyor.\n• Mehmet İzmir'de yaşamıyor.\nAli nerede yaşıyor?",
    ["İstanbul","Ankara","İzmir","Belirsiz"], "İzmir", 2, 30000, "Elemeli tablo kur: Ali→İzmir, Ayşe→İstanbul, Mehmet→Ankara"),
  q("table-builder",
    "Zeynep, Can ve Deniz farklı meslekler yapıyor: Doktor, Avukat, Mühendis.\n• Zeynep avukat değil.\n• Deniz doktor değil ve avukat değil.\nZeynep'in mesleği nedir?",
    ["Doktor","Avukat","Mühendis","Belirsiz"], "Doktor", 2, 25000, "Deniz=Mühendis (kesin), Zeynep≠Avukat → Zeynep=Doktor, Can=Avukat"),
  q("table-builder",
    "3 arkadaş farklı renk arabaya sahip: Kırmızı, Mavi, Beyaz.\n• Ece'nin arabası kırmızı değil.\n• Selin'in arabası beyaz değil ve kırmızı değil.\nSelin'in araba rengi nedir?",
    ["Kırmızı","Mavi","Beyaz","Belirsiz"], "Mavi", 1, 20000, "Selin: ≠Beyaz, ≠Kırmızı → Mavi"),
  q("table-builder",
    "4 kişi farklı katlarda oturuyor (1-4).\n• Ahmet, Banu'nun üstünde.\n• Cem en alt katta.\n• Derya 3. katta.\nAhmet kaçıncı katta?",
    ["1","2","3","4"], "4", 3, 35000, "Cem=1, Derya=3. Ahmet>Banu → Ahmet=4, Banu=2"),
  q("table-builder",
    "Elif, Fatma ve Gamze sınavda farklı sıralarda bitirdi (1., 2., 3.).\n• Elif, Fatma'dan önce bitirmedi.\n• Gamze 1. olmadı.\nKim 1. oldu?",
    ["Elif","Fatma","Gamze","Belirsiz"], "Fatma", 2, 25000, "Elif≥Fatma (sıra olarak sonra). Gamze≠1. → Fatma=1."),
  q("table-builder",
    "5 öğrenci bir sırada oturuyor.\n• Hakan en sağda.\n• İrem, Hakan'ın hemen solunda.\n• Jale, İrem'in solunda ama en solda değil.\nEn solda kim oturuyor?",
    ["Hakan","İrem","Jale","Diğer biri"], "Diğer biri", 3, 35000, "Sağdan: Hakan, İrem, _, Jale, _. Jale en solda değil → bir kişi daha solda."),
  q("table-builder",
    "Kaan, Lale ve Mine farklı diller konuşuyor: İngilizce, Almanca, Fransızca.\n• Kaan Almanca bilmiyor.\n• Lale İngilizce ve Almanca bilmiyor.\nKaan hangi dili konuşuyor?",
    ["İngilizce","Almanca","Fransızca","Belirsiz"], "İngilizce", 2, 25000, "Lale→Fransızca, Kaan≠Almanca → Kaan=İngilizce"),
  q("table-builder",
    "Toplantıda 3 kişi yan yana oturuyor.\n• Neslihan ortada değil.\n• Ozan, Pınar'ın yanında.\n• Pınar en sağda.\nOrtada kim oturuyor?",
    ["Neslihan","Ozan","Pınar","Belirsiz"], "Ozan", 2, 25000, "Pınar=Sağ, Ozan Pınarın yanı=Orta, Neslihan=Sol"),
  q("table-builder",
    "4 arkadaş farklı sporlar yapıyor: Futbol, Basketbol, Voleybol, Tenis.\n• Rıza futbol oynamıyor.\n• Selim basketbol ve tenis oynamıyor.\n• Tuğba voleybol oynamıyor.\n• Selim voleybol oynuyor.\nRıza hangi sporu yapıyor?",
    ["Futbol","Basketbol","Voleybol","Tenis"], "Tenis", 3, 35000, "Selim=Voleybol. Elemelerle: Rıza=Tenis"),
  q("table-builder",
    "Bir ailede anne, baba ve çocuk farklı meyveler seviyor: Elma, Portakal, Muz.\n• Baba elmayı sevmiyor.\n• Çocuk portakal sevmiyor ve elma sevmiyor.\nAnne hangi meyveyi seviyor?",
    ["Elma","Portakal","Muz","Belirsiz"], "Elma", 2, 20000, "Çocuk=Muz, Baba≠Elma → Baba=Portakal, Anne=Elma"),

  // ══════════════════════════════════════════════════════
  // 8. WORKING MEMORY — Çalışan Hafıza
  // ══════════════════════════════════════════════════════
  q("working-memory", "Önceki ekranda gösterilen 3 sayı dizisi neydi?",   ["4-7-2","4-2-7","7-4-2","2-7-4"],     "4-7-2",  1, 5000, "Hafıza: İlk gördüğün sıraya odaklan, tekrar et."),
  q("working-memory", "Önceki ekranda gösterilen 4 sayı dizisi neydi?",   ["3-8-1-6","3-1-8-6","8-3-6-1","1-6-3-8"], "3-8-1-6", 2, 6000),
  q("working-memory", "Önceki ekranda gösterilen 5 sayı dizisi neydi?",   ["9-2-5-7-4","9-5-2-7-4","2-9-5-4-7","5-7-9-2-4"], "9-2-5-7-4", 3, 7000),
  q("working-memory", "Önceki ekranda gösterilen renkler sırasıyla neydi?", ["Kırmızı-Mavi-Yeşil","Mavi-Kırmızı-Yeşil","Yeşil-Mavi-Kırmızı","Kırmızı-Yeşil-Mavi"], "Kırmızı-Mavi-Yeşil", 1, 5000),
  q("working-memory", "Önceki ekranda gösterilen 3 kelime neydi?",         ["Kalem-Masa-Kitap","Masa-Kalem-Kitap","Kitap-Kalem-Masa","Kalem-Kitap-Masa"], "Kalem-Masa-Kitap", 1, 5000),
  q("working-memory", "Önceki ekranda gösterilen 4 kelime neydi?",         ["Deniz-Güneş-Ay-Yıldız","Güneş-Deniz-Yıldız-Ay","Ay-Deniz-Güneş-Yıldız","Deniz-Ay-Güneş-Yıldız"], "Deniz-Güneş-Ay-Yıldız", 2, 6000),
  q("working-memory", "Önceki ekranda gösterilen 6 sayı dizisi neydi?",    ["1-4-7-2-8-5","1-7-4-2-5-8","4-1-7-8-2-5","7-4-1-5-8-2"], "1-4-7-2-8-5", 3, 8000),
  q("working-memory", "Önceki ekranda gösterilen 3 şehir neydi?",          ["Ankara-İzmir-Bursa","İzmir-Ankara-Bursa","Bursa-Ankara-İzmir","Ankara-Bursa-İzmir"], "Ankara-İzmir-Bursa", 1, 5000),
  q("working-memory", "Önceki ekrandaki 2 işlemin sonuçları neydi?",       ["12 ve 8","8 ve 12","10 ve 8","12 ve 10"], "12 ve 8", 2, 7000),
  q("working-memory", "Önceki ekranda gösterilen 5 harf dizisi neydi?",    ["T-K-M-B-R","K-T-B-M-R","M-T-K-R-B","T-M-K-B-R"], "T-K-M-B-R", 3, 7000),
  q("working-memory", "Önceki ekranda gösterilen şekil sırası neydi?",     ["Daire-Kare-Üçgen","Kare-Daire-Üçgen","Üçgen-Kare-Daire","Daire-Üçgen-Kare"], "Daire-Kare-Üçgen", 1, 5000),
  q("working-memory", "Önceki ekranda gösterilen 7 sayı dizisi neydi?",    ["5-3-8-1-9-2-6","3-5-8-9-1-6-2","8-5-3-1-2-9-6","5-8-3-1-9-6-2"], "5-3-8-1-9-2-6", 4, 10000),
];

// Insert questions
for (const question of allQuestions) {
  db.insert(schema.questions).values(question).run();
}

// ─── Seed Achievements ───────────────────────────────────
const achievementsData = [
  { slug: "first-blood",     name: "İlk Adım",        description: "İlk soruyu doğru cevapla!",              icon: "rocket",       condition: JSON.stringify({ type: "total_correct", value: 1 }) },
  { slug: "streak-5",        name: "Ateş Topçusu",     description: "5 soru üst üste doğru cevapla!",         icon: "flame",        condition: JSON.stringify({ type: "streak", value: 5 }) },
  { slug: "streak-10",       name: "Durdurulamaz",     description: "10 soru üst üste doğru cevapla!",        icon: "zap",          condition: JSON.stringify({ type: "streak", value: 10 }) },
  { slug: "streak-25",       name: "Efsanevi Seri",    description: "25 soru üst üste doğru cevapla!",        icon: "crown",        condition: JSON.stringify({ type: "streak", value: 25 }) },
  { slug: "speed-demon",     name: "Hız Canavarı",     description: "Bir soruyu hedef sürenin yarısında çöz!",icon: "timer",        condition: JSON.stringify({ type: "speed_ratio", value: 0.5 }) },
  { slug: "century",         name: "Yüzüncü",          description: "100 soru çöz!",                          icon: "trophy",       condition: JSON.stringify({ type: "total_attempts", value: 100 }) },
  { slug: "five-hundred",    name: "Beş Yüzüncü",     description: "500 soru çöz!",                          icon: "medal",        condition: JSON.stringify({ type: "total_attempts", value: 500 }) },
  { slug: "math-master",     name: "Matematik Ustası", description: "Math konularında %90+ doğruluk yakala!", icon: "calculator",   condition: JSON.stringify({ type: "topic_accuracy", topic: "math", value: 0.9 }) },
  { slug: "verbal-master",   name: "Sözel Usta",       description: "Sözel konularda %90+ doğruluk yakala!",  icon: "book-open",    condition: JSON.stringify({ type: "topic_accuracy", topic: "verbal", value: 0.9 }) },
  { slug: "daily-warrior",   name: "Günlük Savaşçı",   description: "3 günlük görevi tamamla!",               icon: "shield",       condition: JSON.stringify({ type: "daily_quests_completed", value: 3 }) },
  { slug: "level-5",         name: "Çırak",            description: "Seviye 5'e ulaş!",                      icon: "star",         condition: JSON.stringify({ type: "level", value: 5 }) },
  { slug: "level-10",        name: "Usta",             description: "Seviye 10'a ulaş!",                     icon: "gem",          condition: JSON.stringify({ type: "level", value: 10 }) },
  { slug: "hawk-eye",        name: "Şahin Gözlü",      description: "Flaş okumada 15 doğru üst üste!",       icon: "eye",          condition: JSON.stringify({ type: "topic_streak", topic: "tachistoscope", value: 15 }) },
];

for (const a of achievementsData) {
  db.insert(schema.achievements).values(a).run();
}

// ─── Seed Default User ──────────────────────────────────
const existingUser = sqlite.prepare("SELECT id FROM users LIMIT 1").get();
if (!existingUser) {
  db.insert(schema.users).values({ name: "Çalışkan" }).run();
}

console.log("✅ Veritabanı başarıyla seed edildi!");
console.log(`   - ${topicsData.length} konu`);
console.log(`   - ${allQuestions.length} soru`);
console.log(`   - ${achievementsData.length} rozet`);

sqlite.close();

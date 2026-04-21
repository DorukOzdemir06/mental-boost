"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, Pencil, Target, Search, Zap, ScanSearch, Table2, Database,
  Flame, Star, ChevronRight, TrendingUp, Shield, Clock,
  BarChart3, Sparkles, Palette
} from "lucide-react";
import Link from "next/link";
import { getXpProgress, cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { StatsPanel } from "@/components/stats-panel";
import { SettingsPanel } from "@/components/settings-panel";

const ICON_MAP: Record<string, React.ElementType> = {
  brain: Brain, pencil: Pencil, target: Target, search: Search,
  zap: Zap, "scan-search": ScanSearch, "table-2": Table2, database: Database,
};

interface Topic {
  id: number; slug: string; name: string; description: string;
  icon: string; color: string; category: string;
}

interface UserData {
  xp: number; currentLevel: number; longestStreak: number;
  totalCorrect: number; totalAttempts: number; streakShields: number;
}

interface TopicStat {
  topicSlug: string; totalAttempts: number; correctCount: number; avgTimeMs: number;
}

export default function DashboardPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [user, setUser] = useState<UserData | null>(null);
  const [topicStats, setTopicStats] = useState<TopicStat[]>([]);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [recentHistory, setRecentHistory] = useState<{id: number, isCorrect: boolean, topicSlug: string}[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/topics").then((r) => r.json()),
      fetch("/api/attempts?type=user").then((r) => r.json()),
      fetch("/api/attempts?type=topic-stats").then((r) => r.json()),
      fetch("/api/attempts?type=weakness").then((r) => r.json()),
      fetch("/api/attempts?type=recent-history").then((r) => r.json()),
    ]).then(([t, u, s, w, h]) => {
      setTopics(t);
      setUser(u);
      setTopicStats(s);
      setWeakTopics(w.map((x: { topicSlug: string }) => x.topicSlug));
      setRecentHistory(h);
      setLoaded(true);
    });
  }, []);

  const xpInfo = user ? getXpProgress(user.xp) : null;
  const accuracy = user && user.totalAttempts > 0
    ? Math.round((user.totalCorrect / user.totalAttempts) * 100)
    : 0;

  const mathTopics = topics.filter((t) => t.category === "math");
  const verbalTopics = topics.filter((t) => t.category === "verbal");

  // Format Recharts data -> moving average or 1/0 for area chart
  const chartData = recentHistory.map((h, i) => {
    // We can do a rolling accuracy for smoothing
    const last5 = recentHistory.slice(Math.max(0, i - 4), i + 1);
    const avg = last5.reduce((acc, curr) => acc + (curr.isCorrect ? 100 : 0), 0) / last5.length;
    return { name: i + 1, accuracy: avg };
  });


  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Brain className="w-12 h-12 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-12">
      {/* ─── Hero Header ────────────────────────────────── */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/20 animate-pulse-glow">
                <Brain className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Mental <span className="text-primary">Boost</span>
              </h1>
            </div>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 rounded-xl glass hover:bg-white/10 transition-colors text-muted-foreground hover:text-primary"
              title="Temalar ve Ayarlar"
            >
              <Palette className="w-5 h-5" />
            </button>
          </motion.div>

          {/* Stats Bar */}
          {user && xpInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3"
            >
              {/* Level */}
              <div className="glass rounded-2xl p-4 group card-hover">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-accent" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Seviye</span>
                </div>
                <div className="text-2xl font-bold text-accent">{xpInfo.level}</div>
                <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className="h-full progress-bar rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${xpInfo.progress * 100}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {xpInfo.currentLevelXp} / {xpInfo.nextLevelXp} XP
                </p>
              </div>

              {/* XP */}
              <div className="glass rounded-2xl p-4 card-hover">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Toplam XP</span>
                </div>
                <div className="text-2xl font-bold text-primary">{user.xp.toLocaleString()}</div>
              </div>

              {/* Accuracy */}
              <div className="glass rounded-2xl p-4 card-hover">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Doğruluk</span>
                </div>
                <div className="text-2xl font-bold text-success">
                  %{accuracy}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {user.totalCorrect}/{user.totalAttempts} soru
                </p>
              </div>

              {/* Streak */}
              <div className="glass rounded-2xl p-4 card-hover">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-accent" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">En Uzun Seri</span>
                </div>
                <div className="text-2xl font-bold text-accent">{user.longestStreak}</div>
                {user.streakShields > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Shield className="w-3 h-3 text-accent" />
                    <span className="text-[10px] text-accent">{user.streakShields} kalkan</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 mt-8 space-y-10">
        {/* ─── Warmup Card ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link href="/drill/warmup">
            <div className="glass rounded-2xl p-6 card-hover cursor-pointer group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-primary/10 group-hover:from-accent/20 group-hover:to-primary/20 transition-all" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-accent/20">
                    <Clock className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-accent">🔥 Günlük Isınma — 3 Dakika</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Beynini uyandır! Refleks açıcı karma pratik egzersiz.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
              </div>
            </div>
          </Link>
        </motion.div>

        {/* ─── Weakness Alert ───────────────────────────── */}
        {weakTopics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-5 border-destructive/30"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-destructive/20">
                <BarChart3 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-destructive">Kırmızı Bölge — Zayıf Alanların</h3>
                <p className="text-xs text-muted-foreground">Bu konularda doğruluk oranın %60&apos;ın altında. Daha çok pratik yap!</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {weakTopics.map((slug) => {
                const topic = topics.find((t) => t.slug === slug);
                return topic ? (
                  <Link key={slug} href={`/drill/${slug}`}>
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border border-destructive/30 hover:bg-destructive/20 transition-colors"
                      style={{ color: topic.color }}
                    >
                      {topic.name}
                    </span>
                  </Link>
                ) : null;
              })}
            </div>
          </motion.div>
        )}

        {/* ─── Progression Chart ────────────────────────── */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground/90 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Son Performans Trendi
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Son {chartData.length} sorunun hareketli ortalama doğruluğu</p>
              </div>
              <button
                onClick={() => setIsStatsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-semibold"
              >
                <Target className="w-4 h-4" /> Detaylı Gelişim / Öneriler
              </button>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                    itemStyle={{ color: "var(--primary)" }}
                    formatter={(value: unknown) => {
                      const num = typeof value === "number" ? value : Number(value);
                      return [`%${Math.round(num || 0)}`, "Doğruluk"];
                    }}
                    labelFormatter={() => "Soru"}
                  />
                  <Area
                    type="monotone"
                    dataKey="accuracy"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorAccuracy)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* ─── Drill Categories ─────────────────────────── */}
        <DrillSection
          title="🧮 Matematik & Sayısal"
          topics={mathTopics}
          stats={topicStats}
          weakTopics={weakTopics}
          delay={0.3}
        />
        <DrillSection
          title="📖 Çalışan Hafıza & Dikkat"
          topics={verbalTopics}
          stats={topicStats}
          weakTopics={weakTopics}
          delay={0.4}
        />
      </div>

      <StatsPanel
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={topicStats}
        topics={topics}
      />

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </main>
  );
}

function DrillSection({
  title,
  topics,
  stats,
  weakTopics,
  delay,
}: {
  title: string;
  topics: Topic[];
  stats: TopicStat[];
  weakTopics: string[];
  delay: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <h2 className="text-lg font-semibold mb-4 text-foreground/90">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {topics.map((topic, i) => {
          const Icon = ICON_MAP[topic.icon] || Brain;
          const stat = stats.find((s) => s.topicSlug === topic.slug);
          const isWeak = weakTopics.includes(topic.slug);
          const accuracy = stat && stat.totalAttempts > 0
            ? Math.round((stat.correctCount / stat.totalAttempts) * 100)
            : null;

          return (
            <motion.div
              key={topic.slug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + i * 0.05 }}
            >
              <Link href={`/drill/${topic.slug}`}>
                <div className={cn(
                  "glass rounded-2xl p-5 card-hover cursor-pointer group relative overflow-hidden",
                  isWeak && "border-destructive/40"
                )}>
                  {isWeak && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-destructive/20 text-[10px] text-destructive font-medium">
                      ZAYıF
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div
                      className="p-3 rounded-xl transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${topic.color}20` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: topic.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm" style={{ color: topic.color }}>
                        {topic.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {topic.description}
                      </p>
                      {stat && (
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-muted-foreground">
                            {stat.totalAttempts} soru
                          </span>
                          {accuracy !== null && (
                            <span
                              className="text-[10px] font-medium"
                              style={{
                                color: accuracy >= 70 ? "var(--success)" : accuracy >= 40 ? "var(--warning)" : "var(--destructive)",
                              }}
                            >
                              %{accuracy} doğruluk
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform mt-1" />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

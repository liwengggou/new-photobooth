import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type DayMovements = { eee: number; ooo: number; aaa: number };
type WeekData = DayMovements[]; // 7 days

const generateSampleWeek = (seed: number): WeekData => {
  // Deterministic pseudo-random based on seed for consistent demo
  const rand = (min: number, max: number, n: number) => {
    const x = Math.sin(seed * 1000 + n) * 10000;
    return Math.floor(min + (x - Math.floor(x)) * (max - min + 1));
  };

  const week: WeekData = [];
  for (let i = 0; i < 7; i++) {
    const total = rand(50, 200, i);
    const eee = rand(10, Math.max(10, Math.floor(total * 0.6)), i + 7);
    const ooo = rand(10, Math.max(10, Math.floor(total * 0.6)), i + 14);
    let aaa = total - eee - ooo;
    if (aaa < 5) {
      aaa = 5;
    }
    if (eee + ooo + aaa !== total) {
      const diff = total - (eee + ooo + aaa);
      aaa += diff;
    }
    week.push({ eee, ooo, aaa });
  }
  return week;
};

// Specific sample week: Nov 3 - Nov 9 with Tuesday (index 1) = 0
// Heights reflect requested relative scale
const sampleWeekNov3ToNov9: WeekData = [
  // Monday: EEE = 40, OOO = 25, AAA = 15 (total 80)
  { eee: 40, ooo: 25, aaa: 15 },
  // Tuesday: no values, no bar
  { eee: 0, ooo: 0, aaa: 0 },
  // Wednesday: EEE = 15, OOO = 10, AAA = 15 (total 40)
  { eee: 15, ooo: 10, aaa: 15 },
  // Thursday: EEE = 25, OOO = 20, AAA = 15 (total 60)
  { eee: 25, ooo: 20, aaa: 15 },
  // Friday: EEE = 10, OOO = 5, AAA = 5 (total 20)
  { eee: 10, ooo: 5, aaa: 5 },
  // Saturday: EEE = 40, OOO = 30, AAA = 20 (total 90)
  { eee: 40, ooo: 30, aaa: 20 },
  // Sunday: EEE = 20, OOO = 20, AAA = 10 (total 50)
  { eee: 20, ooo: 20, aaa: 10 },
];

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const Progress: React.FC = () => {
  const weeks = useMemo(() => [
    sampleWeekNov3ToNov9,
    generateSampleWeek(2),
    generateSampleWeek(3),
    generateSampleWeek(4),
  ], []);

  const [weekIndex, setWeekIndex] = useState(0);
  const currentWeek = weeks[weekIndex];
  const maxTotal = Math.max(...currentWeek.map(d => d.eee + d.ooo + d.aaa));

  const handlePrevWeek = () => setWeekIndex(i => Math.min(weeks.length - 1, i + 1));
  const handleNextWeek = () => setWeekIndex(i => Math.max(0, i - 1));

  // Date range label (Nov 3 - Nov 9 for index 0, adjust by weekIndex)
  const baseStart = new Date(2024, 10, 3); // Nov 3, 2024
  const start = new Date(baseStart);
  start.setDate(baseStart.getDate() - weekIndex * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const rangeLabel = `${start.toLocaleString('en-US', { month: 'short' })} ${start.getDate()} - ${end.toLocaleString('en-US', { month: 'short' })} ${end.getDate()}`;

  return (
    <Layout>
      <div className="h-full overflow-y-auto px-6 pt-8 pb-28 space-y-6">
        {/* Streak */}
        <motion.div
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-5"
        >
          <div className="text-white/90 text-sm">🔥 Streak</div>
          <div className="text-white text-2xl font-bold mt-1">5 days</div>
        </motion.div>

        {/* Total days played */}
        <motion.div
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-5"
        >
          <div className="text-white/90 text-sm">Total days played</div>
          <div className="text-white text-2xl font-bold mt-1">17 days</div>
        </motion.div>

        {/* Daily Bar Graph (weekly view with navigation) */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevWeek}
              className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-white font-semibold">{rangeLabel}</div>
            <button
              onClick={handleNextWeek}
              className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Bars */}
          <div className="h-36 flex items-end justify-between gap-2">
            {currentWeek.map((d, idx) => {
              const total = d.eee + d.ooo + d.aaa;
              const maxHeight = 144; // 36 * 4 = 144px (h-36 = 9rem = 144px)
              const heightPx = (total / maxTotal) * maxHeight;
              const eHeight = total > 0 ? (d.eee / total) * heightPx : 0;
              const oHeight = total > 0 ? (d.ooo / total) * heightPx : 0;
              const aHeight = total > 0 ? (d.aaa / total) * heightPx : 0;
              return (
                <div key={idx} className="flex flex-col items-center w-full">
                  {total > 0 ? (
                    <div className="w-3 sm:w-3.5 md:w-4 bg-white/15 rounded-xl overflow-hidden flex flex-col" style={{ height: `${heightPx}px` }}>
                      <div className="w-full bg-yellow-400" style={{ height: `${aHeight}px` }} />
                      <div className="w-full bg-pink-500" style={{ height: `${oHeight}px` }} />
                      <div className="w-full bg-blue-500" style={{ height: `${eHeight}px` }} />
                    </div>
                  ) : (
                    <div className="w-3 sm:w-3.5 md:w-4 rounded-xl" style={{ height: `0px` }} />
                  )}
                  <div className="mt-2 text-white/80 text-xs">{dayLabels[idx]}</div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-white/80">
            <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded bg-blue-500"></span> EEE</div>
            <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded bg-pink-500"></span> OOO</div>
            <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded bg-yellow-400"></span> AAA</div>
          </div>
        </motion.div>

        {/* Badges / Simple Achievements */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-5"
        >
          <div className="text-white font-semibold mb-3">Badges</div>
          <div className="grid grid-cols-2 gap-3">
            {/* Completed */}
            <div className="p-3 rounded-xl bg-green-500/20 border border-green-400/30 text-white">
              <div className="flex items-center gap-2">
                <span className="text-base">🏅</span>
                <span className="text-base font-medium">3-day streak</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-green-500/20 border border-green-400/30 text-white">
              <div className="flex items-center gap-2">
                <span className="text-base">🏅</span>
                <span className="text-base font-medium">1000 total movements</span>
              </div>
            </div>

            {/* Not achieved */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/70">
              <span className="text-base font-medium">10 friends</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/70">
              <span className="text-base font-medium">Perfect day (no missed sets)</span>
            </div>
          </div>

          <div className="mt-4">
            <button className="w-full py-2 rounded-xl bg-white/15 text-white hover:bg-white/25 font-medium">See all</button>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Progress;
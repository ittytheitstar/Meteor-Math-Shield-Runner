"use strict";

// ============================================================
// CONSTANTS — canvas geometry
// ============================================================
const GW = 480, GH = 800, LANES = 3, LW = GW / LANES;
const SHIP_Y = GH - 110;
const SHIP_W = 58, SHIP_H = 76, MR = 52;

// ============================================================
// INLINE CONFIG
// ============================================================
const CFG = {
  shield: {
    max: 100, initial: 100,
    drainPerSec: 2.8,
    rechargeOnCorrect: 18,
    penaltyOnWrong: 22,
    feverDrainMult: 0.5,
    criticalPct: 0.25
  },
  scoring: {
    xpPerCorrect: 10,
    xpComboStep: 0.5,
    xpMaxMult: 4,
    coinsPerCorrect: 5,
    coinsFeverMult: 2,
    speedBonusXP: 5
  },
  combo: {
    feverThresholds: [5, 10, 15],
    feverDuration: 8,
    decayDelay: 5,
    decayRate: 1
  },
  adaptive: {
    window: 10,
    targetAcc: 0.78,
    upIfAbove: 0.85,
    downIfBelow: 0.65,
    diffMin: 1,
    diffMax: 7
  },
  meteor: {
    baseSpeed: 120,
    speedPerWave: 2.5,
    maxSpeed: 420
  },
  levelThresholds: [0, 80, 180, 320, 500, 720, 990, 1320, 1710, 2170, 2710, 3340, 4070, 4910, 5870, 6970],
  ageBands: {
    age6_7: {
      label: 'Age 6–7', emoji: '🌱', diffStart: 1, diffMax: 3,
      speed: 90,
      weights: { add: 0.30, sub: 0.25, pattern: 0.15, money: 0.15, geometry: 0.08, statistics: 0.07 }
    },
    age8_9: {
      label: 'Age 8–9', emoji: '⭐', diffStart: 2, diffMax: 5,
      speed: 110,
      weights: { add: 0.14, sub: 0.10, mul: 0.20, div: 0.12, algebra: 0.12, fraction: 0.08, money: 0.10, time: 0.08, statistics: 0.06 }
    },
    age10_12: {
      label: 'Age 10–12', emoji: '🔥', diffStart: 3, diffMax: 7,
      speed: 130,
      weights: { mul: 0.12, div: 0.10, fraction: 0.15, decimal: 0.08, algebra: 0.18, money: 0.07, time: 0.07, geometry: 0.10, statistics: 0.07, probability: 0.06 }
    }
  },
  modes: {
    quickRun: { label: 'Quick Run',    durationSec: 150,      hasFailure: true,  shieldDrain: true,  speedMult: 1.0  },
    mission:  { label: 'Mission',      durationSec: Infinity, hasFailure: true,  shieldDrain: true,  speedMult: 1.0  },
    zen:      { label: 'Zen Practice', durationSec: Infinity, hasFailure: false, shieldDrain: false, speedMult: 0.55 }
  }
};

// ============================================================
// SHIPS DATA
// ============================================================
const SHIPS = [
  { id: 'scout',         name: 'Scout',         emoji: '🚀', color: '#00e5ff', trailColor: '#0077ff', unlockCondition: 'default' },
  { id: 'kiwi_cruiser',  name: 'Kiwi Cruiser',  emoji: '🥝', color: '#b5e853', trailColor: '#4caf50', unlockCondition: { type: 'level', value: 3 } },
  { id: 'pohutukawa',    name: 'Pōhutukawa',    emoji: '🌺', color: '#ff3d00', trailColor: '#ff6d00', unlockCondition: { type: 'correct_total', value: 100 } },
  { id: 'tui',           name: 'Tui Jet',       emoji: '🐦', color: '#1de9b6', trailColor: '#00b0ff', unlockCondition: { type: 'streak', value: 10 } },
  { id: 'pounamu',       name: 'Pounamu',       emoji: '💚', color: '#00c853', trailColor: '#69f0ae', unlockCondition: { type: 'level', value: 7 } },
  { id: 'star_blazer',   name: 'Star Blazer',    emoji: '⭐', color: '#ffd600', trailColor: '#ff6f00', unlockCondition: { type: 'level', value: 12 } },
  { id: 'rainbow_rider', name: 'Rainbow Rider',  emoji: '🌈', color: '#e040fb', trailColor: '#7c4dff', unlockCondition: { type: 'fever_total', value: 5 } },
  { id: 'taniwha',       name: 'Taniwha',        emoji: '🐉', color: '#aa00ff', trailColor: '#d500f9', unlockCondition: { type: 'correct_total', value: 500 } }
];

// ============================================================
// UPGRADES DATA
// ============================================================
const UPGRADES = [
  { id: 'shield_boost',    category: 'survival',    name: 'Reinforced Shield', icon: '🛡️', desc: 'Increase max shield by 20% per level', maxLevel: 3, cost: [60, 120, 200], effect: { type: 'shield_max', multiplier: 1.20 } },
  { id: 'shield_regen',    category: 'survival',    name: 'Shield Regen+',     icon: '💚', desc: '+6 shield per correct per level',       maxLevel: 3, cost: [50, 100, 160], effect: { type: 'shield_recharge', addPerCorrect: 6 } },
  { id: 'second_chance',   category: 'survival',    name: 'Second Chance',     icon: '🍀', desc: 'Ignore 1 wrong answer per run',         maxLevel: 3, cost: [80, 160, 250], effect: { type: 'second_chance', charges: 1 } },
  { id: 'slow_drain',      category: 'survival',    name: 'Shield Insulator',  icon: '⏳', desc: 'Shield drains 15% slower per level',    maxLevel: 3, cost: [70, 140, 220], effect: { type: 'drain_multiplier', multiplier: 0.85 } },
  { id: 'combo_decay',     category: 'speed_score', name: 'Combo Lock',        icon: '🔗', desc: 'Combo decays 30% slower per level',     maxLevel: 3, cost: [60, 100, 160], effect: { type: 'combo_decay_multiplier', multiplier: 0.7 } },
  { id: 'xp_boost',        category: 'speed_score', name: 'XP Overdrive',      icon: '⚡', desc: '+25% XP per correct per level',         maxLevel: 3, cost: [50, 90, 140],  effect: { type: 'xp_multiplier', multiplier: 1.25 } },
  { id: 'coin_magnet',     category: 'speed_score', name: 'Coin Magnet',       icon: '🧲', desc: '+3 bonus coins per correct per level',  maxLevel: 3, cost: [40, 80, 130],  effect: { type: 'bonus_coins', perCorrect: 3 } },
  { id: 'tap_speed',       category: 'speed_score', name: 'Quick Tap',         icon: '👆', desc: '25% faster tap cooldown per level',     maxLevel: 2, cost: [80, 150],      effect: { type: 'tap_cooldown', multiplier: 0.75 } },
  { id: 'eliminate_wrong', category: 'math_helper', name: 'Eliminate!',        icon: '❌', desc: 'Every 8 questions, dim a wrong option', maxLevel: 3, cost: [90, 160, 240], effect: { type: 'eliminate_one', everyN: 8 } },
  { id: 'slow_time',       category: 'math_helper', name: 'Time Warp',         icon: '🌀', desc: 'After 3-streak, meteors slow for 2s',   maxLevel: 3, cost: [100, 180, 260], effect: { type: 'slow_on_streak', streakNeeded: 3, duration: 2, speedMultiplier: 0.5 } },
  { id: 'place_value_hint',category: 'math_helper', name: 'Place Value Lens',  icon: '🔍', desc: 'Highlights tens/ones in 2-digit questions', maxLevel: 1, cost: [70],     effect: { type: 'place_value_highlight', active: true } }
];

// ============================================================
// MISSIONS DATA
// ============================================================
const MISSIONS = [
  { id: 'first_flight',    title: 'First Flight',      icon: '🚀', desc: 'Answer 10 questions correctly',           difficulty: 'easy',   goal: { type: 'correct_answers', target: 10 },                    rewards: { xp: 50,  coins: 20 } },
  { id: 'lucky_streak',    title: 'Lucky Streak',      icon: '🔥', desc: 'Get 5 correct answers in a row',          difficulty: 'easy',   goal: { type: 'streak', target: 5 },                             rewards: { xp: 80,  coins: 30 } },
  { id: 'coin_collector',  title: 'Coin Collector',    icon: '🪙', desc: 'Collect 100 coins in a single run',       difficulty: 'easy',   goal: { type: 'coins_in_run', target: 100 },                     rewards: { xp: 60,  coins: 40 } },
  { id: 'hot_streak',      title: 'Hot Streak',        icon: '🌡️', desc: 'Get 10 correct in a row',                 difficulty: 'medium', goal: { type: 'streak', target: 10 },                            rewards: { xp: 150, coins: 60 },  unlocks: 'tui' },
  { id: 'fever_mode',      title: 'Fever Activated!',  icon: '🌡️', desc: 'Trigger Fever Mode',                     difficulty: 'medium', goal: { type: 'fever_triggers', target: 1 },                     rewards: { xp: 120, coins: 50 } },
  { id: 'century',         title: 'Century Club',      icon: '💯', desc: 'Answer 100 questions correctly total',    difficulty: 'medium', goal: { type: 'correct_total', target: 100 },                    rewards: { xp: 300, coins: 100 }, unlocks: 'pohutukawa' },
  { id: 'math_blitz',      title: 'Math Blitz',        icon: '⚡', desc: 'Answer 20 correctly in a single run',    difficulty: 'medium', goal: { type: 'correct_in_run', target: 20 },                    rewards: { xp: 200, coins: 80 } },
  { id: 'number_master',   title: 'Number Master',     icon: '🔢', desc: '10 number questions correct in a run',   difficulty: 'medium', goal: { type: 'strand_in_run', strand: 'number', target: 10 },   rewards: { xp: 180, coins: 70 } },
  { id: 'money_savvy',     title: 'Money Savvy',       icon: '💰', desc: 'Answer 10 money questions correctly',    difficulty: 'medium', goal: { type: 'type_correct', questionType: 'money', target: 10 }, rewards: { xp: 160, coins: 90 } },
  { id: 'double_fever',    title: 'Double Fever',      icon: '🔥🔥', desc: 'Trigger Fever Mode twice in one run', difficulty: 'hard',   goal: { type: 'fever_in_run', target: 2 },                        rewards: { xp: 350, coins: 120 }, unlocks: 'rainbow_rider' },
  { id: 'level_5',         title: 'Level 5 Champion',  icon: '🏅', desc: 'Reach Game Level 5 in a single run',    difficulty: 'hard',   goal: { type: 'reach_level', target: 5 },                         rewards: { xp: 400, coins: 150 }, unlocks: 'pounamu' },
  { id: 'algebra_ace',     title: 'Algebra Ace',       icon: '🔡', desc: 'Answer 15 algebra questions correctly', difficulty: 'hard',   goal: { type: 'type_correct', questionType: 'algebra', target: 15 }, rewards: { xp: 300, coins: 110 } },
  { id: 'survival_expert', title: 'Survival Expert',   icon: '🛡️', desc: 'Keep shield above 75% for 30 questions', difficulty: 'hard',  goal: { type: 'shield_above', threshold: 75, count: 30 },         rewards: { xp: 500, coins: 200 }, unlocks: 'star_blazer' }
];

// ============================================================
// TEACHING TIPS
// ============================================================
const TIPS = {
  add:         { strategy: 'Make a 10 first! e.g. 8+7 → 8+2=10, then +5=15',   example: '8 + 7 = 15' },
  sub:         { strategy: 'Count up from the smaller to the bigger number.',    example: '13 − 8: count 8→13 = 5' },
  mul:         { strategy: 'Times tables are skip-counting!',                    example: '6×7: try 6×6=36 then +6=42' },
  div:         { strategy: 'Ask: what × divisor = dividend?',                   example: '56÷7: 7×8=56, answer 8' },
  fraction:    { strategy: 'Divide first, then multiply.',                       example: '3/4 of 20: 20÷4=5, ×3=15' },
  algebra:     { strategy: 'Use inverse operations to find the missing number.', example: '☐+5=12 → 12−5=7' },
  geometry:    { strategy: 'Perimeter = 2×(l+w). Area = l×w',                  example: '4cm×3cm: Perimeter=14, Area=12' },
  pattern:     { strategy: 'Find the rule: what do you add/subtract each time?', example: '2,5,8,11 → +3 each time → 14' },
  money:       { strategy: 'Count up from price to amount paid.',               example: 'Pay $5 for $3.50: +50¢→$4, +$1→$5 = $1.50 change' },
  time:        { strategy: 'Add hours and minutes separately (60 min = 1 hr).',  example: '2:45 + 30min = 3:15' },
  statistics:  { strategy: 'For mean: add all values, divide by count.',         example: 'Mean of 4,6,8,6: sum=24, ÷4=6' },
  probability: { strategy: 'P = favourable ÷ total outcomes.',                  example: '3 red, 5 blue → P(red) = 3/8' },
  decimal:     { strategy: 'Line up decimal points when adding/subtracting.',   example: '2.3 + 1.45 = 3.75' }
};

// ============================================================
// UTILITY
// ============================================================
const rnd   = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const rndF  = (a, b) => Math.random() * (b - a) + a;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function weightedPick(weights) {
  const keys = Object.keys(weights);
  let r = Math.random() * keys.reduce((s, k) => s + weights[k], 0);
  for (const k of keys) { r -= weights[k]; if (r <= 0) return k; }
  return keys[keys.length - 1];
}

function nearMiss(n, deltas = [1, 2, 10]) {
  const d = deltas[rnd(0, deltas.length - 1)];
  const v = Math.random() < 0.5 ? n + d : n - d;
  return Math.max(0, Math.round(v));
}

function makeQ(prompt, answer, d1, d2, type) {
  const ans = String(answer);
  const opts = new Set([ans]);
  for (const d of [d1, d2, String(nearMiss(Number(ans) || 0, [1, 3, 7])), String(Math.abs(Number(ans) || 0) + 1)]) {
    if (String(d) !== ans) opts.add(String(d));
    if (opts.size === 3) break;
  }
  return { prompt, answer: ans, options: shuffle([...opts]), type };
}

// ============================================================
// QUESTION GENERATORS
// ============================================================
function generateQuestion(ageBandId, difficulty) {
  const ab = CFG.ageBands[ageBandId];
  const type = weightedPick(ab.weights);
  return genByType(type, difficulty);
}

function genByType(type, d) {
  switch (type) {
    case 'add':         return genAdd(d);
    case 'sub':         return genSub(d);
    case 'mul':         return genMul(d);
    case 'div':         return genDiv(d);
    case 'fraction':    return genFraction(d);
    case 'algebra':     return genAlgebra(d);
    case 'geometry':    return genGeometry(d);
    case 'pattern':     return genPattern(d);
    case 'money':       return genMoney(d);
    case 'time':        return genTime(d);
    case 'statistics':  return genStatistics(d);
    case 'probability': return genProbability(d);
    case 'decimal':     return genDecimal(d);
    default:            return genAdd(d);
  }
}

function genAdd(d) {
  const ranges = [[0, 10], [0, 20], [10, 50], [10, 99], [50, 500]];
  const [lo, hi] = ranges[clamp(d - 1, 0, 4)];
  const a = rnd(lo, hi), b = rnd(lo, hi);
  const ans = a + b;
  return makeQ(`${a} + ${b} = ?`, ans, nearMiss(ans, [1, 2, 10]), Math.abs(a - b), 'add');
}

function genSub(d) {
  const ranges = [[0, 10], [5, 20], [10, 99], [20, 99], [100, 999]];
  const [lo, hi] = ranges[clamp(d - 1, 0, 4)];
  const a = rnd(lo, hi);
  const b = rnd(Math.max(1, lo), a);
  const ans = a - b;
  return makeQ(`${a} \u2212 ${b} = ?`, ans, nearMiss(ans, [1, 2, 10]), b, 'sub');
}

function genMul(d) {
  const specs = [[2, 10, 2, 10], [2, 12, 2, 12], [7, 12, 7, 12], [11, 20, 2, 9], [10, 50, 10, 50]];
  const [la, ha, lb, hb] = specs[clamp(d - 1, 0, 4)];
  const a = rnd(la, ha), b = rnd(lb, hb);
  const ans = a * b;
  return makeQ(`${a} \u00d7 ${b} = ?`, ans, a + b, nearMiss(ans, [a, b]), 'mul');
}

function genDiv(d) {
  const tableGroups = [[2, 5, 10], [2, 5, 10], [3, 4, 6], [7, 8, 9], [2, 12]];
  const group = tableGroups[clamp(d - 1, 0, 4)];
  const b = group[rnd(0, group.length - 1)];
  const q = rnd(2, d <= 2 ? 10 : 12);
  const a = b * q;
  return makeQ(`${a} \u00f7 ${b} = ?`, q, a + b, nearMiss(q, [1, 2]), 'div');
}

function genFraction(d) {
  const pool = [
    { s: '1/2', n: 1, dn: 2 }, { s: '1/4', n: 1, dn: 4 }, { s: '3/4', n: 3, dn: 4 },
    { s: '1/3', n: 1, dn: 3 }, { s: '2/3', n: 2, dn: 3 }, { s: '1/5', n: 1, dn: 5 }, { s: '2/5', n: 2, dn: 5 }
  ];
  const f = pool[clamp(d - 3, 0, pool.length - 1)];
  const mult = rnd(1, 5) * f.dn;
  const ans = (mult / f.dn) * f.n;
  return makeQ(`Find ${f.s} of ${mult}`, ans, mult / f.dn, nearMiss(ans, [1, 2, 5]), 'fraction');
}

function genAlgebra(d) {
  if (d <= 1) {
    const b = rnd(1, 9), ans = rnd(1, 10), c = ans + b;
    return makeQ(`\u25a1 + ${b} = ${c}`, ans, c + b, nearMiss(ans, [1, 2]), 'algebra');
  } else if (d <= 2) {
    const ans = rnd(2, 12), b = rnd(1, 9), c = ans + b;
    return makeQ(`${c} \u2212 \u25a1 = ${b}`, ans, c + b, nearMiss(ans, [1, 2]), 'algebra');
  } else if (d <= 3) {
    const tables = [2, 3, 4, 5, 10];
    const b = tables[rnd(0, 4)], ans = rnd(2, 12), c = b * ans;
    return makeQ(`\u25a1 \u00d7 ${b} = ${c}`, ans, c + b, nearMiss(ans, [1, 2]), 'algebra');
  } else if (d <= 4) {
    const b = rnd(2, 9), ans = rnd(2, 12), a = b * ans;
    return makeQ(`${a} \u00f7 \u25a1 = ${ans}`, b, ans, nearMiss(b, [1, 2]), 'algebra');
  } else {
    const ans = rnd(1, 15), b = rnd(1, 10), c = 2 * ans + b;
    return makeQ(`2 \u00d7 \u25a1 + ${b} = ${c}`, ans, c - b, nearMiss(ans, [1, 2]), 'algebra');
  }
}

function genGeometry(d) {
  if (d <= 3) {
    const w = rnd(1, 20), h = rnd(1, 20);
    const ans = 2 * (w + h);
    return makeQ(`Perimeter of ${w}cm \u00d7 ${h}cm rect?`, ans, w * h, nearMiss(ans, [2, 4]), 'geometry');
  } else {
    const w = rnd(2, 20), h = rnd(2, 20);
    const ans = w * h;
    return makeQ(`Area of ${w}cm \u00d7 ${h}cm rect?`, ans, 2 * (w + h), nearMiss(ans, [w, h]), 'geometry');
  }
}

function genPattern(d) {
  let seq, step, ans;
  if (d <= 1) {
    step = rnd(1, 2); const s = rnd(1, 5);
    seq = [s, s + step, s + 2 * step, s + 3 * step]; ans = s + 4 * step;
  } else if (d <= 2) {
    step = [2, 3, 5][rnd(0, 2)]; const s = rnd(2, 10);
    seq = [s, s + step, s + 2 * step, s + 3 * step, s + 4 * step]; ans = s + 5 * step;
  } else if (d <= 3) {
    step = [10, 20, 25][rnd(0, 2)]; const s = rnd(10, 50);
    seq = [s, s + step, s + 2 * step, s + 3 * step]; ans = s + 4 * step;
  } else if (d <= 4) {
    step = [1, 2, 5][rnd(0, 2)]; const s = rnd(20, 50);
    seq = [s, s - step, s - 2 * step, s - 3 * step]; ans = Math.max(0, s - 4 * step);
  } else {
    const s = rnd(1, 4);
    seq = [s, s * 2, s * 4, s * 8]; ans = s * 16;
    step = s;
  }
  const show = seq.slice(-4).join(', ');
  return makeQ(`${show}, ?`, ans, nearMiss(ans, [step || 1, 1]), nearMiss(ans, [2, step || 2]), 'pattern');
}

function genMoney(d) {
  if (d <= 2) {
    const prices = [50, 75, 100, 150, 200, 250];
    const price = prices[rnd(0, prices.length - 1)];
    const pay = price <= 100 ? 200 : 500;
    const ans = pay - price;
    const displayPrice = price >= 100 ? `$${(price / 100).toFixed(2)}` : `${price}c`;
    const displayPay = `$${(pay / 100).toFixed(2)}`;
    return makeQ(`Pay ${displayPay} for ${displayPrice}. Change?`, ans, ans + 25, nearMiss(ans, [25, 50]), 'money');
  } else {
    const a = rnd(1, 9) * 100 + [0, 25, 50, 75][rnd(0, 3)];
    const b = rnd(1, 9) * 100 + [0, 25, 50, 75][rnd(0, 3)];
    const ans = (a + b) / 100;
    return makeQ(`$${(a / 100).toFixed(2)} + $${(b / 100).toFixed(2)} = ?`, ans, (a + b + 25) / 100, nearMiss(ans, [0.25, 0.5, 1]), 'money');
  }
}

function genTime(d) {
  const stHour = rnd(1, 11);
  const stMin  = [0, 15, 30, 45][rnd(0, 3)];
  const addMin = [15, 30, 45, 60, 90][clamp(d - 1, 0, 4)];
  const totalMin = stHour * 60 + stMin + addMin;
  const endH = Math.floor(totalMin / 60) % 12 || 12;
  const endM = totalMin % 60;
  const fmt = m => String(m).padStart(2, '0');
  const ans = `${endH}:${fmt(endM)}`;
  return makeQ(
    `${stHour}:${fmt(stMin)} + ${addMin} min = ?`,
    ans,
    `${endH}:${fmt((endM + 15) % 60)}`,
    `${endH}:${fmt((endM + 60 - 15) % 60)}`,
    'time'
  );
}

function genStatistics(d) {
  if (d <= 3) {
    const count = rnd(3, 4);
    const vals = Array.from({ length: count }, () => rnd(1, d <= 2 ? 10 : 20));
    const sum  = vals.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    if (!Number.isInteger(mean)) { return genStatistics(d); }
    return makeQ(`Mean of ${vals.join(', ')} = ?`, mean, mean + 1, mean - 1 >= 0 ? mean - 1 : mean + 2, 'statistics');
  } else {
    const base = rnd(2, 8);
    const vals = shuffle([base, base, base + 1, base + 2, base - 1 >= 1 ? base - 1 : base + 3]);
    return makeQ(`Mode of ${vals.join(', ')} = ?`, base, base + 1, base + 2, 'statistics');
  }
}

function genProbability(d) {
  const total = rnd(6, 10);
  const favourable = rnd(1, total - 1);
  const ans = `${favourable}/${total}`;
  const wrong1 = `${favourable + 1}/${total}`;
  const wrong2 = `${favourable}/${total + 1}`;
  return makeQ(`${favourable} red, ${total - favourable} blue. P(red)?`, ans, wrong1, wrong2, 'probability');
}

function genDecimal(d) {
  const a = rnd(1, 9) + rnd(0, 9) / 10;
  const b = rnd(1, 9) + rnd(0, 9) / 10;
  const ans = Math.round((a + b) * 10) / 10;
  return makeQ(`${a.toFixed(1)} + ${b.toFixed(1)} = ?`, ans, Math.round((a + b + 0.1) * 10) / 10, Math.round((a + b - 0.1) * 10) / 10, 'decimal');
}

// ============================================================
// STAR FIELD
// ============================================================
const STARS = Array.from({ length: 130 }, () => ({
  x: Math.random(), y: Math.random(),
  r: rndF(0.4, 1.8),
  bright: rndF(0.3, 0.9),
  spd: rndF(0.04, 0.18)
}));
let starOffY = 0;

// ============================================================
// PARTICLES
// ============================================================
let parts = [];

function spawnParts(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i / count) + rndF(-0.4, 0.4);
    const spd = rndF(70, 240);
    parts.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      color, alpha: 1, r: rndF(3, 8), life: rndF(0.4, 0.9) });
  }
}

function updateParts(dt) {
  parts = parts.filter(p => p.alpha > 0.02);
  for (const p of parts) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 70 * dt;
    p.alpha -= dt / p.life;
  }
}

// ============================================================
// GAME STATE
// ============================================================
let gs = {};

function laneX(lane) { return LW * lane + LW / 2; }

function initState() {
  const ab   = CFG.ageBands[gs.ageBandId];
  const mode = CFG.modes[gs.modeId];
  const saved = loadStats();
  // Cache upgrade levels so we don't hit localStorage every frame
  const cachedUpgrades = saved.upgrades || {};
  const scMax = getShieldMax(cachedUpgrades);

  Object.assign(gs, {
    // shield
    shield: scMax,
    // score
    score: 0, xp: 0, coins: 0,
    // combo / fever
    combo: 0, bestCombo: 0,
    fever: false, feverTimer: 0, feverFlash: 0,
    comboDecayTimer: 0,
    feverTotal: 0,
    // difficulty / adaptive
    difficulty: ab.diffStart, diffMax: ab.diffMax,
    recentAnswers: [],
    // ship
    shipLane: 1, shipX: laneX(1), shipTargetX: laneX(1),
    // meteors
    meteors: [],
    questionAnswered: false,
    wave: 0,
    questionStartTime: 0,
    // timing
    running: true, ended: false,
    gameTime: 0,
    timeLimitSec: mode.durationSec,
    hasFailure: mode.hasFailure,
    shieldDrain: mode.shieldDrain,
    meteorSpeed: ab.speed * mode.speedMult,
    // stats
    totalCorrect: 0, totalWrong: 0,
    levelXP: 0, level: 1,
    // FX
    shakeTimer: 0, shakeX: 0, shakeY: 0,
    levelUpAnim: 0,
    // cached upgrade levels (avoid repeated localStorage reads during gameplay)
    upgrades: cachedUpgrades,
    // second chance upgrade
    secondChanceLeft: (cachedUpgrades['second_chance'] || 0),
    // slow time upgrade
    slowTimeActive: false, slowTimeTimer: 0,
    // mission tracking
    missionId: gs.missionId || null,
    missionCompleted: false,
    missionProgress: null,
    // strand stats for this run
    runStrandStats: {}
  });

  gs.missionProgress = initMissionProgress(gs.missionId);
  parts = [];
  starOffY = 0;
  spawnQuestion();
}

// ============================================================
// QUESTION FLOW
// ============================================================
function spawnQuestion() {
  gs.currentQ = generateQuestion(gs.ageBandId, gs.difficulty);
  gs.questionAnswered = false;
  gs.questionStartTime = gs.gameTime;
  spawnMeteors(gs.currentQ);
  gs.wave++;
  gs.meteorSpeed = Math.min(
    CFG.meteor.maxSpeed,
    CFG.ageBands[gs.ageBandId].speed * CFG.modes[gs.modeId].speedMult + gs.wave * CFG.meteor.speedPerWave
  );

  // Apply eliminate_one upgrade
  const elimLv = upgLevel('eliminate_wrong');
  if (elimLv > 0) {
    const everyN = UPGRADES.find(u => u.id === 'eliminate_wrong').effect.everyN;
    if (gs.wave % everyN === 0) {
      const wrongMeteors = gs.meteors.filter(m => !m.isCorrect);
      if (wrongMeteors.length > 0) {
        wrongMeteors[rnd(0, wrongMeteors.length - 1)].eliminated = true;
      }
    }
  }
}

function spawnMeteors(q) {
  gs.meteors = [0, 1, 2].map(lane => ({
    lane,
    x: laneX(lane),
    y: -(MR * 2),
    answer: q.options[lane],
    isCorrect: q.options[lane] === q.answer,
    speed: gs.meteorSpeed,
    alive: true,
    flash: 0, flashCol: null,
    wobble: rndF(0, Math.PI * 2),
    eliminated: false
  }));
}

// ============================================================
// ANSWER HANDLING
// ============================================================
function onCorrect(m) {
  gs.questionAnswered = true;
  gs.totalCorrect++;
  gs.combo = Math.floor(gs.combo) + 1;
  if (gs.combo > gs.bestCombo) gs.bestCombo = gs.combo;
  gs.comboDecayTimer = 0;

  // Fever?
  const ft = CFG.combo.feverThresholds;
  if (ft.includes(gs.combo) || (gs.combo > ft[ft.length - 1])) {
    if (!gs.fever) {
      gs.feverTotal++;
      updateMission('fever', null);
    }
    gs.fever = true;
    gs.feverTimer = CFG.combo.feverDuration;
  }

  // Shield up (with shield_regen upgrade)
  const regenBonus = upgLevel('shield_regen') * 6;
  gs.shield = Math.min(getShieldMax(), gs.shield + CFG.shield.rechargeOnCorrect + regenBonus);

  // Score & XP
  const fm = gs.fever ? 2 : 1;
  const cm = Math.min(CFG.scoring.xpMaxMult, 1 + (gs.combo - 1) * CFG.scoring.xpComboStep);
  gs.score += Math.round(10 * fm * cm);

  // XP with xp_boost upgrade
  let xpGained = Math.round(CFG.scoring.xpPerCorrect * cm * Math.pow(1.25, upgLevel('xp_boost')));
  // Speed bonus XP
  const elapsed = gs.gameTime - gs.questionStartTime;
  if (elapsed < 3) { xpGained += CFG.scoring.speedBonusXP; }
  gs.xp += xpGained;

  // Coins with coin_magnet upgrade
  gs.coins += Math.round(CFG.scoring.coinsPerCorrect * fm) + upgLevel('coin_magnet') * 3;

  // Slow time upgrade: activate on combo streak >= streakNeeded
  const slowLv = upgLevel('slow_time');
  if (slowLv > 0 && gs.combo >= 3 && !gs.slowTimeActive) {
    gs.slowTimeActive = true;
    gs.slowTimeTimer = UPGRADES.find(u => u.id === 'slow_time').effect.duration;
  }

  checkLevelUp();
  adaptDifficulty(1);
  updateMission('correct', m);

  // Track strand stats
  if (gs.currentQ) {
    const t = gs.currentQ.type;
    if (!gs.runStrandStats[t]) gs.runStrandStats[t] = { correct: 0, total: 0 };
    gs.runStrandStats[t].correct++;
    gs.runStrandStats[t].total++;
  }

  spawnParts(m.x, m.y, gs.fever ? '#ffd600' : '#69f0ae', gs.fever ? 18 : 11);
  m.flash = 0.6; m.flashCol = '#69f0ae';
  flashScreen('correct');
}

function onWrong(m) {
  // Second chance upgrade
  if (upgLevel('second_chance') > 0 && gs.secondChanceLeft > 0) {
    gs.secondChanceLeft--;
    spawnParts(m.x, m.y, '#ffd600', 6);
    m.flash = 0.6; m.flashCol = '#ffd600';
    gs.questionAnswered = true;
    gs.totalWrong++;
    gs.combo = 0;
    gs.fever = false; gs.feverTimer = 0;
    adaptDifficulty(0);
    // Track strand stats
    if (gs.currentQ) {
      const t = gs.currentQ.type;
      if (!gs.runStrandStats[t]) gs.runStrandStats[t] = { correct: 0, total: 0 };
      gs.runStrandStats[t].total++;
    }
    showTip(gs.currentQ);
    return;
  }

  gs.questionAnswered = true;
  gs.totalWrong++;
  gs.combo = 0;
  gs.fever = false; gs.feverTimer = 0;

  gs.shield = Math.max(0, gs.shield - CFG.shield.penaltyOnWrong);
  adaptDifficulty(0);
  gs.shakeTimer = 0.45;

  // Track strand stats (wrong)
  if (gs.currentQ) {
    const t = gs.currentQ.type;
    if (!gs.runStrandStats[t]) gs.runStrandStats[t] = { correct: 0, total: 0 };
    gs.runStrandStats[t].total++;
  }

  spawnParts(m.x, m.y, '#ff1744', 8);
  m.flash = 0.6; m.flashCol = '#ff1744';
  flashScreen('wrong');
  showTip(gs.currentQ);

  if (gs.shield <= 0 && gs.hasFailure) {
    setTimeout(() => endGame(false), GAME_OVER_DELAY_MS);
  }
}

function checkLevelUp() {
  const t = CFG.levelThresholds;
  const prevLevel = gs.level;
  while (gs.level < t.length - 1 && gs.xp >= t[gs.level]) gs.level++;
  if (gs.level > prevLevel) {
    gs.levelUpAnim = 2.0;
    updateMission('level', null);
  }
}

function adaptDifficulty(correct) {
  gs.recentAnswers.push(correct);
  const w = CFG.adaptive.window;
  if (gs.recentAnswers.length < w) return;
  const slice = gs.recentAnswers.slice(-w);
  const acc = slice.reduce((s, v) => s + v, 0) / w;
  if (acc >= CFG.adaptive.upIfAbove) {
    gs.difficulty = Math.min(gs.diffMax, gs.difficulty + 1);
  } else if (acc <= CFG.adaptive.downIfBelow) {
    gs.difficulty = Math.max(CFG.adaptive.diffMin, gs.difficulty - 1);
  }
}

function flashScreen(type) {
  const el = document.getElementById('flash');
  el.className = type;
  setTimeout(() => { if (el.className === type) el.className = ''; }, 180);
}

// ============================================================
// MISSION TRACKING
// ============================================================
function initMissionProgress(missionId) {
  if (!missionId) return null;
  return {
    streak: 0,
    correctInRun: 0,
    coinsInRun: 0,
    feverInRun: 0,
    shieldHighCount: 0,
    strandInRun: {},
    typeCorrect: {}
  };
}

function updateMission(event, m) {
  if (!gs.missionId || gs.missionCompleted) return;
  const mission = MISSIONS.find(ms => ms.id === gs.missionId);
  if (!mission) return;
  const mp = gs.missionProgress;
  const goal = mission.goal;

  if (event === 'correct') {
    mp.correctInRun++;
    mp.streak++;
    mp.coinsInRun = gs.coins;
    // Track type
    if (gs.currentQ) {
      const t = gs.currentQ.type;
      mp.typeCorrect[t] = (mp.typeCorrect[t] || 0) + 1;
      // Number strand: add, sub, mul, div, decimal
      const numberTypes = ['add', 'sub', 'mul', 'div', 'decimal'];
      if (numberTypes.includes(t)) {
        mp.strandInRun['number'] = (mp.strandInRun['number'] || 0) + 1;
      }
    }
    // Shield above check
    if (gs.shield > (goal.threshold || 75)) {
      mp.shieldHighCount++;
    }
    // Fever tracking: check if fever just triggered
    if (gs.fever) {
      // tracked in onCorrect via feverTotal
    }
  } else if (event === 'wrong') {
    mp.streak = 0;
  } else if (event === 'fever') {
    mp.feverInRun++;
  } else if (event === 'level') {
    // level up handled below
  }

  checkMissionComplete(mission, mp);
}

function checkMissionComplete(mission, mp) {
  if (gs.missionCompleted) return;
  const goal = mission.goal;
  const saved = loadStats();
  let done = false;

  switch (goal.type) {
    case 'correct_answers': done = mp.correctInRun >= goal.target; break;
    case 'streak':          done = mp.streak >= goal.target; break;
    case 'coins_in_run':    done = mp.coinsInRun >= goal.target; break;
    case 'correct_in_run':  done = mp.correctInRun >= goal.target; break;
    case 'fever_triggers':  done = gs.feverTotal >= goal.target; break;
    case 'fever_in_run':    done = mp.feverInRun >= goal.target; break;
    case 'correct_total':   done = ((saved.totalCorrect || 0) + gs.totalCorrect) >= goal.target; break;
    case 'strand_in_run':   done = (mp.strandInRun[goal.strand] || 0) >= goal.target; break;
    case 'type_correct':    done = (mp.typeCorrect[goal.questionType] || 0) >= goal.target; break;
    case 'reach_level':     done = gs.level >= goal.target; break;
    case 'shield_above':    done = mp.shieldHighCount >= goal.count; break;
  }

  if (done) {
    gs.missionCompleted = true;
    // Award rewards
    const r = mission.rewards;
    gs.xp    += r.xp || 0;
    gs.coins += r.coins || 0;
    // Save mission completion
    saved.completedMissions = saved.completedMissions || [];
    if (!saved.completedMissions.includes(mission.id)) {
      saved.completedMissions.push(mission.id);
    }
    // Unlock ship if specified
    if (mission.unlocks) {
      saved.unlockedShips = saved.unlockedShips || ['scout'];
      if (!saved.unlockedShips.includes(mission.unlocks)) {
        saved.unlockedShips.push(mission.unlocks);
      }
    }
    saveStats(saved);
  }
}

// ============================================================
// PERSISTENCE
// ============================================================
function loadStats() {
  try { return JSON.parse(localStorage.getItem('mmsr_stats') || '{}'); }
  catch { return {}; }
}

function saveStats(s) {
  try { localStorage.setItem('mmsr_stats', JSON.stringify(s)); } catch { }
}

function checkShipUnlocks() {
  const saved = loadStats();
  saved.unlockedShips = saved.unlockedShips || ['scout'];
  let changed = false;

  for (const ship of SHIPS) {
    if (ship.unlockCondition === 'default') continue;
    if (saved.unlockedShips.includes(ship.id)) continue;
    const cond = ship.unlockCondition;
    let unlock = false;
    if      (cond.type === 'level'         && (saved.level || 1) >= cond.value)        unlock = true;
    else if (cond.type === 'correct_total' && (saved.totalCorrect || 0) >= cond.value) unlock = true;
    else if (cond.type === 'fever_total'   && (saved.feverTotal || 0) >= cond.value)   unlock = true;
    else if (cond.type === 'streak'        && (saved.bestCombo || 0) >= cond.value)    unlock = true;
    if (unlock) { saved.unlockedShips.push(ship.id); changed = true; }
  }
  if (changed) saveStats(saved);
}

// ============================================================
// UPGRADE HELPERS
// ============================================================
// Use cached upgrade levels from gs.upgrades when in-game, else read from localStorage
function upgLevel(id) {
  if (gs.upgrades) return (gs.upgrades[id] || 0);
  return (loadStats().upgrades || {})[id] || 0;
}

function getShieldMax(overrideUpgrades) {
  const lv = overrideUpgrades ? (overrideUpgrades['shield_boost'] || 0) : upgLevel('shield_boost');
  return Math.round(CFG.shield.max * Math.pow(1.20, lv));
}

function getDrainMult() {
  const lv = upgLevel('slow_drain');
  return lv ? Math.pow(0.85, lv) : 1;
}

function getShipColor() {
  const saved = loadStats();
  const shipId = saved.selectedShip || 'scout';
  const ship = SHIPS.find(s => s.id === shipId) || SHIPS[0];
  return { color: ship.color, trailColor: ship.trailColor };
}

// ============================================================
// GAME LOOP
// ============================================================
let canvas, ctx, afId, lastTS;

function startLoop() {
  lastTS = null;
  afId = requestAnimationFrame(loop);
}

function loop(ts) {
  if (!lastTS) lastTS = ts;
  const dt = Math.min((ts - lastTS) / 1000, 0.05);
  lastTS = ts;
  update(dt);
  render();
  afId = requestAnimationFrame(loop);
}

function update(dt) {
  if (!gs.running || gs.ended) return;

  gs.gameTime += dt;

  // Time limit
  if (gs.timeLimitSec < Infinity && gs.gameTime >= gs.timeLimitSec) {
    endGame(true); return;
  }

  // Screen shake
  if (gs.shakeTimer > 0) {
    gs.shakeTimer -= dt;
    const mag = gs.shakeTimer * 12;
    gs.shakeX = rndF(-mag, mag);
    gs.shakeY = rndF(-mag, mag);
  } else { gs.shakeX = 0; gs.shakeY = 0; }

  // Fever
  if (gs.fever) {
    gs.feverTimer -= dt;
    if (gs.feverTimer <= 0) { gs.fever = false; }
    gs.feverFlash = (gs.feverFlash + dt * 3.5) % (Math.PI * 2);
  }

  // Shield drain
  if (gs.shieldDrain) {
    const drain = CFG.shield.drainPerSec * (gs.fever ? CFG.shield.feverDrainMult : 1) * getDrainMult() * dt;
    gs.shield = Math.max(0, gs.shield - drain);
    if (gs.shield <= 0 && gs.hasFailure) { endGame(false); return; }
  }

  // Combo decay (with combo_decay upgrade)
  if (gs.combo > 0) {
    gs.comboDecayTimer += dt;
    const decayMult = Math.pow(0.7, upgLevel('combo_decay'));
    if (gs.comboDecayTimer > CFG.combo.decayDelay) {
      gs.combo = Math.max(0, gs.combo - CFG.combo.decayRate * decayMult * dt);
    }
  }

  // Slow time upgrade timer
  if (gs.slowTimeActive) {
    gs.slowTimeTimer -= dt;
    if (gs.slowTimeTimer <= 0) { gs.slowTimeActive = false; }
  }

  // Level-up animation timer
  if (gs.levelUpAnim > 0) { gs.levelUpAnim -= dt; }

  // Ship movement lerp
  const shipSpd = 900;
  const diff = gs.shipTargetX - gs.shipX;
  gs.shipX += Math.sign(diff) * Math.min(Math.abs(diff), shipSpd * dt);
  if (Math.abs(diff) < 1) gs.shipX = gs.shipTargetX;

  // Star scroll
  starOffY = (starOffY + 60 * dt) % 1;

  updateMeteors(dt);
  updateParts(dt);
}

function updateMeteors(dt) {
  let anyAlive = false;
  const slowMult = gs.slowTimeActive ? UPGRADES.find(u => u.id === 'slow_time').effect.speedMultiplier : 1;

  for (const m of gs.meteors) {
    if (!m.alive) continue;
    anyAlive = true;
    m.y += m.speed * slowMult * dt;
    m.wobble += dt * 1.6;
    if (m.flash > 0) m.flash = Math.max(0, m.flash - dt * 2.5);

    const hitY = SHIP_Y - SHIP_H / 2 - MR;
    if (!gs.questionAnswered && m.y >= hitY && m.lane === gs.shipLane) {
      m.isCorrect ? onCorrect(m) : onWrong(m);
    }

    if (m.y > GH + MR + 10) m.alive = false;
  }

  if (!anyAlive && !gs.ended) {
    if (!gs.questionAnswered) { gs.combo = 0; }
    spawnQuestion();
  }
}

// ============================================================
// RENDERING
// ============================================================
function render() {
  if (!ctx) return;
  ctx.save();
  ctx.translate(gs.shakeX || 0, gs.shakeY || 0);

  drawBg();
  drawLanes();
  drawMeteors();
  drawShip();
  drawParts();
  drawHUD();
  if (gs.fever) drawFeverBorder();

  ctx.restore();
}

function drawBg() {
  ctx.fillStyle = '#050a1a';
  ctx.fillRect(0, 0, GW, GH);
  for (const s of STARS) {
    const y = ((s.y + starOffY * s.spd) % 1) * GH;
    ctx.beginPath();
    ctx.arc(s.x * GW, y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.bright})`;
    ctx.fill();
  }
}

function drawLanes() {
  ctx.strokeStyle = 'rgba(0,229,255,0.09)';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 18]);
  for (let i = 1; i < LANES; i++) {
    ctx.beginPath();
    ctx.moveTo(i * LW, 0);
    ctx.lineTo(i * LW, GH);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  for (let i = 0; i < LANES; i++) {
    const cx = laneX(i);
    const active = i === gs.shipLane;
    ctx.fillStyle = active ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.02)';
    ctx.fillRect(i * LW + 2, GH - 55, LW - 4, 52);
    ctx.strokeStyle = active ? 'rgba(0,229,255,0.25)' : 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.strokeRect(i * LW + 2, GH - 55, LW - 4, 52);
    ctx.fillStyle = active ? 'rgba(0,229,255,0.7)' : 'rgba(255,255,255,0.18)';
    ctx.font = '700 13px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(['←', '↓', '→'][i], cx, GH - 29);
  }
}

function drawMeteors() {
  for (const m of gs.meteors) {
    if (!m.alive) continue;

    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(Math.sin(m.wobble) * 0.05);

    // Eliminated meteors: draw dimmed with X
    if (m.eliminated) {
      ctx.globalAlpha = 0.35;
    }

    const grad = ctx.createRadialGradient(-MR * 0.3, -MR * 0.3, 2, 0, 0, MR);
    if (m.flash > 0 && m.flashCol) {
      const a = Math.round(m.flash * 255).toString(16).padStart(2, '0');
      grad.addColorStop(0, m.flashCol);
      grad.addColorStop(1, m.flashCol + a);
    } else {
      grad.addColorStop(0, '#4a3a28');
      grad.addColorStop(0.55, '#2c1e10');
      grad.addColorStop(1, '#160d06');
    }
    ctx.beginPath();
    ctx.arc(0, 0, MR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, MR + 5, 0, Math.PI * 2);
    ctx.strokeStyle = m.isCorrect ? 'rgba(0,229,255,0.18)' : 'rgba(255,80,40,0.14)';
    ctx.lineWidth = 3;
    ctx.stroke();

    const text = String(m.answer);
    const fs = text.length > 6 ? 16 : text.length > 4 ? 20 : text.length > 2 ? 24 : 28;
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${fs}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
    ctx.fillText(text, 0, 0);
    ctx.shadowBlur = 0;

    // Draw X over eliminated meteors
    if (m.eliminated) {
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-MR * 0.4, -MR * 0.4); ctx.lineTo(MR * 0.4, MR * 0.4);
      ctx.moveTo(MR * 0.4, -MR * 0.4); ctx.lineTo(-MR * 0.4, MR * 0.4);
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawShip() {
  const x = gs.shipX;
  const y = SHIP_Y;
  const w = SHIP_W;
  const h = SHIP_H;
  const { color: shipColor, trailColor } = getShipColor();

  ctx.save();
  ctx.translate(x, y);

  const flameH = 18 + Math.sin(gs.gameTime * 12) * 7;
  const fg = ctx.createLinearGradient(0, h * 0.22, 0, h * 0.22 + flameH + 10);
  fg.addColorStop(0, '#ffffff');
  fg.addColorStop(0.3, gs.fever ? '#ffd600' : shipColor);
  fg.addColorStop(1, 'transparent');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.ellipse(0, h * 0.22 + flameH * 0.5, w * 0.18, flameH * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  const tg = ctx.createLinearGradient(0, h * 0.18, 0, h * 0.9);
  tg.addColorStop(0, gs.fever ? 'rgba(255,214,0,0.6)' : (trailColor + '80'));
  tg.addColorStop(1, 'transparent');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(-w * 0.15, h * 0.22);
  ctx.lineTo(w * 0.15, h * 0.22);
  ctx.lineTo(0, h * 0.85);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = gs.fever ? '#ffd600' : shipColor;
  ctx.shadowColor = gs.fever ? 'rgba(255,214,0,0.6)' : (shipColor + '80');
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.5);
  ctx.bezierCurveTo(w * 0.28, -h * 0.08, w * 0.45, h * 0.18, w * 0.38, h * 0.28);
  ctx.lineTo(w * 0.5, h * 0.45);
  ctx.lineTo(w * 0.32, h * 0.3);
  ctx.lineTo(w * 0.18, h * 0.48);
  ctx.lineTo(-w * 0.18, h * 0.48);
  ctx.lineTo(-w * 0.32, h * 0.3);
  ctx.lineTo(-w * 0.5, h * 0.45);
  ctx.lineTo(-w * 0.38, h * 0.28);
  ctx.bezierCurveTo(-w * 0.45, h * 0.18, -w * 0.28, -h * 0.08, 0, -h * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#020d20';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.1, w * 0.14, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,229,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(-w * 0.04, -h * 0.13, w * 0.08, h * 0.11, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawParts() {
  for (const p of parts) {
    ctx.save();
    ctx.globalAlpha = clamp(p.alpha, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawHUD() {
  // ── Shield bar ─────────────────────────────────────────────
  const bx = 16, by = 14, bw = GW - 32, bh = 14;
  const shMax = getShieldMax();
  const pct = gs.shield / shMax;
  const shCol = pct > 0.5 ? '#69f0ae' : pct > CFG.shield.criticalPct ? '#ffd600' : '#ff1744';

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  rrect(bx, by, bw, bh, 7);
  ctx.fill();

  if (pct > 0) {
    const fg = ctx.createLinearGradient(bx, 0, bx + bw * pct, 0);
    fg.addColorStop(0, shCol);
    fg.addColorStop(1, shCol + '99');
    ctx.fillStyle = fg;
    rrect(bx, by, Math.max(bh, bw * pct), bh, 7);
    ctx.fill();
  }

  ctx.fillStyle = '#fff';
  ctx.font = '600 12px system-ui';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('🛡 ' + Math.ceil(gs.shield), bx, by - 8);

  if (pct <= CFG.shield.criticalPct) {
    const alpha = 0.5 + 0.5 * Math.sin(gs.gameTime * 9);
    ctx.fillStyle = `rgba(255,23,68,${alpha})`;
    ctx.font = '700 11px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('⚠ LOW', GW - 16, by - 8);
  }

  // ── Score (right) ──────────────────────────────────────────
  ctx.fillStyle = '#ffd600';
  ctx.font = '900 24px system-ui';
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillText(gs.score.toLocaleString(), GW - 14, 34);

  // ── Level (left) ───────────────────────────────────────────
  ctx.fillStyle = '#7ab0c8';
  ctx.font = '600 12px system-ui';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('LVL ' + gs.level, 16, 34);

  // ── Combo ──────────────────────────────────────────────────
  if (gs.combo >= 2) {
    ctx.fillStyle = gs.fever ? '#ffd600' : '#00e5ff';
    ctx.font = '700 13px system-ui';
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('x' + Math.floor(gs.combo) + ' COMBO', GW - 14, 62);
  }

  // ── Coins ──────────────────────────────────────────────────
  ctx.fillStyle = '#ffd600';
  ctx.font = '600 12px system-ui';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('🪙 ' + gs.coins, 16, 52);

  // ── Timer (Quick Run) ──────────────────────────────────────
  if (gs.timeLimitSec < Infinity) {
    const rem = Math.max(0, gs.timeLimitSec - gs.gameTime);
    const mm = Math.floor(rem / 60);
    const ss = String(Math.floor(rem % 60)).padStart(2, '0');
    const urgent = rem < 30;
    ctx.fillStyle = urgent ? '#ff1744' : '#ffffff';
    ctx.font = `700 ${urgent ? 18 : 15}px system-ui`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(`${mm}:${ss}`, GW / 2, 34);
  }

  // ── Question prompt ────────────────────────────────────────
  if (gs.currentQ) {
    const text = gs.currentQ.prompt;
    const px = 18, py = 82, pw = GW - 36, pht = 50;

    ctx.fillStyle = 'rgba(10,22,56,0.88)';
    rrect(px, py, pw, pht, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,229,255,0.28)';
    ctx.lineWidth = 1.5;
    rrect(px, py, pw, pht, 12);
    ctx.stroke();

    const fs = text.length > 22 ? 16 : text.length > 12 ? 20 : 24;
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${fs}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 3;
    ctx.fillText(text, GW / 2, py + pht / 2);
    ctx.shadowBlur = 0;
  }

  // ── Fever banner ───────────────────────────────────────────
  if (gs.fever) {
    const a = 0.18 + 0.1 * Math.sin(gs.feverFlash);
    ctx.fillStyle = `rgba(255,214,0,${a})`;
    ctx.fillRect(0, 0, GW, GH);
    ctx.fillStyle = '#ffd600';
    ctx.font = '900 19px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('🔥 FEVER MODE! 🔥', GW / 2, 62);
  }

  // ── Level-up banner ────────────────────────────────────────
  if (gs.levelUpAnim > 0) {
    const alpha = Math.min(1, gs.levelUpAnim);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,229,255,0.85)';
    rrect(GW / 2 - 110, GH / 2 - 30, 220, 60, 14);
    ctx.fill();
    ctx.fillStyle = '#020b1a';
    ctx.font = '900 22px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`LEVEL UP! 🎉 LVL ${gs.level}`, GW / 2, GH / 2);
    ctx.restore();
  }

  // ── Slow time indicator ────────────────────────────────────
  if (gs.slowTimeActive) {
    ctx.fillStyle = 'rgba(100,100,255,0.7)';
    ctx.font = '700 11px system-ui';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('🌀 SLOW', 16, 68);
  }

  // ── Mission indicator ──────────────────────────────────────
  if (gs.missionId && !gs.missionCompleted) {
    const mission = MISSIONS.find(m => m.id === gs.missionId);
    if (mission) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      rrect(GW / 2 - 80, GH - 52, 160, 24, 8);
      ctx.fill();
      ctx.fillStyle = '#ffd600';
      ctx.font = '600 11px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`🎯 ${mission.title}`, GW / 2, GH - 40);
    }
  }
  if (gs.missionId && gs.missionCompleted) {
    ctx.fillStyle = 'rgba(105,240,174,0.9)';
    ctx.font = '700 13px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('✅ MISSION COMPLETE!', GW / 2, GH - 52);
  }
}

function drawFeverBorder() {
  for (let i = 0; i < 3; i++) {
    const hue = (gs.gameTime * 130 + i * 120) % 360;
    ctx.strokeStyle = `hsla(${hue},100%,65%,0.3)`;
    ctx.lineWidth = 4;
    ctx.strokeRect(i * 3, i * 3, GW - i * 6, GH - i * 6);
  }
}

function rrect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ============================================================
// END GAME
// ============================================================
const GAME_OVER_DELAY_MS = 550;
const END_SCREEN_DELAY_MS = 420;

let endScheduled = false;

function endGame(completed) {
  if (endScheduled || gs.ended) return;
  endScheduled = true;
  gs.ended = true;
  cancelAnimationFrame(afId);

  // Persist stats
  const saved = loadStats();
  if (gs.score > (saved.bestScore || 0)) saved.bestScore = gs.score;
  saved.totalCorrect = (saved.totalCorrect || 0) + gs.totalCorrect;
  saved.coins        = (saved.coins || 0) + gs.coins;
  saved.xp           = (saved.xp || 0) + gs.xp;
  saved.feverTotal   = (saved.feverTotal || 0) + gs.feverTotal;
  // Update persistent level from XP
  const t = CFG.levelThresholds;
  let lv = 1;
  while (lv < t.length - 1 && saved.xp >= t[lv]) lv++;
  saved.level = lv;

  // Strand stats — merge run stats into persistent record
  saved.strandStats = saved.strandStats || {};
  Object.entries(gs.runStrandStats || {}).forEach(([type, d]) => {
    if (!saved.strandStats[type]) saved.strandStats[type] = { correct: 0, total: 0 };
    saved.strandStats[type].correct += d.correct;
    saved.strandStats[type].total   += d.total;
  });

  checkShipUnlocks();
  saveStats(saved);

  setTimeout(() => completed ? showResults() : showGameOver(), END_SCREEN_DELAY_MS);
}

// ============================================================
// TEACHING TIPS
// ============================================================
function showTip(question) {
  if (!question) return;
  const tip = TIPS[question.type];
  const overlay = document.getElementById('tip-overlay');
  if (!overlay) return;

  const qEl = document.getElementById('tip-question');
  const ansEl = document.getElementById('tip-answer');
  const stratEl = document.getElementById('tip-strategy');

  if (qEl) qEl.textContent = question.prompt;
  if (ansEl) ansEl.textContent = `Answer: ${question.answer}`;
  if (stratEl) stratEl.textContent = tip ? tip.strategy : '';

  const stepsEl = document.getElementById('tip-steps');
  if (stepsEl) {
    if (tip && tip.example) {
      stepsEl.style.display = 'block';
      stepsEl.innerHTML = `<li>${tip.example}</li>`;
    } else {
      stepsEl.style.display = 'none';
    }
  }

  overlay.classList.remove('hidden');
}

function hideTip() {
  const overlay = document.getElementById('tip-overlay');
  if (overlay) overlay.classList.add('hidden');
}

// ============================================================
// SCREEN MANAGEMENT
// ============================================================
const ALL_SCREENS = [
  'screen-landing', 'screen-age', 'screen-mode',
  'screen-gameover', 'screen-results',
  'screen-missions', 'screen-upgrades', 'screen-cosmetics', 'screen-stats'
];

function showScreen(id) {
  ALL_SCREENS.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.add('hidden');
  });
  const gw = document.getElementById('game-wrap');
  if (gw) gw.classList.add('hidden');

  if (id === 'game') {
    if (gw) gw.classList.remove('hidden');
  } else {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }
}

function showGameOver() {
  document.getElementById('go-score').textContent   = gs.score.toLocaleString();
  document.getElementById('go-correct').textContent = gs.totalCorrect;
  document.getElementById('go-combo').textContent   = gs.bestCombo;
  document.getElementById('go-reason').textContent  = 'Your shield ran out!';
  const goXp = document.getElementById('go-xp');
  if (goXp) goXp.textContent = gs.xp;
  showScreen('screen-gameover');
}

function showResults() {
  const tot = gs.totalCorrect + gs.totalWrong;
  const acc = tot > 0 ? Math.round(gs.totalCorrect / tot * 100) : 0;
  document.getElementById('res-score').textContent   = gs.score.toLocaleString();
  document.getElementById('res-xp').textContent      = gs.xp;
  document.getElementById('res-coins').textContent   = gs.coins;
  document.getElementById('res-correct').textContent = gs.totalCorrect;
  document.getElementById('res-combo').textContent   = gs.bestCombo;
  document.getElementById('res-acc').textContent     = acc + '%';

  const saved = loadStats();
  const nb = document.getElementById('new-best');
  if (nb) nb.classList.toggle('hidden', gs.score < (saved.bestScore || 0));

  if (gs.missionCompleted && gs.missionId) {
    const mission = MISSIONS.find(m => m.id === gs.missionId);
    const mEl = document.getElementById('res-mission');
    if (mEl && mission) {
      mEl.textContent = `✅ Mission Complete: ${mission.title}!`;
      mEl.classList.remove('hidden');
    }
  }

  showScreen('screen-results');
}

function updateLanding() {
  const saved = loadStats();
  const el = document.getElementById('landing-info');
  if (!el) return;
  const parts = [];
  if (saved.bestScore) parts.push(`<span style="color:#ffd600;font-weight:700;">Best: ${saved.bestScore.toLocaleString()}</span>`);
  if (saved.level)     parts.push(`<span style="color:#00e5ff;">LVL ${saved.level}</span>`);
  if (saved.coins)     parts.push(`<span style="color:#ffd600;">🪙 ${saved.coins}</span>`);
  el.innerHTML = parts.join('  ·  ');
}

// ============================================================
// UPGRADES SCREEN
// ============================================================
const UPGRADE_CATEGORIES = [
  { id: 'survival',    label: '🛡️ Survival' },
  { id: 'speed_score', label: '⚡ Speed & Score' },
  { id: 'math_helper', label: '🔍 Math Help' }
];

function showUpgradesScreen() {
  renderUpgradeTabs();
  renderUpgradesList('survival');
  showScreen('screen-upgrades');
  updateShopCoins();
}

function updateShopCoins() {
  const saved = loadStats();
  const el = document.getElementById('shop-coins-display');
  if (el) el.innerHTML = `<span style="color:#ffd600;font-size:1.1rem;font-weight:700;">🪙 ${saved.coins || 0} coins</span>`;
}

function renderUpgradeTabs() {
  const container = document.getElementById('upgrade-tabs');
  if (!container) return;
  container.innerHTML = '';
  UPGRADE_CATEGORIES.forEach((cat, idx) => {
    const btn = document.createElement('button');
    btn.className = 'cat-tab' + (idx === 0 ? ' active' : '');
    btn.textContent = cat.label;
    btn.dataset.category = cat.id;
    btn.addEventListener('click', () => {
      container.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderUpgradesList(cat.id);
    });
    container.appendChild(btn);
  });
}

function renderUpgradesList(categoryId) {
  const container = document.getElementById('upgrades-list');
  if (!container) return;
  const saved = loadStats();
  const owned = saved.upgrades || {};
  const coins = saved.coins || 0;

  container.innerHTML = '';
  UPGRADES.filter(u => u.category === categoryId).forEach(upg => {
    const currentLv = owned[upg.id] || 0;
    const maxed = currentLv >= upg.maxLevel;
    const nextCost = maxed ? null : upg.cost[currentLv];
    const canAfford = !maxed && coins >= nextCost;

    const card = document.createElement('div');
    card.className = 'upgrade-card';
    card.innerHTML = `
      <div class="upgrade-icon">${upg.icon}</div>
      <div class="upgrade-info">
        <div class="upgrade-name">${upg.name} ${currentLv > 0 ? `<span class="upgrade-level">Lv ${currentLv}/${upg.maxLevel}</span>` : ''}</div>
        <div class="upgrade-desc">${upg.desc}</div>
      </div>
      <button class="btn-upgrade ${maxed ? 'maxed' : canAfford ? 'buyable' : 'locked'}" data-id="${upg.id}">
        ${maxed ? 'MAX' : `🪙 ${nextCost}`}
      </button>
    `;
    if (!maxed && canAfford) {
      card.querySelector('.btn-upgrade').addEventListener('click', () => buyUpgrade(upg.id));
    }
    container.appendChild(card);
  });
}

function buyUpgrade(id) {
  const upg = UPGRADES.find(u => u.id === id);
  if (!upg) return;
  const saved = loadStats();
  const owned = saved.upgrades || {};
  const currentLv = owned[id] || 0;
  if (currentLv >= upg.maxLevel) return;
  const cost = upg.cost[currentLv];
  if ((saved.coins || 0) < cost) return;

  saved.coins = (saved.coins || 0) - cost;
  owned[id] = currentLv + 1;
  saved.upgrades = owned;
  saveStats(saved);
  updateShopCoins();
  // Re-render current tab
  const activeTab = document.querySelector('#upgrade-tabs .cat-tab.active');
  const catId = activeTab ? (activeTab.dataset.category || 'survival') : 'survival';
  renderUpgradesList(catId);
}

// ============================================================
// COSMETICS SCREEN
// ============================================================
function showCosmeticsScreen() {
  renderShipsGrid();
  showScreen('screen-cosmetics');
}

function renderShipsGrid() {
  const container = document.getElementById('ships-grid');
  if (!container) return;
  const saved = loadStats();
  const unlocked = saved.unlockedShips || ['scout'];
  const selected = saved.selectedShip || 'scout';

  container.innerHTML = '';
  SHIPS.forEach(ship => {
    const isUnlocked = ship.unlockCondition === 'default' || unlocked.includes(ship.id);
    const isSelected = ship.id === selected;

    const card = document.createElement('div');
    card.className = `ship-card${isSelected ? ' selected' : ''}${!isUnlocked ? ' locked' : ''}`;
    card.style.setProperty('--ship-color', ship.color);

    let lockInfo = '';
    if (!isUnlocked && typeof ship.unlockCondition === 'object') {
      const c = ship.unlockCondition;
      if (c.type === 'level')         lockInfo = `Reach Level ${c.value}`;
      if (c.type === 'correct_total') lockInfo = `${c.value} correct answers`;
      if (c.type === 'streak')        lockInfo = `Streak of ${c.value}`;
      if (c.type === 'fever_total')   lockInfo = `Fever ${c.value} times`;
    }

    card.innerHTML = `
      <div class="ship-emoji">${ship.emoji}</div>
      <div class="ship-name">${ship.name}</div>
      ${isUnlocked
        ? `<div class="ship-status">${isSelected ? '✅ Selected' : '▶ Select'}</div>`
        : `<div class="ship-lock">🔒 ${lockInfo}</div>`}
    `;

    if (isUnlocked && !isSelected) {
      card.addEventListener('click', () => {
        saved.selectedShip = ship.id;
        saveStats(saved);
        renderShipsGrid();
      });
    }
    container.appendChild(card);
  });
}

// ============================================================
// MISSIONS SCREEN
// ============================================================
function showMissionsScreen() {
  renderMissionsList();
  showScreen('screen-missions');
  const saved = loadStats();
  const coinsEl = document.getElementById('missions-coins-display');
  if (coinsEl) coinsEl.textContent = `🪙 ${saved.coins || 0} coins`;
}

function renderMissionsList() {
  const container = document.getElementById('missions-list');
  if (!container) return;
  const saved = loadStats();
  const completed = saved.completedMissions || [];

  container.innerHTML = '';
  MISSIONS.forEach(m => {
    const isDone = completed.includes(m.id);
    const row = document.createElement('div');
    row.className = `mission-row${isDone ? ' done' : ''}`;

    const diffColor = { easy: '#69f0ae', medium: '#ffd600', hard: '#ff6b6b' };
    row.innerHTML = `
      <div class="mission-icon">${m.icon}</div>
      <div class="mission-info">
        <div class="mission-title">${m.title} <span class="mission-diff" style="color:${diffColor[m.difficulty] || '#fff'}">${m.difficulty}</span></div>
        <div class="mission-desc">${m.desc}</div>
        <div class="mission-rewards">+${m.rewards.xp} XP · 🪙 ${m.rewards.coins}${m.unlocks ? ' · 🚀 Unlock ship' : ''}</div>
      </div>
      <div class="mission-action">
        ${isDone
          ? '<span style="color:#69f0ae;font-size:1.4rem;">✅</span>'
          : `<button class="btn-start-mission" data-id="${m.id}">Start</button>`}
      </div>
    `;
    if (!isDone) {
      row.querySelector('.btn-start-mission').addEventListener('click', () => startMission(m.id));
    }
    container.appendChild(row);
  });
}

function startMission(missionId) {
  gs.missionId = missionId;
  gs.modeId    = 'mission';
  // Go to age select if no age band is set yet
  if (!gs.ageBandId) {
    showScreen('screen-age');
  } else {
    startGame();
  }
}

// ============================================================
// STATS SCREEN
// ============================================================
function showStatsScreen() {
  renderStats();
  showScreen('screen-stats');
}

function renderStats() {
  const saved = loadStats();
  const mainEl = document.getElementById('stats-main');
  if (mainEl) {
    mainEl.innerHTML = `
      <div class="stat"><div class="stat-val">${(saved.bestScore || 0).toLocaleString()}</div><div class="stat-label">Best Score</div></div>
      <div class="stat"><div class="stat-val">${saved.totalCorrect || 0}</div><div class="stat-label">Total Correct</div></div>
      <div class="stat"><div class="stat-val">🪙 ${saved.coins || 0}</div><div class="stat-label">Coins</div></div>
    `;
  }

  // Level / XP bar
  const lv = saved.level || 1;
  const xp = saved.xp || 0;
  const t = CFG.levelThresholds;
  const xpCur = xp - (t[lv - 1] || 0);
  const xpNxt = lv < t.length - 1 ? (t[lv] - (t[lv - 1] || 0)) : 1;
  const pct = Math.min(1, xpCur / xpNxt);
  const levelBarEl = document.getElementById('stats-level-bar');
  if (levelBarEl) {
    levelBarEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-weight:700;color:#00e5ff;">Level ${lv}</span>
        <span style="color:#7ab0c8;font-size:0.82rem;">${xpCur} / ${xpNxt} XP</span>
      </div>
      <div class="xp-bar-track">
        <div class="xp-bar-fill" style="width:${Math.round(pct * 100)}%"></div>
      </div>
    `;
  }

  // Strand stats
  const strandsEl = document.getElementById('stats-strands');
  if (strandsEl) {
    const ss = saved.strandStats || {};
    const labels = {
      add: 'Addition', sub: 'Subtraction', mul: 'Multiplication', div: 'Division',
      fraction: 'Fractions', algebra: 'Algebra', geometry: 'Geometry',
      pattern: 'Patterns', money: 'Money', time: 'Time', statistics: 'Statistics',
      probability: 'Probability', decimal: 'Decimals'
    };
    let html = '<div style="font-weight:700;margin-bottom:8px;color:#e8f4f8;">Strand Accuracy</div>';
    const keys = Object.keys(ss);
    if (keys.length === 0) {
      html += '<div style="color:#7ab0c8;font-size:0.85rem;">Play some games to see your stats!</div>';
    } else {
      keys.forEach(k => {
        const d = ss[k];
        const acc = d.total > 0 ? Math.round(d.correct / d.total * 100) : 0;
        const col = acc >= 80 ? '#69f0ae' : acc >= 60 ? '#ffd600' : '#ff6b6b';
        html += `
          <div class="strand-row">
            <span class="strand-label">${labels[k] || k}</span>
            <div class="strand-bar-wrap">
              <div class="strand-bar-fill" style="width:${acc}%;background:${col};"></div>
            </div>
            <span class="strand-pct" style="color:${col};">${acc}%</span>
          </div>`;
      });
    }
    strandsEl.innerHTML = html;
  }
}

// ============================================================
// INPUT
// ============================================================
function setLane(lane) {
  if (!gs.running || gs.ended) return;
  gs.shipLane = clamp(lane, 0, LANES - 1);
  gs.shipTargetX = laneX(gs.shipLane);
}

function setupInput() {
  const c = document.getElementById('canvas');

  c.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const rect = c.getBoundingClientRect();
    const x = (t.clientX - rect.left) / scale;
    setLane(x < LW ? 0 : x < LW * 2 ? 1 : 2);
  }, { passive: false });

  c.addEventListener('click', e => {
    const rect = c.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    setLane(x < LW ? 0 : x < LW * 2 ? 1 : 2);
  });

  document.addEventListener('keydown', e => {
    if (!gs.running) return;
    if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') setLane(gs.shipLane - 1);
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') setLane(gs.shipLane + 1);
    if (e.key === '1') setLane(0);
    if (e.key === '2') setLane(1);
    if (e.key === '3') setLane(2);
  });
}

// ============================================================
// CANVAS SETUP & SCALING
// ============================================================
let scale = 1;

function setupCanvas() {
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;
  const ratio = GW / GH;
  let w, h;
  if (maxW / maxH < ratio) { w = maxW; h = maxW / ratio; }
  else { h = maxH; w = maxH * ratio; }
  scale = w / GW;
  canvas.width  = GW;
  canvas.height = GH;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
}

// ============================================================
// BUTTON WIRING
// ============================================================
function wireButtons() {
  // Landing nav
  const btnPlay = document.getElementById('btn-play');
  if (btnPlay) btnPlay.addEventListener('click', () => showScreen('screen-age'));

  const btnMissions = document.getElementById('btn-missions');
  if (btnMissions) btnMissions.addEventListener('click', () => showMissionsScreen());

  const btnShop = document.getElementById('btn-shop');
  if (btnShop) btnShop.addEventListener('click', () => showUpgradesScreen());

  const btnCosmetics = document.getElementById('btn-cosmetics');
  if (btnCosmetics) btnCosmetics.addEventListener('click', () => showCosmeticsScreen());

  const btnStatsScreen = document.getElementById('btn-stats-screen');
  if (btnStatsScreen) btnStatsScreen.addEventListener('click', () => showStatsScreen());

  // Age screen
  const ageBack = document.getElementById('age-back');
  if (ageBack) ageBack.addEventListener('click', () => showScreen('screen-landing'));

  // Mode screen
  const modeBack = document.getElementById('mode-back');
  if (modeBack) modeBack.addEventListener('click', () => showScreen('screen-age'));

  // Secondary screens back buttons
  const missionsBack = document.getElementById('missions-back');
  if (missionsBack) missionsBack.addEventListener('click', () => showScreen('screen-landing'));

  const upgradesBack = document.getElementById('upgrades-back');
  if (upgradesBack) upgradesBack.addEventListener('click', () => showScreen('screen-landing'));

  const cosmeticsBack = document.getElementById('cosmetics-back');
  if (cosmeticsBack) cosmeticsBack.addEventListener('click', () => showScreen('screen-landing'));

  const statsBack = document.getElementById('stats-back');
  if (statsBack) statsBack.addEventListener('click', () => showScreen('screen-landing'));

  // Age band cards
  document.querySelectorAll('[data-age]').forEach(c => {
    c.addEventListener('click', () => {
      gs.ageBandId = c.dataset.age;
      // If coming from mission flow, skip mode screen and start directly
      if (gs.modeId === 'mission' && gs.missionId) {
        startGame();
      } else {
        gs.missionId = null;
        showScreen('screen-mode');
      }
    });
  });

  // Mode cards
  document.querySelectorAll('[data-mode]').forEach(c => {
    c.addEventListener('click', () => {
      gs.modeId = c.dataset.mode;
      startGame();
    });
  });

  // Game over / results buttons
  const btnRetry = document.getElementById('btn-retry');
  if (btnRetry) btnRetry.addEventListener('click', () => startGame());

  const btnRetry2 = document.getElementById('btn-retry2');
  if (btnRetry2) btnRetry2.addEventListener('click', () => startGame());

  const btnHome = document.getElementById('btn-home');
  if (btnHome) btnHome.addEventListener('click', () => { gs.missionId = null; showScreen('screen-landing'); updateLanding(); });

  const btnHome2 = document.getElementById('btn-home2');
  if (btnHome2) btnHome2.addEventListener('click', () => { gs.missionId = null; showScreen('screen-landing'); updateLanding(); });

  // Tip overlay OK button
  const tipOk = document.getElementById('tip-ok');
  if (tipOk) tipOk.addEventListener('click', () => hideTip());
}

function startGame() {
  endScheduled = false;
  hideTip();
  initState();
  showScreen('game');
  startLoop();
}

// ============================================================
// BOOT
// ============================================================
setupCanvas();
setupInput();
wireButtons();
checkShipUnlocks();
updateLanding();
showScreen('screen-landing');

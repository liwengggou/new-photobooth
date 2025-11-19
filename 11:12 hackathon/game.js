const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const healthEl = document.getElementById('health');
const levelNameEl = document.getElementById('levelName');
const streakEl = document.getElementById('streak');
const multiplierEl = document.getElementById('multiplier');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const voiceBtn = document.getElementById('voiceBtn');
const summaryToggleBtn = document.getElementById('summaryToggleBtn');
const flashBtn = document.getElementById('flashBtn');
const answerInput = document.getElementById('answerInput');
const summary = document.getElementById('summary');
const summaryBody = document.getElementById('summaryBody');
const flashcards = document.getElementById('flashcards');
const flashBody = document.getElementById('flashBody');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const restartBtn = document.getElementById('restartBtn');
const homeBtn = document.getElementById('homeBtn');
const choosePizza = document.getElementById('choosePizza');
const home = document.getElementById('home');
const chooseShooting = document.getElementById('chooseShooting');
const chooseVegetable = document.getElementById('chooseVegetable');
const veg = document.getElementById('veg');
const vegBoard = document.getElementById('vegBoard');
const vegCarrot = document.getElementById('vegCarrot');
const vegOverlay = document.getElementById('vegOverlay');
const vegOverlayTitle = document.getElementById('vegOverlayTitle');
const vegOverlayPenalty = document.getElementById('vegOverlayPenalty');
const vegStartBtn = document.getElementById('vegStart');
const vegBackBtn = document.getElementById('vegBack');
const vegNameEl = document.getElementById('vegName');
const vegRoundEl = document.getElementById('vegRound');
const vegDiffEl = document.getElementById('vegDiff');
const vegTimerEl = document.getElementById('vegTimer');

const RNG = (seed = Date.now()) => {
  let s = seed % 2147483647;
  return () => (s = s * 48271 % 2147483647) / 2147483647;
};
const rand = RNG();

const themes = [
  { name: '果物', bg: '#102a43' },
  { name: '旅行', bg: '#0b3d3c' },
  { name: '動物', bg: '#2b1948' },
  { name: '学校', bg: '#1e2a3a' }
];

const levels = [
  {
    id: 'fruits',
    words: [
      { id: 'apple', native: 'りんご', target: 'apple' },
      { id: 'banana', native: 'バナナ', target: 'banana' },
      { id: 'grape', native: 'ぶどう', target: 'grape' },
      { id: 'orange', native: 'オレンジ', target: 'orange' },
      { id: 'pear', native: '梨', target: 'pear' },
      { id: 'peach', native: '桃', target: 'peach' }
    ]
  },
  {
    id: 'travel',
    words: [
      { id: 'train', native: '電車', target: 'train' },
      { id: 'ticket', native: '切符', target: 'ticket' },
      { id: 'airport', native: '空港', target: 'airport' },
      { id: 'hotel', native: 'ホテル', target: 'hotel' },
      { id: 'map', native: '地図', target: 'map' },
      { id: 'luggage', native: '荷物', target: 'luggage' }
    ]
  },
  {
    id: 'animals',
    words: [
      { id: 'dog', native: '犬', target: 'dog' },
      { id: 'cat', native: '猫', target: 'cat' },
      { id: 'bird', native: '鳥', target: 'bird' },
      { id: 'fish', native: '魚', target: 'fish' },
      { id: 'horse', native: '馬', target: 'horse' },
      { id: 'bear', native: '熊', target: 'bear' }
    ]
  },
  {
    id: 'school',
    words: [
      { id: 'book', native: '本', target: 'book' },
      { id: 'pen', native: 'ペン', target: 'pen' },
      { id: 'desk', native: '机', target: 'desk' },
      { id: 'chair', native: '椅子', target: 'chair' },
      { id: 'teacher', native: '先生', target: 'teacher' },
      { id: 'student', native: '学生', target: 'student' }
    ]
  }
];

const STORAGE_KEY = 'spellBlasterProgress_v1';
const MISS_KEY = 'spellBlasterMiss_v1';
const loadProgress = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
};
const saveProgress = (p) => localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
const loadMisses = () => {
  try {
    const raw = localStorage.getItem(MISS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
};
const saveMisses = (m) => localStorage.setItem(MISS_KEY, JSON.stringify(m));

const state = {
  running: false,
  paused: false,
  levelIndex: 0,
  themeIndex: 0,
  score: 0,
  health: 100,
  streak: 0,
  multiplier: 1,
  superModeUntil: 0,
  enemies: [],
  bullets: [],
  progress: loadProgress(),
  missCounts: loadMisses(),
  stats: {},
  currentWord: null,
  spawnTimer: 0,
  usingVoice: false,
  missFeedbackUntil: 0,
  shakeUntil: 0,
  lastPenalty: 0,
  effects: [],
  summaryReady: false,
  flash: { view: 'categories', category: null, items: [], idx: 0, flipped: false, choices: [], correctIndex: -1 },
  mode: 'home',
  bg: { shooting: null, pizza: null },
  veg: {
    sets: [],
    setIndex: 0,
    round: 1,
    difficulty: 'easy',
    activeWords: [],
    currentIndex: 0,
    startTime: 0,
    timeLimitMs: 30000,
    timerId: null,
    reviewIndex: 0,
    missDifficulty: {},
    easySetCounter: 0,
    started: false,
    usedWordIds: {},
    currentSetWords: [],
  },
  pizza: {
    running: false,
    timeLimitMs: 60000,
    startTime: 0,
    item: null,
    leftWord: null,
    rightWord: null,
    playerSide: 'center',
    feedbackUntil: 0,
    shakeUntil: 0,
    feedbackTitle: '',
    feedbackPenalty: 0,
    successUntil: 0,
    successTitle: '',
    successBonus: 0,
  },
};
state.bg.shooting = new Image(); state.bg.shooting.src = 'public/shootingbackground.png';
state.bg.pizza = new Image(); state.bg.pizza.src = 'public/pizzabackground.png';
window.state = state;

const now = () => performance.now();

const normalize = (s) => s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const getFam = (id) => Math.max(0, Math.min(100, state.progress[id] ?? 20));
const setFam = (id, val) => { state.progress[id] = Math.max(0, Math.min(100, val)); saveProgress(state.progress); };

const pickChallenge = (w) => {
  return { display: `${w.native}`, expect: w.target, mask: null, mode: 'nativeOnly' };
};

const addScore = (base, answerTime, usedVoice) => {
  const mult = Math.min(5, Math.max(1, state.multiplier));
  let add = base * mult;
  if (answerTime <= 2000) add += 50;
  if (usedVoice) add += 200;
  state.score += add;
};

const updateStreak = (ok) => {
  if (ok) {
    state.streak += 1;
    state.multiplier = Math.min(5, 1 + Math.floor(state.streak/1));
    if (state.streak >= 5) state.superModeUntil = now() + 5000;
  } else {
    state.streak = 0;
    state.multiplier = 1;
  }
};

const SFX = (() => {
  const ctxA = new (window.AudioContext || window.webkitAudioContext)();
  const beep = (freq, time=0.08) => {
    const o = ctxA.createOscillator();
    const g = ctxA.createGain();
    o.frequency.value = freq;
    o.connect(g); g.connect(ctxA.destination);
    g.gain.setValueAtTime(0.0, ctxA.currentTime);
    g.gain.linearRampToValueAtTime(0.2, ctxA.currentTime+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctxA.currentTime+time);
    o.start(); o.stop(ctxA.currentTime+time);
  };
  return { hit: ()=>beep(660), miss: ()=>beep(160), explode: ()=>beep(120), type: ()=>beep(440,0.03) };
})();

const player = { x: 80, y: canvas.height/2 };

const spawnEnemy = () => {
  const lvl = levels[state.levelIndex];
  const pool = lvl.words.slice();
  pool.sort((a,b)=>getFam(a.id)-getFam(b.id));
  const w = pool[Math.floor(rand()*Math.min(3,pool.length))];
  const ch = pickChallenge(w);
  const e = {
    id: w.id,
    native: w.native,
    target: w.target,
    display: ch.display,
    expect: ch.expect,
    mode: ch.mode,
    x: canvas.width - 40,
    y: 80 + rand()*(canvas.height-160),
    speed: state.superModeUntil>now()? 0.6 : 1.2,
    born: now(),
    dead: false,
    famAtSpawn: getFam(w.id),
  };
  state.enemies.push(e);
  state.currentWord = e;
  debug('SPAWN id=', e.id, 'display=', e.display, 'expect=', e.expect, 'mode=', e.mode, 'fam=', e.famAtSpawn);
};

const fireBullet = (ch) => {
  const b = { x: player.x+30, y: player.y, vx: state.superModeUntil>now()? 8 : 5, char: ch, targetId: state.currentWord?.id };
  state.bullets.push(b);
  SFX.type();
  debug('TYPE char=', ch);
};
const fireBulletToEnemy = (e, usedVoice) => {
  const b = { x: player.x+30, y: player.y, speed: state.superModeUntil>now()? 18 : 12, targetId: e.id, usedVoice };
  state.bullets.push(b);
  SFX.type();
  debug('SHOT target=', e.id);
};

const measureText = (txt, size=16) => { ctx.font = `${size}px Monospace`; return ctx.measureText(txt).width; };

const drawEnemy = (e) => {
  const sizeEmoji = 28; const sizeText = 18;
  ctx.font = `${sizeEmoji}px system-ui`;
  const emoji = '🪨';
  const tw = ctx.measureText(emoji).width;
  ctx.fillText(emoji, e.x - tw/2, e.y + sizeEmoji/3);
  ctx.font = `${sizeText}px Monospace`;
  const textW = ctx.measureText(e.display).width;
  const pad = 8; const boxW = textW + pad*2; const boxH = 26; const boxX = e.x - boxW/2; const boxY = e.y + sizeEmoji - 22;
  ctx.fillStyle = 'rgba(15,23,42,0.85)'; ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.fillStyle = '#e6edf3'; ctx.fillText(e.display, e.x - textW/2, boxY + 18);
  const fam = getFam(e.id);
  ctx.fillStyle = '#1e293b'; ctx.fillRect(e.x + Math.max(tw,boxW)/2 + 6, e.y - sizeEmoji, 8, sizeEmoji+24);
  ctx.fillStyle = '#22c55e'; ctx.fillRect(e.x + Math.max(tw,boxW)/2 + 6, e.y - sizeEmoji + (sizeEmoji+24)*(1-fam/100), 8, (sizeEmoji+24)*(fam/100));
};

const drawPlayer = () => {
  const size = 128;
  const ufo = '🛸';
  ctx.font = `${size}px system-ui`;
  const w = ctx.measureText(ufo).width;
  const x = player.x;
  const y = player.y;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#0f172a';
  ctx.beginPath(); ctx.arc(x, y, size * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#e6edf3';
  ctx.fillText(ufo, x - w / 2, y + size * 0.3);
};

const drawBullets = () => {
  ctx.fillStyle = '#f59e0b';
  for (const b of state.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill(); }
};

const updateBullets = () => {
  for (const b of state.bullets) {
    if (b.speed) {
      const t = state.enemies.find(e=>e.id===b.targetId && !e.dead);
      if (!t) { b.done = true; continue; }
      const dx = t.x - b.x;
      const dy = t.y - b.y;
      const d = Math.hypot(dx, dy);
      if (d <= 18) { succeedEnemy(t, !!b.usedVoice); b.done = true; continue; }
      const step = Math.min(b.speed, d);
      b.x += dx / d * step;
      b.y += dy / d * step;
    } else {
      b.x += b.vx;
      if (b.x >= canvas.width+20) b.done = true;
    }
  }
  state.bullets = state.bullets.filter(b=>!b.done);
};

const updateEnemies = () => {
  for (const e of state.enemies) e.x -= e.speed;
  const survive = [];
  for (const e of state.enemies) {
    if (e.x < 60) {
      if (!e.dead) failEnemy(e);
    } else survive.push(e);
  }
  state.enemies = survive;
};

const explodeAt = (x,y) => {
  SFX.explode();
  state.effects.push({ x, y, start: now(), duration: 400 });
};

const succeedEnemy = (e, usedVoice=false) => {
  e.dead = true; explodeAt(e.x, e.y);
  const t = now()-e.born;
  addScore(100, t, usedVoice);
  updateStreak(true);
  setFam(e.id, getFam(e.id)+10);
  const s = state.stats[e.id] || { ok:0, fail:0, times:[] };
  s.ok++; s.times.push(t); state.stats[e.id]=s;
  state.enemies = state.enemies.filter(x=>x!==e);
  state.currentWord = null;
  state.spawnTimer = now()+400;
  debug('SUCCESS id=', e.id, 'time=', t, 'score=', state.score, 'streak=', state.streak, 'mult=', state.multiplier);
};

const failEnemy = (e) => {
  e.dead = true; SFX.miss();
  state.score = Math.max(0, state.score-50);
  state.health = Math.max(0, state.health-10);
  updateStreak(false);
  setFam(e.id, getFam(e.id)-10);
  const s = state.stats[e.id] || { ok:0, fail:0, times:[] };
  s.fail++; state.stats[e.id]=s;
  state.missCounts[e.id] = (state.missCounts[e.id]||0) + 1;
  saveMisses(state.missCounts);
  state.enemies = state.enemies.filter(x=>x!==e);
  state.currentWord = null;
  state.spawnTimer = now()+400;
  state.missFeedbackUntil = now() + 800;
  state.shakeUntil = now() + 700;
  state.lastPenalty = 50;
  debug('FAIL id=', e.id, 'score=', state.score, 'health=', state.health);
};

const draw = () => {
  const theme = themes[state.themeIndex%themes.length];
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (state.bg.shooting && state.bg.shooting.complete) {
    ctx.drawImage(state.bg.shooting, 0, 0, canvas.width, canvas.height);
  } else {
    const grd = ctx.createLinearGradient(0,0,0,canvas.height);
    grd.addColorStop(0, theme.bg);
    grd.addColorStop(1, '#0b1225');
    ctx.fillStyle = grd; ctx.fillRect(0,0,canvas.width,canvas.height);
  }
  const t = now();
  const ox = t < state.shakeUntil ? (rand()*2-1)*12 : 0;
  const oy = t < state.shakeUntil ? (rand()*2-1)*12 : 0;
  ctx.save();
  ctx.translate(ox, oy);
  drawPlayer();
  for (const e of state.enemies) drawEnemy(e);
  drawBullets();
  const tNow = now();
  const remain = [];
  for (const fx of state.effects) {
    const dt = tNow - fx.start;
    if (dt > fx.duration) continue;
    const k = 1 - dt / fx.duration;
    ctx.fillStyle = `rgba(255,200,50,${Math.max(0, k)})`;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, 24 + 22*(1-k), 0, Math.PI*2); ctx.fill();
    remain.push(fx);
  }
  state.effects = remain;
  ctx.restore();
  if (t < state.missFeedbackUntil) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,0,0,0.22)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 64px system-ui';
    const text = 'Missed';
    const tw = ctx.measureText(text).width;
    ctx.fillText(text, (canvas.width - tw)/2, canvas.height/2);
    ctx.font = 'bold 40px system-ui';
    const penalty = `-${state.lastPenalty}`;
    const pw = ctx.measureText(penalty).width;
    ctx.fillText(penalty, (canvas.width - pw)/2, canvas.height/2 + 56);
    ctx.restore();
  }
};

const tick = () => {
  if (!state.running || state.paused) return;
  updateEnemies();
  updateBullets();
  if (state.enemies.length===0 && now()>state.spawnTimer) { spawnEnemy(); state.spawnTimer = now()+800; }
  draw();
  scoreEl.textContent = Math.floor(state.score);
  healthEl.textContent = Math.floor(state.health);
  streakEl.textContent = state.streak;
  multiplierEl.textContent = `${state.multiplier}x`;
  if (state.health<=0) endLevel();
  requestAnimationFrame(tick);
};

const startLevel = () => {
  state.running = true; state.paused=false; state.score = state.score; state.health = 100; state.streak=0; state.multiplier=1; state.superModeUntil=0; state.enemies=[]; state.stats={};
  levelNameEl.textContent = themes[state.levelIndex%themes.length].name;
  answerInput.value = '';
  answerInput.focus();
  state.spawnTimer = now()+500;
  const allWords = levels.flatMap(l=>l.words);
  for (const w of allWords) { if (state.missCounts[w.id]==null) state.missCounts[w.id]=0; }
  saveMisses(state.missCounts);
  requestAnimationFrame(tick);
};

const endLevel = () => {
  state.running = false;
  const lvl = levels[state.levelIndex];
  const noMistakes = Object.values(state.stats).every(s=>s.fail===0);
  if (noMistakes) state.score += 500;
  renderSummary(lvl);
  state.summaryReady = true;
  summary.classList.add('hidden');
  summaryToggleBtn.textContent = 'Summary (ready)';
};

const avg = (arr) => arr.length? arr.reduce((a,b)=>a+b,0)/arr.length : 0;

const renderSummary = (lvl) => {
  summaryBody.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'summary-row';
  header.innerHTML = `<strong>Word</strong><strong>Accuracy</strong><strong>Avg Time</strong><strong>Familiarity</strong>`;
  summaryBody.appendChild(header);
  for (const w of lvl.words) {
    const s = state.stats[w.id] || { ok:0, fail:0, times:[] };
    const acc = (s.ok + s.fail)>0? Math.round(s.ok/(s.ok+s.fail)*100) : 0;
    const row = document.createElement('div');
    row.className = 'summary-row';
    const fam = getFam(w.id);
    const tAvg = Math.round(avg(s.times));
    row.innerHTML = `
      <div>${w.native} → ${w.target}</div>
      <div>${acc}%</div>
      <div>${tAvg} ms</div>
      <div class="bar"><span style="width:${fam}%"></span></div>
    `;
    summaryBody.appendChild(row);
  }
  summaryToggleBtn.textContent = state.summaryReady ? 'Summary (ready)' : 'Summary';
};
const renderFlashcards = () => {
  const allWords = levels.flatMap(l=>l.words);
  const withMiss = allWords.map(w=>({ w, miss: state.missCounts[w.id]||0 }));
  const perfect = withMiss.filter(x=>x.miss===0);
  const almost = withMiss.filter(x=>x.miss>=1 && x.miss<=2);
  const needs = withMiss.filter(x=>x.miss>=3);
  const html = `
    <div class="fc-container fc-view show">
      <div class="fc-categories">
        <div class="fc-category" data-cat="perfect"><h3>Perfect</h3><div class="fc-count">${perfect.length} words</div></div>
        <div class="fc-category" data-cat="almost"><h3>Almost There</h3><div class="fc-count">${almost.length} words</div></div>
        <div class="fc-category" data-cat="needs"><h3>Needs Work</h3><div class="fc-count">${needs.length} words</div></div>
      </div>
    </div>
  `;
  flashBody.innerHTML = html;
  state.flash.view = 'categories';
};

const groupWords = () => {
  const allWords = levels.flatMap(l=>l.words);
  const withMiss = allWords.map(w=>({ w, miss: state.missCounts[w.id]||0 }));
  return {
    perfect: withMiss.filter(x=>x.miss===0).sort((a,b)=>a.w.native.localeCompare(b.w.native)),
    almost: withMiss.filter(x=>x.miss>=1 && x.miss<=2).sort((a,b)=>a.miss-b.miss),
    needs: withMiss.filter(x=>x.miss>=3).sort((a,b)=>b.miss-a.miss),
  };
};

const renderWordList = (cat) => {
  const g = groupWords();
  const items = g[cat] || [];
  state.flash.view = 'list';
  state.flash.category = cat;
  state.flash.items = items.map(x=>x.w);
  const title = cat==='perfect'?'Perfect':cat==='almost'?'Almost There':'Needs Work';
  const html = `
    <div class="fc-container fc-view show">
      <div class="fc-header"><h3>${title}</h3><div class="fc-actions"><button class="fc-btn" data-action="fc-quiz-all">Quiz Mode</button><button class="fc-btn alt" data-action="fc-card-all">Flashcard Mode</button><button class="back" data-action="fc-back">Back</button></div></div>
      <div class="fc-list">
        ${items.map(x=>`
          <div class="fc-item" data-word="${x.w.id}"><div>${x.w.native} → ${x.w.target}</div></div>
        `).join('')}
      </div>
    </div>
  `;
  flashBody.innerHTML = html;
};

const shuffle = (arr) => { for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; };

const startQuiz = (cat, wordId) => {
  const items = state.flash.items.length? state.flash.items : groupWords()[cat].map(x=>x.w);
  let idx = items.findIndex(w=>w.id===wordId);
  if (idx<0) idx = 0;
  state.flash.view='quiz';
  state.flash.category=cat;
  state.flash.items=items;
  state.flash.idx=idx;
  const w = items[idx];
  const allTargets = levels.flatMap(l=>l.words.map(z=>z.target));
  const decoys = shuffle(allTargets.filter(t=>t!==w.target)).slice(0,3);
  const choices = shuffle([w.target, ...decoys]);
  state.flash.choices = choices;
  state.flash.correctIndex = choices.indexOf(w.target);
  renderQuizView();
};

const renderQuizView = () => {
  const w = state.flash.items[state.flash.idx];
  const html = `
    <div class="fc-container fc-view show">
      <div class="fc-header"><h3>Quiz Mode</h3><button class="back" data-action="fc-list">Back to List</button></div>
      <div class="fc-quiz">
        <div><strong>${w.native}</strong></div>
        <div class="fc-choices">
          ${state.flash.choices.map((c,i)=>`<div class="fc-choice" data-choice="${i}">${c}</div>`).join('')}
        </div>
        <div class="fc-actions">
          <button class="fc-btn" data-action="fc-next">Next</button>
        </div>
      </div>
    </div>
  `;
  flashBody.innerHTML = html;
};

const startCardMode = (cat, wordId) => {
  const items = state.flash.items.length? state.flash.items : groupWords()[cat].map(x=>x.w);
  let idx = items.findIndex(w=>w.id===wordId);
  if (idx<0) idx = 0;
  state.flash.view='cards';
  state.flash.category=cat;
  state.flash.items=items;
  state.flash.idx=idx;
  state.flash.flipped=false;
  renderCardView();
};

const renderCardView = () => {
  const w = state.flash.items[state.flash.idx];
  const html = `
    <div class="fc-container fc-view show">
      <div class="fc-header"><h3>Flashcard Mode</h3><button class="back" data-action="fc-list">Back to List</button></div>
      <div class="fc-card">
        <div class="fc-card-inner ${state.flash.flipped?'flip':''}">
          <div class="fc-card-face front"><div><strong>${w.native}</strong></div></div>
          <div class="fc-card-face back"><div>${w.target}</div></div>
        </div>
      </div>
      <div class="fc-card-controls">
        <button class="fc-btn" data-action="fc-flip">Flip</button>
        <button class="fc-btn" data-action="fc-prev">Prev</button>
        <button class="fc-btn" data-action="fc-next">Next</button>
      </div>
    </div>
  `;
  flashBody.innerHTML = html;
};

startBtn.onclick = () => { home.classList.add('hidden'); if (state.mode==='shoot') { summary.classList.add('hidden'); startLevel(); } else if (state.mode==='veg') { startVegRound(); } };
pauseBtn.onclick = () => { if (state.mode==='shoot') { state.paused = !state.paused; } };
nextLevelBtn.onclick = () => { home.classList.add('hidden'); summary.classList.add('hidden'); state.levelIndex = (state.levelIndex+1)%levels.length; state.themeIndex = state.levelIndex; startLevel(); };
restartBtn.onclick = () => { home.classList.add('hidden'); summary.classList.add('hidden'); if (state.mode==='shoot') startLevel(); else if (state.mode==='veg') { resetVegRound(); } };
summaryToggleBtn.onclick = () => { home.classList.add('hidden'); if (summary.classList.contains('hidden')) { summary.classList.remove('hidden'); state.summaryReady=false; summaryToggleBtn.textContent='Summary'; } else { summary.classList.add('hidden'); } };
flashBtn.onclick = () => { home.classList.add('hidden'); if (flashcards.classList.contains('hidden')) { renderFlashcards(); flashcards.classList.remove('hidden'); } else { flashcards.classList.add('hidden'); } };

const initHome = () => {
  home.classList.remove('hidden');
  document.getElementById('ui').classList.add('hidden');
  document.getElementById('game').classList.add('hidden');
  veg.classList.add('hidden');
  summary.classList.add('hidden');
  flashcards.classList.add('hidden');
  if (state.veg.timerId) { clearInterval(state.veg.timerId); state.veg.timerId=null; }
  state.running = false;
  state.mode='home';
  answerInput.classList.remove('bottom-input');
  document.body.classList.remove('veg-mode');
};
const showShooting = () => {
  home.classList.add('hidden');
  veg.classList.add('hidden');
  document.getElementById('ui').classList.remove('hidden');
  document.getElementById('game').classList.remove('hidden');
  const hud = document.querySelector('.hud'); if (hud) hud.classList.remove('hidden');
  const ctr = document.querySelector('.controls'); if (ctr) ctr.classList.remove('hidden');
  state.mode='shoot';
  answerInput.classList.remove('bottom-input');
  document.body.classList.remove('veg-mode');
};
const showVegetable = () => {
  home.classList.add('hidden');
  document.getElementById('ui').classList.remove('hidden');
  const hud = document.querySelector('.hud'); if (hud) hud.classList.add('hidden');
  const ctr = document.querySelector('.controls'); if (ctr) ctr.classList.remove('hidden');
  document.getElementById('game').classList.add('hidden');
  veg.classList.remove('hidden');
  state.mode='veg';
  answerInput.classList.add('bottom-input');
  document.body.classList.add('veg-mode');
};
const showPizza = () => {
  home.classList.add('hidden');
  document.getElementById('ui').classList.remove('hidden');
  document.getElementById('game').classList.remove('hidden');
  const hud = document.querySelector('.hud'); if (hud) hud.classList.remove('hidden');
  const ctr = document.querySelector('.controls'); if (ctr) ctr.classList.remove('hidden');
  state.mode='pizza';
  answerInput.classList.add('bottom-input');
  startPizza();
  answerInput.value='';
  answerInput.focus();
};
const allWordsFlat = () => levels.flatMap(l=>l.words);
const setupVegSets = () => {
  state.veg.usedWordIds = {};
  state.veg.currentSetWords = [];
  state.veg.setIndex = 0;
  state.veg.round = 1;
  state.veg.difficulty = 'easy';
};
const getUnusedWords = () => {
  const all = allWordsFlat();
  return all.filter(w => !state.veg.usedWordIds[w.id]);
};
const buildNewSet = () => {
  const unused = getUnusedWords();
  const pick = [];
  for (let i=0; i<unused.length && pick.length<5; i++) {
    pick.push(unused[i]);
  }
  if (pick.length===0 && Object.keys(state.veg.usedWordIds).length>0) {
    state.veg.usedWordIds = {};
    return buildNewSet();
  }
  return pick;
};
const maskWord = (t, hard=false) => {
  const holes = hard ? Math.max(3, Math.floor(t.length/2)) : Math.max(2, Math.floor(t.length/3));
  let mask = t.split('');
  for (let i=0;i<holes;i++) { const idx = Math.floor(rand()*t.length); mask[idx] = '_'; }
  return mask.join('');
};
const resetVegRound = () => {
  state.veg.activeWords = [];
  state.veg.currentIndex = 0;
  state.veg.started = false;
  state.veg.currentSetWords = buildNewSet();
  const names = ['Carrot','Tomato','Potato','Cabbage','Onion','Pepper','Radish','Broccoli'];
  vegNameEl.textContent = names[state.veg.setIndex % names.length];
  vegRoundEl.textContent = state.veg.round;
  vegDiffEl.textContent = '—';
  vegBoard.innerHTML = '';
  for (const w of state.veg.currentSetWords) state.veg.activeWords.push({ id: w.id, native: w.native, target: w.target, cut: false });
  state.veg.easySetCounter++;
  vegCarrot.classList.add('hidden');
  const limit = 20000;
  state.veg.timeLimitMs = limit;
  vegTimerEl.textContent = (limit/1000).toFixed(1);
};
const renderCurrentVegCard = () => {
  const idx = state.veg.currentIndex;
  const w = state.veg.activeWords[idx];
  vegBoard.innerHTML = '';
  if (!w) return;
  const display = `${w.native}`;
  const div = document.createElement('div');
  div.className = 'veg-card';
  div.dataset.wordId = w.id;
  div.innerHTML = `<div>${display}</div>`;
  vegBoard.appendChild(div);
  const done = state.veg.activeWords.filter(x=>x.cut).length;
  const base = (state.veg.round % 2 === 1) ? 'carrot' : 'eggplant';
  const map = [`${base}noword`,`${base}oneword`,`${base}twowords`,`${base}threewords`,`${base}fourwords`,`${base}fivewords`];
  const imgName = map[Math.min(done, 5)] + '.PNG';
  vegCarrot.src = `public/${imgName}`;
  vegCarrot.classList.remove('hidden');
};
const startVegRound = () => {
  state.veg.started = true;
  renderCurrentVegCard();
  const start = now(); state.veg.startTime = start;
  if (state.veg.timerId) clearInterval(state.veg.timerId);
  vegTimerEl.textContent = (state.veg.timeLimitMs/1000).toFixed(1);
  state.veg.timerId = setInterval(() => {
    const rem = Math.max(0, state.veg.timeLimitMs - (now()-start));
    vegTimerEl.textContent = (rem/1000).toFixed(1);
    if (rem<=0) { clearInterval(state.veg.timerId); finishVegRound(); }
  }, 100);
  answerInput.value = '';
  answerInput.focus();
};
vegStartBtn.onclick = () => { home.classList.add('hidden'); startVegRound(); };
vegBackBtn.onclick = () => initHome();
chooseShooting.onclick = () => { showShooting(); summary.classList.add('hidden'); startLevel(); };
chooseVegetable.onclick = () => { showVegetable(); setupVegSets(); resetVegRound(); answerInput.focus(); };
choosePizza.onclick = () => { showPizza(); };
homeBtn.onclick = () => initHome();
const tryCutWord = (val) => {
  const i = state.veg.currentIndex;
  const w = state.veg.activeWords[i];
  if (!w) return false;
  if (normalize(val)===normalize(w.target)) {
    state.score += 100;
    w.cut = true;
    const card = vegBoard.querySelector(`[data-word-id="${w.id}"]`);
    if (card) { card.classList.add('cut'); const fx = document.createElement('div'); fx.className='veg-cut'; fx.textContent='💥'; card.appendChild(fx); }
    setFam(w.id, getFam(w.id)+10);
    let next = i+1;
    while (next < state.veg.activeWords.length && state.veg.activeWords[next].cut) next++;
    state.veg.currentIndex = next;
    if (state.veg.currentIndex >= state.veg.activeWords.length) { finishVegRound(); return true; }
    renderCurrentVegCard();
    return true;
  }
  state.score = Math.max(0, state.score-50);
  vegOverlayTitle.textContent = 'Missed';
  vegOverlayPenalty.textContent = '-50';
  vegOverlay.classList.remove('hidden');
  veg.classList.add('veg-shake');
  setTimeout(() => { vegOverlay.classList.add('hidden'); veg.classList.remove('veg-shake'); }, 800);
  return false;
};
const finishVegRound = () => {
  const done = state.veg.activeWords.filter(x=>x.cut).length;
  const total = state.veg.activeWords.length;
  const full = done===total;
  if (!full) {
    const unanswered = total - done;
    const penalty = unanswered * 50;
    state.score = Math.max(0, state.score - penalty);
    vegOverlayTitle.textContent = 'Time Out';
    vegOverlayPenalty.textContent = `-${penalty}`;
    vegOverlay.classList.remove('hidden');
    veg.classList.add('veg-shake');
    setTimeout(() => { vegOverlay.classList.add('hidden'); veg.classList.remove('veg-shake'); }, 800);
  }
  for (const w of state.veg.activeWords) {
    if (!w.cut) { state.missCounts[w.id] = (state.missCounts[w.id]||0)+1; saveMisses(state.missCounts); setFam(w.id, getFam(w.id)-10); state.veg.missDifficulty[w.id] = state.veg.difficulty; }
  }
  // mark current set words as used and advance to next set each round
  for (const w of state.veg.currentSetWords) state.veg.usedWordIds[w.id] = true;
  state.veg.setIndex++;
  state.veg.round++;
  if (state.veg.round % 3 === 0) {
    const missed = Object.entries(state.missCounts).filter(([_,c])=>c>0).map(([id])=>id);
    if (missed.length>=5) {
      const pick = missed.slice(0,5).map(id=> allWordsFlat().find(w=>w.id===id)).filter(Boolean);
      if (pick.length===5) {
        state.veg.sets.splice(state.veg.setIndex,0,{ name: 'Review Veg', words: pick });
      }
    }
  }
  if (state.veg.timerId) { clearInterval(state.veg.timerId); state.veg.timerId = null; }
  resetVegRound();
  startVegRound();
};

flashBody.addEventListener('click', (ev) => {
  const el = ev.target;
  if (el.closest('.fc-category')) { const cat = el.closest('.fc-category').dataset.cat; renderWordList(cat); return; }
  const actionEl = el.closest('[data-action]');
  if (actionEl) {
    const act = actionEl.dataset.action;
    if (act==='fc-back') { renderFlashcards(); return; }
    if (act==='fc-list') { renderWordList(state.flash.category); return; }
    if (act==='fc-quiz-all') { if (state.flash.items.length) startQuiz(state.flash.category, state.flash.items[0].id); return; }
    if (act==='fc-card-all') { if (state.flash.items.length) startCardMode(state.flash.category, state.flash.items[0].id); return; }
    if (act==='fc-next') {
      if (state.flash.view==='quiz') {
        state.flash.idx = (state.flash.idx+1)%state.flash.items.length;
        startQuiz(state.flash.category, state.flash.items[state.flash.idx].id);
      } else {
        state.flash.idx = (state.flash.idx+1)%state.flash.items.length;
        renderCardView();
      }
      return;
    }
    if (act==='fc-prev') { state.flash.idx = (state.flash.idx-1+state.flash.items.length)%state.flash.items.length; renderCardView(); return; }
    if (act==='fc-flip') { state.flash.flipped = !state.flash.flipped; renderCardView(); return; }
  }
  if (el.classList.contains('fc-choice')) {
    const idx = Number(el.dataset.choice);
    const correct = idx===state.flash.correctIndex;
    el.classList.add(correct? 'correct':'wrong');
    const siblings = el.parentElement.querySelectorAll('.fc-choice');
    siblings.forEach(s=>{ if (Number(s.dataset.choice)===state.flash.correctIndex) s.classList.add('correct'); });
    return;
  }
});

answerInput.addEventListener('keydown', (e) => {
  if (e.key!=='Enter') return;
  const val = answerInput.value;
  answerInput.value='';
  home.classList.add('hidden');
  if (state.mode==='shoot') {
    if (!state.running || state.paused) return;
    checkAnswer(val, false);
  } else if (state.mode==='veg') {
    if (!state.veg.timerId || !state.veg.started) return;
    tryCutWord(val);
  } else if (state.mode==='pizza') {
    const l = state.pizza.leftWord, r = state.pizza.rightWord;
    if (normalize(val)===normalize(l.target)) {
      state.pizza.playerSide='left'; setFam(l.id, getFam(l.id)+10);
      const [lw, rw] = pickTwoWords();
      state.pizza.leftWord = { id: lw.id, native: lw.native, target: lw.target };
      state.pizza.rightWord = { id: rw.id, native: rw.native, target: rw.target };
    } else if (normalize(val)===normalize(r.target)) {
      state.pizza.playerSide='right'; setFam(r.id, getFam(r.id)+10);
      const [lw, rw] = pickTwoWords();
      state.pizza.leftWord = { id: lw.id, native: lw.native, target: lw.target };
      state.pizza.rightWord = { id: rw.id, native: rw.native, target: rw.target };
    } else {
      state.score = Math.max(0, state.score-50);
      state.pizza.feedbackTitle = 'Incorrect'; state.pizza.feedbackPenalty = 50;
      state.pizza.feedbackUntil = now()+800; state.pizza.shakeUntil = now()+700;
      // mark both words missed to flashcards
      state.missCounts[l.id] = (state.missCounts[l.id]||0)+1;
      state.missCounts[r.id] = (state.missCounts[r.id]||0)+1;
      saveMisses(state.missCounts);
    }
  }
});


const checkAnswer = (val, usedVoice) => {
  const e = state.currentWord; if (!e) return;
  const ok = normalize(val)===normalize(e.expect);
  debug('CHECK val=', val, 'expect=', e.expect, 'ok=', ok);
  if (ok) { fireBulletToEnemy(e, usedVoice); } else { SFX.miss(); }
};

let recognition = null;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new Ctor();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (ev) => {
    const t = ev.results[0][0].transcript;
    debug('VOICE transcript=', t);
    checkAnswer(t, true);
  };
  recognition.onerror = () => { voiceBtn.textContent = 'Voice: Off'; state.usingVoice=false; };
}

voiceBtn.onclick = () => {
  if (!recognition) return;
  state.usingVoice = !state.usingVoice;
  voiceBtn.textContent = `Voice: ${state.usingVoice? 'On':'Off'}`;
  if (state.usingVoice) recognition.start(); else recognition.stop();
};

document.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  player.y = Math.max(40, Math.min(canvas.height-40, e.clientY-rect.top));
});

initHome();
draw();
const debug = (...a) => { try { console.log('[DEBUG]', ...a); } catch {} };
const pickTwoWords = () => {
  const all = allWordsFlat();
  const a = all[Math.floor(rand()*all.length)];
  let b = all[Math.floor(rand()*all.length)];
  const guard = new Set([a.id]);
  while (guard.has(b.id)) b = all[Math.floor(rand()*all.length)];
  return [a,b];
};
const startPizza = () => {
  state.pizza.running = true;
  state.pizza.startTime = now();
  state.pizza.item = null;
  const [lw, rw] = pickTwoWords();
  state.pizza.leftWord = { id: lw.id, native: lw.native, target: lw.target };
  state.pizza.rightWord = { id: rw.id, native: rw.native, target: rw.target };
  state.pizza.playerSide = 'center';
  requestAnimationFrame(tickPizza);
};
const spawnPizzaItem = () => {
  const side = Math.random()<0.5? 'left':'right';
  const type = Math.random()<0.6? 'pizza':'mold';
  const x = side==='left'? 180 : canvas.width-180;
  state.pizza.item = { type, side, x, y: 40, vy: 3.2 };
};
const drawPizza = () => {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (state.bg.pizza && state.bg.pizza.complete) {
    ctx.drawImage(state.bg.pizza, 0, 0, canvas.width, canvas.height);
  } else {
    const grd = ctx.createLinearGradient(0,0,0,canvas.height);
    grd.addColorStop(0, '#14203b'); grd.addColorStop(1, '#0b1225');
    ctx.fillStyle = grd; ctx.fillRect(0,0,canvas.width,canvas.height);
  }
  // prompts with boxes and arrows
  ctx.font = '20px system-ui';
  const yMid = canvas.height/2;
  const padX = 12; const boxH = 40;
  const leftTxt = state.pizza.leftWord.native;
  let tLeftW = ctx.measureText(leftTxt).width;
  const leftBoxX = 60; const leftBoxW = tLeftW + padX*2;
  ctx.fillStyle = 'rgba(15,23,42,0.8)'; ctx.strokeStyle = '#334155';
  ctx.beginPath(); ctx.rect(leftBoxX, yMid - boxH/2, leftBoxW, boxH); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e6edf3'; ctx.fillText(leftTxt, leftBoxX + padX, yMid + 7);
  ctx.font = '28px system-ui'; const leftArrow = '⬅️'; const laW = ctx.measureText(leftArrow).width;
  ctx.fillText(leftArrow, leftBoxX + leftBoxW/2 - laW/2, yMid - boxH/2 - 8);
  ctx.font = '20px system-ui';
  const rightTxt = state.pizza.rightWord.native;
  let tRightW = ctx.measureText(rightTxt).width;
  const rightBoxW = tRightW + padX*2; const rightBoxX = canvas.width - 60 - rightBoxW;
  ctx.fillStyle = 'rgba(15,23,42,0.8)'; ctx.strokeStyle = '#334155';
  ctx.beginPath(); ctx.rect(rightBoxX, yMid - boxH/2, rightBoxW, boxH); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e6edf3'; ctx.fillText(rightTxt, rightBoxX + padX, yMid + 7);
  ctx.font = '28px system-ui'; const rightArrow = '➡️'; const raW = ctx.measureText(rightArrow).width;
  ctx.fillText(rightArrow, rightBoxX + rightBoxW/2 - raW/2, yMid - boxH/2 - 8);
  // player dog
  ctx.font = '36px system-ui';
  const dog = '🐶';
  let px = canvas.width/2; if (state.pizza.playerSide==='left') px = 120; if (state.pizza.playerSide==='right') px = canvas.width-120;
  ctx.fillText(dog, px - ctx.measureText(dog).width/2, canvas.height-60);
  // item
  if (!state.pizza.item) spawnPizzaItem();
  const it = state.pizza.item;
  const emoji = it.type==='pizza'? '🍕' : '🦠';
  ctx.font = '40px system-ui';
  ctx.fillText(emoji, it.x - ctx.measureText(emoji).width/2, it.y);
  // feedback overlay
  const t = now();
  if (t < state.pizza.successUntil) {
    ctx.fillStyle = 'rgba(34,197,94,0.22)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#22c55e'; ctx.font = 'bold 64px system-ui';
    const text = state.pizza.successTitle; const tw = ctx.measureText(text).width;
    ctx.fillText(text, (canvas.width-tw)/2, canvas.height/2);
    ctx.font = 'bold 40px system-ui'; const bonus = `+${state.pizza.successBonus}`; const bw = ctx.measureText(bonus).width;
    ctx.fillText(bonus, (canvas.width-bw)/2, canvas.height/2+56);
  } else if (t < state.pizza.feedbackUntil) {
    ctx.fillStyle = 'rgba(255,0,0,0.22)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#ef4444'; ctx.font = 'bold 64px system-ui';
    const text = state.pizza.feedbackTitle; const tw = ctx.measureText(text).width;
    ctx.fillText(text, (canvas.width-tw)/2, canvas.height/2);
    ctx.font = 'bold 40px system-ui'; const pen = `-${state.pizza.feedbackPenalty}`; const pw = ctx.measureText(pen).width;
    ctx.fillText(pen, (canvas.width-pw)/2, canvas.height/2+56);
  }
};
const updatePizza = () => {
  const it = state.pizza.item; if (!it) return;
  it.y += it.vy;
  // collision zone near player
  const playerY = canvas.height-60;
  const near = Math.abs(it.y - playerY) < 40;
  if (near) {
    if (state.pizza.playerSide==='left' && it.side==='left' || state.pizza.playerSide==='right' && it.side==='right') {
      if (it.type==='pizza') {
        state.score += 100;
        state.effects.push({ x: it.x, y: it.y, start: now(), duration: 400 });
        SFX.hit();
        state.pizza.successTitle = 'Yummy!'; state.pizza.successBonus = 100; state.pizza.successUntil = now()+800;
      } else {
        state.score = Math.max(0, state.score-50);
        state.pizza.feedbackTitle = 'Hit Mold'; state.pizza.feedbackPenalty = 50;
        state.pizza.feedbackUntil = now()+800; state.pizza.shakeUntil = now()+700;
      }
      state.pizza.item = null; spawnPizzaItem();
    } else {
      // avoided mold or missed pizza
      if (it.type==='pizza') { /* no points */ }
      state.pizza.item = null; spawnPizzaItem();
    }
  } else if (it.y > canvas.height+20) {
    // fell off screen, zero points
    state.pizza.item = null; spawnPizzaItem();
  }
};
const tickPizza = () => {
  if (state.mode!=='pizza' || !state.pizza.running) return;
  updatePizza();
  drawPizza();
  // update HUD time in health label
  const elapsed = now()-state.pizza.startTime; const left = Math.max(0, state.pizza.timeLimitMs - elapsed);
  healthEl.textContent = (left/1000).toFixed(1);
  scoreEl.textContent = Math.floor(state.score);
  if (left<=0) { state.pizza.running=false; initHome(); return; }
  requestAnimationFrame(tickPizza);
};

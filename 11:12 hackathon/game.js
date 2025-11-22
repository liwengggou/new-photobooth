const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const resizeCanvas = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; if (state.mode==='shoot') { player.y = canvas.height/2; } };
window.addEventListener('resize', resizeCanvas);
const scoreEl = document.getElementById('score');
const healthEl = document.getElementById('health');
const levelNameEl = document.getElementById('levelName');
const streakEl = document.getElementById('streak');
const multiplierEl = document.getElementById('multiplier');
const spawnRateEl = document.getElementById('spawnRate');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const voiceBtn = document.getElementById('voiceBtn');
const summaryToggleBtn = document.getElementById('summaryToggleBtn');
const flashBtn = document.getElementById('flashBtn');
const homeBtn = document.getElementById('homeBtn');
const answerInput = document.getElementById('answerInput');
const summary = document.getElementById('summary');
const summaryBody = document.getElementById('summaryBody');
const flashcards = document.getElementById('flashcards');
const flashBody = document.getElementById('flashBody');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const restartBtn = document.getElementById('restartBtn');
const closeSummaryBtn = document.getElementById('closeSummaryBtn');
const closeFlashcardsBtn = document.getElementById('closeFlashcardsBtn');
const helpBtn = document.getElementById('helpBtn');
const help = document.getElementById('help');
const closeHelpBtn = document.getElementById('closeHelpBtn');
const debugKillEnemyBtn = document.getElementById('debugKillEnemyBtn');
const debugSpawnEnemyBtn = document.getElementById('debugSpawnEnemyBtn');
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
const vegCountdown = document.getElementById('vegCountdown');
const vegCountdownNumber = document.getElementById('vegCountdownNumber');
const vegPause = document.getElementById('vegPause');
const vegPassOverlay = document.getElementById('vegPassOverlay');
const vegPassAnswer = document.getElementById('vegPassAnswer');
const vegPassBtn = document.getElementById('vegPass');
const vegBackBtn = document.getElementById('vegBack');
const vegResult = document.getElementById('vegResult');
const vegResultBody = document.getElementById('vegResultBody');
const vegNextSetBtn = document.getElementById('vegNextSetBtn');
const vegRetryBtn = document.getElementById('vegRetryBtn');
const closeVegResultBtn = document.getElementById('closeVegResultBtn');
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
  lastSpawnedWordId: null,
  usedWordIdsInLevel: [], // 現在のレベルで使用済みの単語ID
  enemiesKilled: 0,
  spawnInterval: 4000, // 出現間隔（ミリ秒）、初期値は4秒
  usingVoice: false,
  missFeedbackUntil: 0,
  shakeUntil: 0,
  lastPenalty: 0,
  effects: [],
  summaryReady: false,
  showAnswerUntil: 0, // 解答表示の終了時刻
  answerToShow: null, // 表示する解答
  gamePausedForAnswer: false, // 解答表示のためにゲームが一時停止しているか
  flash: { view: 'categories', category: null, items: [], idx: 0, flipped: false, choices: [], correctIndex: -1 },
  mode: 'home',
  boss: null, // ボス情報 { id: 'boss', native: 'トマト', target: 'tomato', hp: 3, maxHp: 3, x, y, speed, born, dead }
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
    pausedTime: 0, // ポーズ開始時刻
    item: null,
    leftWord: null,
    centerWord: null,
    rightWord: null,
    playerSide: 'center',
    feedbackUntil: 0,
    shakeUntil: 0,
    feedbackTitle: '',
    feedbackPenalty: 0,
    successUntil: 0,
    successTitle: '',
    successBonus: 0,
    lastItemType: null, // 前回のアイテムタイプ（カビ連続防止用）
    lastPizzaSide: null,
    missedAnswers: null, // ミスした時の3つの単語の答え（再抽選前に表示用）
    pausedForMiss: false, // ミス画面で一時停止中かどうか
  },
};

const isJapanese = (s) => /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(String(s));
const fontFamilyJP = '"DotGothic16", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", system-ui, sans-serif';
const fontFamilyEN = '"DotGothic16", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
const setCtxFont = (size, bold, text) => { const ff = isJapanese(text) ? fontFamilyJP : fontFamilyEN; ctx.font = `${bold? 'bold ' : ''}${size}px ${ff}`; };
const measureTextSmart = (txt, size=16, bold=false) => { setCtxFont(size, bold, txt); return ctx.measureText(txt).width; };
const initLangObserver = () => {
  const applyNode = (node) => {
    if (node.nodeType === 1) {
      const t = node.textContent || '';
      if (isJapanese(t)) node.setAttribute('lang','ja');
      node.childNodes.forEach(applyNode);
    } else if (node.nodeType === 3) {
      const p = node.parentNode; if (!p) return; const t = p.textContent || ''; if (isJapanese(t)) p.setAttribute('lang','ja');
    }
  };
  const obs = new MutationObserver((muts) => {
    muts.forEach((m) => {
      if (m.type === 'childList') { m.addedNodes.forEach(applyNode); }
      if (m.type === 'characterData') { applyNode(m.target); }
    });
  });
  obs.observe(document.body, { subtree: true, childList: true, characterData: true });
};
initLangObserver();

const preloadFonts = () => {
  try {
    const jpSample = '日本語かな漢字電車空港学校りんご桃梨犬猫鳥魚馬熊地図荷物切符ホテル';
    const enSample = 'Paused Missed Resume';
    Promise.all([
      document.fonts.load('16px "DotGothic16"', jpSample),
      document.fonts.load('16px "Jersey 15"', enSample)
    ]).then(() => { state.fontsReady = true; });
  } catch {}
};
preloadFonts();
state.bg.shooting = new Image(); state.bg.shooting.src = 'public/shootingbackground.png';
state.bg.pizza = new Image(); state.bg.pizza.src = 'public/pizzabackground.png';
state.imgPanda = new Image(); state.imgPanda.src = 'public/panda.PNG';
state.imgBamboo = new Image(); state.imgBamboo.src = 'public/bamboo.PNG';
state.imgShoe = new Image(); state.imgShoe.src = 'public/shoe.PNG';
state.imgShuttle = new Image(); state.imgShuttle.src = 'public/shuttle.PNG';
state.imgRock = new Image(); state.imgRock.src = 'public/rock.PNG';
state.imgArrowLeft = new Image();
state.imgArrowLeft.src = 'public/left.png';
state.imgArrowLeft.onerror = () => { state.imgArrowLeft.src = 'public/left.jpg'; };
state.imgArrowRight = new Image();
state.imgArrowRight.src = 'public/right.png';
state.imgArrowRight.onerror = () => { state.imgArrowRight.src = 'public/right.PNG'; };
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

const spawnBoss = () => {
  // ステージ1（果物レベル）のみボスを出現
  if (state.levelIndex !== 0 || state.boss) return;
  
  state.boss = {
    id: 'boss',
    native: 'トマト',
    target: 'tomato',
    display: 'トマト',
    expect: 'tomato',
    mode: 'nativeOnly',
    hp: 3,
    maxHp: 3,
    x: canvas.width - 40,
    y: canvas.height / 2,
    speed: 0.3,
    born: now(),
    dead: false
  };
  debug('BOSS SPAWNED');
};

const spawnEnemy = () => {
  const lvl = levels[state.levelIndex];
  // 使用済みでない単語のみをプールに含める
  let pool = lvl.words.filter(w => !state.usedWordIdsInLevel.includes(w.id));
  
  // 使用可能な単語がなくなったら、画面に敵が残っているか確認
  if (pool.length === 0) {
    // 画面に敵が残っている場合は、次のレベルに進まない
    if (state.enemies.length > 0) {
      return;
    }
    // ステージ1の場合、ボスを出現させる
    if (state.levelIndex === 0 && !state.boss) {
      spawnBoss();
      return;
    }
    // 敵が全て消えた後、使用可能な単語がなければ次のレベルに遷移
    advanceToNextLevel();
    return;
  }
  
  // 前回出現した単語を除外（同じ単語が連続しないように）
  if (state.lastSpawnedWordId !== null) {
    pool = pool.filter(w => w.id !== state.lastSpawnedWordId);
  }
  // 除外後にプールが空になった場合は、使用済みでない単語から選ぶ
  if (pool.length === 0) {
    pool = lvl.words.filter(w => !state.usedWordIdsInLevel.includes(w.id));
  }
  pool.sort((a,b)=>getFam(a.id)-getFam(b.id));
  const w = pool[Math.floor(rand()*Math.min(3,pool.length))];
  state.lastSpawnedWordId = w.id; // 今回出現した単語を記録
  state.usedWordIdsInLevel.push(w.id); // 使用済みリストに追加
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
  updateCurrentWord();
  debug('SPAWN id=', e.id, 'display=', e.display, 'expect=', e.expect, 'mode=', e.mode, 'fam=', e.famAtSpawn);
};

const updateCurrentWord = () => {
  // 最も近い敵（x座標が最も小さい、つまり最も左にいる敵）を currentWord に設定
  const aliveEnemies = state.enemies.filter(e => !e.dead);
  if (aliveEnemies.length > 0) {
    state.currentWord = aliveEnemies.reduce((closest, e) => 
      e.x < closest.x ? e : closest
    );
  } else {
    state.currentWord = null;
  }
};

const updateSpawnRate = () => {
  // 出現間隔 = 4秒 - (倒した数 * 0.1秒)、最小値は0.5秒
  const baseInterval = 4000; // 4秒
  const reduction = state.enemiesKilled * 100; // 0.1秒 = 100ミリ秒
  state.spawnInterval = Math.max(500, baseInterval - reduction);
  // 表示を更新（秒単位、小数点第1位まで）
  if (spawnRateEl) {
    spawnRateEl.textContent = (state.spawnInterval / 1000).toFixed(1);
  }
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

const measureText = (txt, size=16) => { return measureTextSmart(txt, size, false); };

const drawEnemy = (e) => {
  const sizeImg = 80; const sizeText = 18;
  const img = state.imgRock;
  if (img && img.complete) {
    ctx.drawImage(img, e.x - sizeImg/2, e.y - sizeImg/2, sizeImg, sizeImg);
  }
  let ts = 30;
  setCtxFont(ts, true, e.display);
  while (ctx.measureText(e.display).width > sizeImg * 0.85 && ts > 12) { ts -= 2; setCtxFont(ts, true, e.display); }
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.strokeText(e.display, e.x, e.y + 2);
  ctx.fillStyle = '#e6edf3';
  ctx.fillText(e.display, e.x, e.y + 2);
  ctx.restore();
  const fam = getFam(e.id);
  const barH = sizeImg + 24; const barX = e.x + sizeImg/2 + 6; const barY = e.y - sizeImg/2;
  ctx.fillStyle = '#1e293b'; ctx.fillRect(barX, barY, 8, barH);
  ctx.fillStyle = '#22c55e'; ctx.fillRect(barX, barY + barH*(1-fam/100), 8, barH*(fam/100));
};

const drawBoss = () => {
  if (!state.boss || state.boss.dead) return;
  const b = state.boss;
  const sizeEmoji = 48; const sizeText = 24;
  ctx.font = `${sizeEmoji}px system-ui`;
  const emoji = '🍅';
  const tw = ctx.measureText(emoji).width;
  ctx.fillText(emoji, b.x - tw/2, b.y + sizeEmoji/3);
  setCtxFont(sizeText, true, b.display);
  const textW = ctx.measureText(b.display).width;
  const pad = 12; const boxW = textW + pad*2; const boxH = 32; const boxX = b.x - boxW/2; const boxY = b.y + sizeEmoji - 28;
  ctx.fillStyle = 'rgba(220,38,38,0.9)'; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.rect(boxX, boxY, boxW, boxH); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.fillText(b.display, b.x - textW/2, boxY + 22);
  // HPバーを表示
  const hpBarW = 120; const hpBarH = 12;
  const hpBarX = b.x - hpBarW/2; const hpBarY = b.y - sizeEmoji - 20;
  ctx.fillStyle = '#1e293b'; ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
  ctx.fillStyle = '#ef4444'; ctx.fillRect(hpBarX, hpBarY, hpBarW * (b.hp / b.maxHp), hpBarH);
  ctx.fillStyle = '#ffffff'; setCtxFont(14, true, `HP: ${b.hp}/${b.maxHp}`);
  ctx.fillText(`HP: ${b.hp}/${b.maxHp}`, b.x - 30, hpBarY - 4);
};

const drawPlayer = () => {
  const size = 128;
  const x = player.x;
  const y = player.y;
  const img = state.imgShuttle;
  if (img && img.complete) {
    ctx.drawImage(img, x - size/2, y - size/2, size, size);
  }
};

const drawBullets = () => {
  ctx.fillStyle = '#f59e0b';
  for (const b of state.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill(); }
};

const updateBullets = () => {
  for (const b of state.bullets) {
    if (b.speed) {
      // ボスへの攻撃をチェック
      if (state.boss && !state.boss.dead && b.targetId === 'boss') {
        const dx = state.boss.x - b.x;
        const dy = state.boss.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d <= 30) {
          // ボスにダメージ
          state.boss.hp--;
          explodeAt(state.boss.x, state.boss.y);
          SFX.hit();
          if (state.boss.hp <= 0) {
            // ボスを倒した
            state.boss.dead = true;
            const t = now() - state.boss.born;
            addScore(500, t, !!b.usedVoice);
            explodeAt(state.boss.x, state.boss.y);
            SFX.explode();
            // ボスの統計情報を記録
            const bossId = 'tomato'; // ボスのID
            const s = state.stats[bossId] || { ok:0, fail:0, times:[] };
            s.ok++; s.times.push(t);
            state.stats[bossId] = s;
            setFam(bossId, getFam(bossId)+10);
            setTimeout(() => {
              state.boss = null;
              advanceToNextLevel();
            }, 1000);
          }
          b.done = true;
          continue;
        }
        const step = Math.min(b.speed, d);
        b.x += dx / d * step;
        b.y += dy / d * step;
        continue;
      }
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
  // 解答表示中は敵の移動を停止
  if (state.gamePausedForAnswer) {
    return;
  }
  for (const e of state.enemies) e.x -= e.speed;
  const survive = [];
  for (const e of state.enemies) {
    if (e.x < 60) {
      if (!e.dead) failEnemy(e);
    } else survive.push(e);
  }
  state.enemies = survive;
  // ボスの移動
  if (state.boss && !state.boss.dead) {
    state.boss.x -= state.boss.speed;
    if (state.boss.x < 60) {
      // ボスが画面左端に到達したら失敗
      state.boss.dead = true;
      state.health = 0;
    }
  }
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
  state.enemiesKilled++; // 敵を倒した数を増やす
  updateSpawnRate(); // 出現頻度を更新
  updateCurrentWord();
  // 次の敵は現在の出現間隔後にスポーン（既存のタイマーより遅い場合は更新しない）
  if (now() + state.spawnInterval > state.spawnTimer) {
    state.spawnTimer = now() + state.spawnInterval;
  }
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
  // 到達した単語を再度出現可能にする（レベルが上がる前に再出現させるため）
  const index = state.usedWordIdsInLevel.indexOf(e.id);
  if (index > -1) {
    state.usedWordIdsInLevel.splice(index, 1);
  }
  updateCurrentWord();
  // 次の敵は現在の出現間隔後にスポーン（既存のタイマーより遅い場合は更新しない）
  if (now() + state.spawnInterval > state.spawnTimer) {
    state.spawnTimer = now() + state.spawnInterval;
  }
  state.missFeedbackUntil = now() + 800;
  state.shakeUntil = now() + 700;
  state.lastPenalty = 50;
  // MISS画面が閉じた後（800ミリ秒後）に解答を3秒間表示
  const answerStartTime = now() + 800;
  setTimeout(() => {
    state.gamePausedForAnswer = true;
    state.answerToShow = e.target; // 正解の単語を表示
    state.showAnswerUntil = answerStartTime + 3000; // 3秒間表示
    // 3秒後にゲームを再開
    setTimeout(() => {
      state.gamePausedForAnswer = false;
      state.answerToShow = null;
    }, 3000);
  }, 800);
  debug('FAIL id=', e.id, 'score=', state.score, 'health=', state.health);
};

const draw = () => {
  const theme = themes[state.themeIndex%themes.length];
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const grd = ctx.createLinearGradient(0,0,0,canvas.height);
  grd.addColorStop(0, theme.bg);
  grd.addColorStop(1, '#0b1225');
  ctx.fillStyle = grd; ctx.fillRect(0,0,canvas.width,canvas.height);
  if (state.bg.shooting && state.bg.shooting.complete) {
    const iw = state.bg.shooting.naturalWidth;
    const ih = state.bg.shooting.naturalHeight;
    const scale = Math.max(canvas.width/iw, canvas.height/ih);
    const w = iw * scale;
    const h = ih * scale;
    ctx.drawImage(state.bg.shooting, (canvas.width - w)/2, (canvas.height - h)/2, w, h);
  }
  const t = now();
  const ox = t < state.shakeUntil ? (rand()*2-1)*12 : 0;
  const oy = t < state.shakeUntil ? (rand()*2-1)*12 : 0;
  ctx.save();
  ctx.translate(ox, oy);
  drawPlayer();
  for (const e of state.enemies) drawEnemy(e);
  drawBoss();
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
    const text = 'Missed';
    setCtxFont(64, true, text);
    const tw = ctx.measureText(text).width;
    ctx.fillText(text, (canvas.width - tw)/2, canvas.height/2);
    const penalty = `-${state.lastPenalty}`;
    setCtxFont(40, true, penalty);
    const pw = ctx.measureText(penalty).width;
    ctx.fillText(penalty, (canvas.width - pw)/2, canvas.height/2 + 56);
    ctx.restore();
  }
  if (state.paused) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold 96px system-ui';
    const text = 'PAUSED';
    const tw = ctx.measureText(text).width;
    ctx.fillText(text, (canvas.width - tw)/2, canvas.height/2);
    ctx.restore();
  }
  if (state.answerToShow && t < state.showAnswerUntil) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#e6edf3';
    const answerText = state.answerToShow;
    setCtxFont(72, true, answerText);
    const aw = ctx.measureText(answerText).width;
    ctx.fillText(answerText, (canvas.width - aw)/2, canvas.height/2);
    ctx.restore();
  }
};

const tick = () => {
  if (!state.running) return;
  if (!state.paused && !state.gamePausedForAnswer) {
    updateEnemies();
    updateBullets();
    updateCurrentWord();
    // 敵が3体以下で、一定時間経過したらスポーン（複数敵を同時に表示可能）
    // ボスが出現している場合は通常の敵をスポーンしない
    const maxEnemies = 3;
    if (state.enemies.length < maxEnemies && now() > state.spawnTimer && !(state.boss && !state.boss.dead)) {
      spawnEnemy();
      state.spawnTimer = now() + state.spawnInterval; // 現在の出現間隔を使用
    }
    // 敵が全て消え、使用可能な単語もない場合、次のレベルに進む
    if (state.enemies.length === 0) {
      const lvl = levels[state.levelIndex];
      const pool = lvl.words.filter(w => !state.usedWordIdsInLevel.includes(w.id));
      if (pool.length === 0) {
        // ステージ1の場合、ボスを出現させる
        if (state.levelIndex === 0 && !state.boss) {
          spawnBoss();
        } else if (state.levelIndex === 0 && state.boss && !state.boss.dead) {
          // ボスがいる場合は何もしない
        } else {
          advanceToNextLevel();
          return;
        }
      }
    }
  }
  draw();
  scoreEl.textContent = Math.floor(state.score);
  healthEl.textContent = Math.floor(state.health);
  streakEl.textContent = state.streak;
  multiplierEl.textContent = `${state.multiplier}x`;
  if (state.health<=0) endLevel();
  requestAnimationFrame(tick);
};

const advanceToNextLevel = () => {
  // ゲームを一時停止
  state.running = false;
  state.paused = false;
  
  // 画面に残っている敵をクリア
  state.enemies = [];
  state.bullets = [];
  state.currentWord = null;
  
  // 現在のレベルのサマリーを表示
  const lvl = levels[state.levelIndex];
  renderSummary(lvl);
  state.summaryReady = true;
  summary.classList.remove('hidden');
  summaryToggleBtn.textContent = 'Summary (ready)';
  
  // 使用済み単語リストをリセット（次のレベル用）
  state.usedWordIdsInLevel = [];
  state.lastSpawnedWordId = null;
  
  // 自動的に次のレベルに進むのではなく、ユーザーがNext Levelボタンを押すまで待つ
};

const startLevel = () => {
  state.running = true; state.paused=false; state.score = state.score; state.health = 100; state.streak=0; state.multiplier=1; state.superModeUntil=0; state.enemies=[]; state.stats={};
  state.lastSpawnedWordId = null; // 前回出現した単語をリセット
  state.usedWordIdsInLevel = []; // 使用済み単語リストをリセット
  state.enemiesKilled = 0; // 敵を倒した数をリセット
  state.spawnInterval = 4000; // 出現間隔を4秒にリセット
  state.boss = null; // ボスをリセット
  updateSpawnRate(); // 出現頻度表示を更新
  levelNameEl.textContent = themes[state.levelIndex%themes.length].name;
  answerInput.value = '';
  answerInput.focus();
  player.y = canvas.height/2;
  // 最初の敵はすぐに出現
  spawnEnemy();
  state.spawnTimer = now() + state.spawnInterval; // 次の敵は現在の出現間隔後
  const allWords = levels.flatMap(l=>l.words);
  for (const w of allWords) { if (state.missCounts[w.id]==null) state.missCounts[w.id]=0; }
  saveMisses(state.missCounts);
  updatePauseButtons(); // ボタンの表示を更新
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
  // ステージ1の場合、ボス（トマト）の統計情報も表示
  if (state.levelIndex === 0) {
    const bossId = 'tomato';
    const s = state.stats[bossId] || { ok:0, fail:0, times:[] };
    const acc = (s.ok + s.fail)>0? Math.round(s.ok/(s.ok+s.fail)*100) : 0;
    const row = document.createElement('div');
    row.className = 'summary-row';
    const fam = getFam(bossId);
    const tAvg = Math.round(avg(s.times));
    row.innerHTML = `
      <div>トマト → tomato</div>
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
pauseBtn.onclick = () => {
  if (state.mode==='shoot') {
    state.paused = !state.paused;
    updatePauseButtons();
  } else if (state.mode==='veg' && state.veg.started) {
    state.paused = !state.paused;
    updateVegPause();
  } else if (state.mode==='pizza' && state.pizza.running) {
    state.paused = !state.paused;
    if (state.paused) {
      // ポーズ開始時：経過時間を記録
      state.pizza.pausedTime = now();
    } else {
      // ポーズ解除時：startTimeを調整してタイマーを再開
      const pausedDuration = now() - state.pizza.pausedTime;
      state.pizza.startTime += pausedDuration;
    }
  }
};
nextLevelBtn.onclick = () => { home.classList.add('hidden'); summary.classList.add('hidden'); state.levelIndex = (state.levelIndex+1)%levels.length; state.themeIndex = state.levelIndex; startLevel(); };
restartBtn.onclick = () => { home.classList.add('hidden'); summary.classList.add('hidden'); if (state.mode==='shoot') startLevel(); else if (state.mode==='veg') { resetVegRound(); } };
summaryToggleBtn.onclick = () => { home.classList.add('hidden'); if (summary.classList.contains('hidden')) { summary.classList.remove('hidden'); state.summaryReady=false; summaryToggleBtn.textContent='Summary'; } else { summary.classList.add('hidden'); } };
flashBtn.onclick = () => { home.classList.add('hidden'); if (flashcards.classList.contains('hidden')) { renderFlashcards(); flashcards.classList.remove('hidden'); } else { flashcards.classList.add('hidden'); } };
homeBtn.onclick = () => { initHome(); };
closeSummaryBtn.onclick = () => { summary.classList.add('hidden'); };
closeFlashcardsBtn.onclick = () => { flashcards.classList.add('hidden'); };
helpBtn.onclick = () => {
  help.classList.remove('hidden');
  // 遊び方ウィンドウを開いている時はゲームを一時停止
  if (state.mode === 'shoot' && state.running) {
    state.paused = true;
    updatePauseButtons();
  } else if (state.mode === 'veg' && state.veg.started) {
    state.paused = true;
    updateVegPause();
  } else if (state.mode === 'pizza' && state.pizza.running) {
    state.paused = true;
    if (!state.pizza.pausedTime) {
      state.pizza.pausedTime = now();
    }
  }
};
closeHelpBtn.onclick = () => {
  help.classList.add('hidden');
  // 遊び方ウィンドウを閉じた時はゲームを再開
  if (state.mode === 'shoot' && state.running) {
    state.paused = false;
    updatePauseButtons();
  } else if (state.mode === 'veg' && state.veg.started) {
    state.paused = false;
    updateVegPause();
  } else if (state.mode === 'pizza' && state.pizza.running) {
    state.paused = false;
    if (state.pizza.pausedTime) {
      const pausedDuration = now() - state.pizza.pausedTime;
      state.pizza.startTime += pausedDuration;
      state.pizza.pausedTime = null;
    }
  }
};
debugKillEnemyBtn.onclick = () => {
  if (state.mode === 'shoot' && state.running && !state.paused && state.currentWord) {
    const enemy = state.enemies.find(e => e.id === state.currentWord.id && !e.dead);
    if (enemy) {
      succeedEnemy(enemy, false);
    }
  }
};
debugSpawnEnemyBtn.onclick = () => {
  if (state.mode === 'shoot' && state.running && !state.paused) {
    const maxEnemies = 3;
    // 敵が最大数未満の場合のみ出現させる
    if (state.enemies.length < maxEnemies) {
      spawnEnemy();
      state.spawnTimer = now() + state.spawnInterval; // 次の敵のタイマーも更新
    }
  }
};

const initHome = () => {
  home.classList.remove('hidden');
  document.getElementById('ui').classList.add('hidden');
  document.getElementById('game').classList.add('hidden');
  veg.classList.add('hidden');
  summary.classList.add('hidden');
  flashcards.classList.add('hidden');
  if (state.veg.timerId) { clearInterval(state.veg.timerId); state.veg.timerId=null; }
  state.running = false;
  state.paused = false;
  state.pizza.running = false;
  state.mode='home';
  if (vegPause) vegPause.classList.add('hidden');
  answerInput.classList.remove('bottom-input');
  document.body.classList.remove('veg-mode');
  // デバッグボタンを非表示
  if (debugKillEnemyBtn) debugKillEnemyBtn.style.display = 'none';
  if (debugSpawnEnemyBtn) debugSpawnEnemyBtn.style.display = 'none';
  updatePauseButtons(); // ボタンの表示を更新
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
  // デバッグボタンを表示（Shooting Game専用）
  if (debugKillEnemyBtn) debugKillEnemyBtn.style.display = '';
  if (debugSpawnEnemyBtn) debugSpawnEnemyBtn.style.display = '';
  resizeCanvas();
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
  // デバッグボタンを非表示（Vegetable Cutting Raceでは不要）
  if (debugKillEnemyBtn) debugKillEnemyBtn.style.display = 'none';
  if (debugSpawnEnemyBtn) debugSpawnEnemyBtn.style.display = 'none';
};
const showPizza = () => {
  home.classList.add('hidden');
  document.getElementById('ui').classList.remove('hidden');
  document.getElementById('game').classList.remove('hidden');
  const hud = document.querySelector('.hud'); if (hud) hud.classList.remove('hidden');
  const ctr = document.querySelector('.controls'); if (ctr) ctr.classList.remove('hidden');
  state.mode='pizza';
  answerInput.classList.add('bottom-input');
  // デバッグボタンを非表示（Pizza Gameでは不要）
  if (debugKillEnemyBtn) debugKillEnemyBtn.style.display = 'none';
  if (debugSpawnEnemyBtn) debugSpawnEnemyBtn.style.display = 'none';
  resizeCanvas();
  canvas.style.border = 'none';
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
  vegCarrot.style.opacity = '1';
  const isEggplant = base === 'eggplant';
  const widthPx = isEggplant ? 448 : 560;
  vegCarrot.style.width = `${widthPx}px`;
  vegCarrot.style.maxWidth = isEggplant ? '64vw' : '80vw';
  vegCarrot.classList.remove('hidden');
};
const updateVegPause = () => {
  if (state.paused && state.mode === 'veg' && state.veg.started) {
    vegPause.classList.remove('hidden');
    // タイマーを一時停止（残り時間を保存）
    if (state.veg.timerId) {
      clearInterval(state.veg.timerId);
      state.veg.timerId = null;
      // 残り時間を計算して保存
      const elapsed = now() - state.veg.startTime;
      state.veg.timeLimitMs = Math.max(0, state.veg.timeLimitMs - elapsed);
    }
  } else {
    vegPause.classList.add('hidden');
    // ポーズ解除時、タイマーを再開
    if (state.mode === 'veg' && state.veg.started && !state.veg.timerId && state.veg.timeLimitMs > 0) {
      const start = now();
      state.veg.startTime = start;
      state.veg.timerId = setInterval(() => {
        const rem = Math.max(0, state.veg.timeLimitMs - (now()-start));
        vegTimerEl.textContent = (rem/1000).toFixed(1);
        if (rem<=0) { clearInterval(state.veg.timerId); state.veg.timerId = null; finishVegRound(); }
      }, 100);
    }
  }
};

const startVegRound = () => {
  state.veg.started = true;
  state.paused = false; // ラウンド開始時にポーズを解除
  updateVegPause();
  renderCurrentVegCard();
  const start = now(); state.veg.startTime = start;
  if (state.veg.timerId) clearInterval(state.veg.timerId);
  vegTimerEl.textContent = (state.veg.timeLimitMs/1000).toFixed(1);
  state.veg.timerId = setInterval(() => {
    if (state.paused) return; // ポーズ中はタイマーを更新しない
    const rem = Math.max(0, state.veg.timeLimitMs - (now()-start));
    vegTimerEl.textContent = (rem/1000).toFixed(1);
    if (rem<=0) { clearInterval(state.veg.timerId); state.veg.timerId = null; finishVegRound(); }
  }, 100);
  answerInput.value = '';
  answerInput.focus();
};

const startVegCountdown = () => {
  home.classList.add('hidden');
  vegCountdown.classList.remove('hidden');
  // カウントダウン中はボタンを非表示
  const controls = document.querySelector('.controls');
  const vegControls = document.querySelector('.veg-controls');
  if (controls) controls.style.display = 'none';
  if (vegControls) vegControls.style.display = 'none';
  
  let count = 3;
  vegCountdownNumber.textContent = count;
  
  const countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      vegCountdownNumber.textContent = count;
    } else if (count === 0) {
      vegCountdownNumber.textContent = 'GO!';
    } else {
      clearInterval(countdownInterval);
      vegCountdown.classList.add('hidden');
      // カウントダウン終了後、ボタンを再表示
      if (controls) controls.style.display = '';
      if (vegControls) vegControls.style.display = '';
      startVegRound();
    }
  }, 1000);
};

if (vegBackBtn) vegBackBtn.onclick = () => initHome();
vegNextSetBtn.onclick = () => proceedToNextSet();
vegRetryBtn.onclick = () => retryVegRound();
closeVegResultBtn.onclick = () => { 
  vegResult.classList.add('hidden');
  // テキストボックスのz-indexを元に戻す
  if (answerInput && answerInput.classList.contains('bottom-input')) {
    answerInput.style.zIndex = '';
  }
};
vegPassBtn.onclick = () => {
  if (!state.veg.started || state.paused) return;
  const i = state.veg.currentIndex;
  const w = state.veg.activeWords[i];
  if (!w) return;
  
  // 答えを表示
  vegPassAnswer.textContent = w.target;
  vegPassOverlay.classList.remove('hidden');
  veg.classList.add('pass-mode');
  
  // 3秒後に非表示に戻す
  setTimeout(() => {
    vegPassOverlay.classList.add('hidden');
    veg.classList.remove('pass-mode');
    
    // 次の単語に進む（パスした単語はスキップ）
    let next = i + 1;
    while (next < state.veg.activeWords.length && state.veg.activeWords[next].cut) next++;
    state.veg.currentIndex = next;
    if (state.veg.currentIndex >= state.veg.activeWords.length) {
      finishVegRound();
    } else {
      renderCurrentVegCard();
    }
  }, 3000);
};
if (chooseShooting) chooseShooting.onclick = () => { showShooting(); summary.classList.add('hidden'); startLevel(); };
if (chooseVegetable) chooseVegetable.onclick = () => { showVegetable(); setupVegSets(); resetVegRound(); startVegCountdown(); };
if (choosePizza) choosePizza.onclick = () => { showPizza(); };
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
  setTimeout(() => { 
    vegOverlay.classList.add('hidden'); 
    veg.classList.remove('veg-shake');
    // MISS画面が閉じた後（800ミリ秒後）に解答を3秒間表示
    vegPassAnswer.textContent = w.target;
    vegPassOverlay.classList.remove('hidden');
    veg.classList.add('pass-mode');
    // タイマーを一時停止
    if (state.veg.timerId) {
      clearInterval(state.veg.timerId);
      state.veg.timerId = null;
      const elapsed = now() - state.veg.startTime;
      state.veg.timeLimitMs = Math.max(0, state.veg.timeLimitMs - elapsed);
    }
    // 3秒後に正解表示を閉じて、次の問題に進む
    setTimeout(() => {
      vegPassOverlay.classList.add('hidden');
      veg.classList.remove('pass-mode');
      // 次の問題に進む（現在の単語をスキップ）
      let next = i + 1;
      while (next < state.veg.activeWords.length && state.veg.activeWords[next].cut) next++;
      state.veg.currentIndex = next;
      if (state.veg.currentIndex >= state.veg.activeWords.length) {
        finishVegRound();
      } else {
        renderCurrentVegCard();
        // タイマーを再開
        if (state.mode === 'veg' && state.veg.started && !state.veg.timerId && state.veg.timeLimitMs > 0) {
          const start = now();
          state.veg.startTime = start;
          state.veg.timerId = setInterval(() => {
            if (state.paused) return;
            const rem = Math.max(0, state.veg.timeLimitMs - (now()-start));
            vegTimerEl.textContent = (rem/1000).toFixed(1);
            if (rem<=0) { 
              clearInterval(state.veg.timerId); 
              state.veg.timerId = null; 
              finishVegRound(); 
            }
          }, 100);
        }
      }
    }, 3000);
  }, 800);
  return false;
};
const renderVegResult = () => {
  vegResultBody.innerHTML = '';
  const done = state.veg.activeWords.filter(x=>x.cut).length;
  const total = state.veg.activeWords.length;
  const accuracy = total > 0 ? Math.round((done / total) * 100) : 0;
  
  // スコアと統計情報を表示
  const statsDiv = document.createElement('div');
  statsDiv.style.marginBottom = '20px';
  statsDiv.innerHTML = `
    <div style="font-size: 24px; margin-bottom: 10px;"><strong>Score: ${state.score}</strong></div>
    <div style="font-size: 18px; margin-bottom: 5px;">Correct: ${done} / ${total}</div>
    <div style="font-size: 18px; margin-bottom: 5px;">Accuracy: ${accuracy}%</div>
    <div style="font-size: 18px;">Round: ${state.veg.round}</div>
  `;
  vegResultBody.appendChild(statsDiv);
  
  // 単語ごとの結果を表示
  const header = document.createElement('div');
  header.className = 'summary-row';
  header.innerHTML = `<strong>Word</strong><strong>Status</strong><strong>Familiarity</strong>`;
  vegResultBody.appendChild(header);
  
  for (const w of state.veg.activeWords) {
    const row = document.createElement('div');
    row.className = 'summary-row';
    const fam = getFam(w.id);
    const status = w.cut ? '✓ Correct' : '✗ Missed';
    const statusColor = w.cut ? '#10b981' : '#ef4444';
    row.innerHTML = `
      <div>${w.native} → ${w.target}</div>
      <div style="color: ${statusColor};">${status}</div>
      <div class="bar"><span style="width:${fam}%"></span></div>
    `;
    vegResultBody.appendChild(row);
  }
};
const finishVegRound = () => {
  const done = state.veg.activeWords.filter(x=>x.cut).length;
  const total = state.veg.activeWords.length;
  const full = done===total;
  if (!full) {
    const unanswered = total - done;
    const penalty = unanswered * 50;
    state.score = Math.max(0, state.score - penalty);
    vegOverlayTitle.textContent = 'Game Over';
    vegOverlayPenalty.textContent = `-${penalty}`;
    vegOverlay.classList.remove('hidden');
    veg.classList.add('veg-shake');
    setTimeout(() => { 
      vegOverlay.classList.add('hidden'); 
      veg.classList.remove('veg-shake');
      // フィードバック表示後にリザルト画面を表示
      showVegResult();
    }, 800);
  } else {
    // 全て正解した場合は褒めるメッセージと薄緑色の背景を表示
    const praiseMessages = ['Perfect!', 'Excellent!', 'Great Job!', 'Amazing!', 'Fantastic!'];
    const randomPraise = praiseMessages[Math.floor(Math.random() * praiseMessages.length)];
    vegOverlayTitle.textContent = randomPraise;
    vegOverlayPenalty.textContent = '';
    vegOverlay.classList.remove('hidden');
    veg.classList.add('veg-success');
    setTimeout(() => { 
      vegOverlay.classList.add('hidden'); 
      veg.classList.remove('veg-success');
      // フィードバック表示後にリザルト画面を表示
      showVegResult();
    }, 2000);
  }
};

const showVegResult = () => {
  // ミスした単語の処理
  for (const w of state.veg.activeWords) {
    if (!w.cut) { 
      state.missCounts[w.id] = (state.missCounts[w.id]||0)+1; 
      saveMisses(state.missCounts); 
      setFam(w.id, getFam(w.id)-10); 
      state.veg.missDifficulty[w.id] = state.veg.difficulty; 
    }
  }
  
  // タイマーを停止
  if (state.veg.timerId) { 
    clearInterval(state.veg.timerId); 
    state.veg.timerId = null; 
  }
  
  // リザルト画面を表示
  renderVegResult();
  vegResult.classList.remove('hidden');
  home.classList.add('hidden');
  // テキストボックスのz-indexを下げる
  if (answerInput) {
    answerInput.style.zIndex = '10';
  }
};

const proceedToNextSet = () => {
  // mark current set words as used and advance to next set
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
  resetVegRound();
  vegResult.classList.add('hidden');
  // テキストボックスのz-indexを元に戻す
  if (answerInput && answerInput.classList.contains('bottom-input')) {
    answerInput.style.zIndex = '';
  }
  startVegCountdown();
};

const retryVegRound = () => {
  // スコアをリセットしない（現在のスコアを維持）
  resetVegRound();
  vegResult.classList.add('hidden');
  // テキストボックスのz-indexを元に戻す
  if (answerInput && answerInput.classList.contains('bottom-input')) {
    answerInput.style.zIndex = '';
  }
  startVegCountdown();
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
    // 正解表示中（vegPassOverlayが表示されている間）は入力を無視
    if (!vegPassOverlay.classList.contains('hidden')) return;
    if (!state.veg.timerId || !state.veg.started || state.paused) return;
    tryCutWord(val);
  } else if (state.mode==='pizza') {
    if (state.paused || !state.pizza.running) return;
    const l = state.pizza.leftWord, r = state.pizza.rightWord;
    if (normalize(val)===normalize(l.target)) {
      if (state.pizza.playerSide==='right') state.pizza.playerSide='center';
      else if (state.pizza.playerSide==='center') state.pizza.playerSide='left';
      setFam(l.id, getFam(l.id)+10);
      const [lw, rw] = pickTwoWords();
      state.pizza.leftWord = { id: lw.id, native: lw.native, target: lw.target };
      state.pizza.rightWord = { id: rw.id, native: rw.native, target: rw.target };
    } else if (normalize(val)===normalize(r.target)) {
      if (state.pizza.playerSide==='left') state.pizza.playerSide='center';
      else if (state.pizza.playerSide==='center') state.pizza.playerSide='right';
      setFam(r.id, getFam(r.id)+10);
      const [lw, rw] = pickTwoWords();
      state.pizza.leftWord = { id: lw.id, native: lw.native, target: lw.target };
      state.pizza.rightWord = { id: rw.id, native: rw.native, target: rw.target };
    }
  }
});


const checkAnswer = (val, usedVoice) => {
  // ボスへの攻撃をチェック
  if (state.boss && !state.boss.dead && normalize(val) === normalize(state.boss.expect)) {
    fireBulletToEnemy({ id: 'boss' }, usedVoice);
    debug('CHECK val=', val, 'target=BOSS');
    return;
  }
  
  // 画面に表示されているすべての敵をチェック
  const aliveEnemies = state.enemies.filter(e => !e.dead);
  if (aliveEnemies.length === 0) return;
  
  // 入力された答えに一致するすべての敵を見つける
  const matchingEnemies = aliveEnemies.filter(e => normalize(val) === normalize(e.expect));
  
  if (matchingEnemies.length > 0) {
    // 一致する敵すべてに攻撃
    matchingEnemies.forEach(e => {
      fireBulletToEnemy(e, usedVoice);
    });
    debug('CHECK val=', val, 'matched enemies=', matchingEnemies.length);
  } else {
    SFX.miss();
    debug('CHECK val=', val, 'no match');
  }
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

const updatePauseButtons = () => {
  // summaryとflashcardsのボタンはポーズ中のみ表示
  if (state.mode === 'shoot' && state.running && state.paused) {
    summaryToggleBtn.style.display = '';
    flashBtn.style.display = '';
  } else {
    summaryToggleBtn.style.display = 'none';
    flashBtn.style.display = 'none';
  }
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (state.mode === 'shoot') {
      state.paused = !state.paused;
      updatePauseButtons();
    } else if (state.mode === 'veg' && state.veg.started) {
      state.paused = !state.paused;
      updateVegPause();
    } else if (state.mode === 'pizza' && state.pizza.running) {
      state.paused = !state.paused;
      if (state.paused) {
        // ポーズ開始時：経過時間を記録
        state.pizza.pausedTime = now();
      } else {
        // ポーズ解除時：startTimeを調整してタイマーを再開
        const pausedDuration = now() - state.pizza.pausedTime;
        state.pizza.startTime += pausedDuration;
      }
    }
  } else if (e.key === ' ' && state.mode === 'pizza') {
    e.preventDefault();
    if (state.pizza.pausedForMiss) {
      const [lw, rw] = pickTwoWords();
      state.pizza.leftWord = { id: lw.id, native: lw.native, target: lw.target };
      state.pizza.rightWord = { id: rw.id, native: rw.native, target: rw.target };
      state.pizza.missedAnswers = null;
      state.pizza.pausedForMiss = false;
      state.pizza.feedbackUntil = 0;
    } else if (state.pizza.running && !state.paused && state.pizza.item) {
      const it = state.pizza.item;
      const playerY = canvas.height - 60;
      const ps = 180;
      const is = 120;
      const pandaTopY = playerY - ps/2;
      it.y = pandaTopY - is/2 + 5;
    }
  }
});

initHome();
updatePauseButtons(); // 初期状態でボタンを非表示にする
// 初期状態でデバッグボタンを非表示
if (debugKillEnemyBtn) debugKillEnemyBtn.style.display = 'none';
if (debugSpawnEnemyBtn) debugSpawnEnemyBtn.style.display = 'none';
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
const pickThreeWords = () => {
  const all = allWordsFlat();
  const a = all[Math.floor(rand()*all.length)];
  let b = all[Math.floor(rand()*all.length)];
  let c = all[Math.floor(rand()*all.length)];
  const guard = new Set([a.id]);
  while (guard.has(b.id)) b = all[Math.floor(rand()*all.length)];
  guard.add(b.id);
  while (guard.has(c.id)) c = all[Math.floor(rand()*all.length)];
  return [a,b,c];
};
const startPizza = () => {
  state.pizza.running = true;
  state.paused = false;
  state.pizza.startTime = now();
  state.pizza.item = null;
  state.pizza.lastItemType = null;
  state.pizza.lastPizzaSide = null;
  const [lw, rw] = pickTwoWords();
  state.pizza.leftWord = { id: lw.id, native: lw.native, target: lw.target };
  state.pizza.rightWord = { id: rw.id, native: rw.native, target: rw.target };
  state.pizza.playerSide = 'center';
  requestAnimationFrame(tickPizza);
};
const spawnPizzaItem = () => {
  let type;
  if (state.pizza.lastItemType === 'mold') {
    type = 'pizza';
  } else {
    type = Math.random()<0.75? 'pizza':'mold';
  }
  const sides = ['left','center','right'];
  let side;
  if (type === 'pizza') {
    const last = state.pizza.lastPizzaSide;
    const avail = last ? sides.filter(s=>s!==last) : sides;
    side = avail[Math.floor(Math.random()*avail.length)];
  } else {
    side = sides[Math.floor(Math.random()*sides.length)];
  }
  const x = side==='left' ? 120 : side==='center' ? canvas.width/2 : canvas.width - 120;
  state.pizza.item = { type, side, x, y: 40, vy: 3.2 / 2.5 };
  state.pizza.lastItemType = type;
  if (type === 'pizza') state.pizza.lastPizzaSide = side;
};
const drawPizza = () => {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const grd = ctx.createLinearGradient(0,0,0,canvas.height);
  grd.addColorStop(0, '#14203b'); grd.addColorStop(1, '#0b1225');
  ctx.fillStyle = grd; ctx.fillRect(0,0,canvas.width,canvas.height);
  if (state.bg.pizza && state.bg.pizza.complete) {
    const iw = state.bg.pizza.naturalWidth;
    const ih = state.bg.pizza.naturalHeight;
    const scale = Math.max(canvas.width/iw, canvas.height/ih);
    const w = iw * scale;
    const h = ih * scale;
    ctx.drawImage(state.bg.pizza, (canvas.width - w)/2, (canvas.height - h)/2, w, h);
  }
  const leftCenterX = 120;
  const centerXMid = canvas.width/2;
  const rightCenterX = canvas.width - 120;
  const guideXs = [
    (leftCenterX + centerXMid) / 2,
    (centerXMid + rightCenterX) / 2
  ];
  ctx.fillStyle = 'rgba(147,197,253,0.7)';
  for (const gx of guideXs) {
    for (let gy = 40; gy <= canvas.height-40; gy += 16) {
      ctx.beginPath(); ctx.arc(gx, gy, 2.5, 0, Math.PI*2); ctx.fill();
    }
  }
  const yMid = canvas.height/2;
  const centerX = canvas.width/2;
  const promptLeftX = centerX - 300;
  const promptRightX = centerX + 300;
  const drawImageFit = (img, cx, cy, maxW, maxH) => {
    if (!img || !img.complete) return { w: 0, h: 0 };
    const iw = img.naturalWidth || maxW;
    const ih = img.naturalHeight || maxH;
    const scale = Math.min(maxW/iw, maxH/ih);
    const w = iw * scale;
    const h = ih * scale;
    ctx.drawImage(img, cx - w/2, cy - h/2, w, h);
    return { w, h };
  };
  const leftTxt = state.pizza.leftWord.native;
  const rightTxt = state.pizza.rightWord.native;
  const fitL = drawImageFit(state.imgArrowLeft, promptLeftX, yMid, 540, 216);
  const fitR = drawImageFit(state.imgArrowRight, promptRightX, yMid, 540, 216);
  setCtxFont(22, true, leftTxt);
  ctx.fillStyle = '#ffffff';
  let tLeftW = ctx.measureText(leftTxt).width;
  const leftShift = fitL.w ? fitL.w * 0.18 : 0;
  ctx.fillText(leftTxt, promptLeftX + leftShift - tLeftW/2, yMid + 7);
  setCtxFont(22, true, rightTxt);
  ctx.fillStyle = '#ffffff';
  let tRightW = ctx.measureText(rightTxt).width;
  const rightShift = fitR.w ? fitR.w * 0.18 : 0;
  ctx.fillText(rightTxt, promptRightX - rightShift - tRightW/2, yMid + 7);
  let px = canvas.width/2;
  if (state.pizza.playerSide==='left') px = 120;
  else if (state.pizza.playerSide==='center') px = canvas.width/2;
  else if (state.pizza.playerSide==='right') px = canvas.width-120;
  if (state.imgPanda && state.imgPanda.complete) {
    const playerY = canvas.height - 60;
    const ps = 180;
    ctx.drawImage(state.imgPanda, px - ps/2, playerY - ps/2, ps, ps);
  }
  // item
  if (!state.pizza.item) spawnPizzaItem();
  const it = state.pizza.item;
  const itemImg = it.type==='pizza'? state.imgBamboo : state.imgShoe;
  if (itemImg && itemImg.complete) {
    const is = 120;
    ctx.drawImage(itemImg, it.x - is/2, it.y - is/2, is, is);
  }
  // feedback overlay
  const t = now();
  if (t < state.pizza.successUntil) {
    ctx.fillStyle = 'rgba(34,197,94,0.22)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#22c55e'; const text = state.pizza.successTitle; setCtxFont(64, true, text); const tw = ctx.measureText(text).width;
    ctx.fillText(text, (canvas.width-tw)/2, canvas.height/2);
    const bonus = `+${state.pizza.successBonus}`; setCtxFont(40, true, bonus); const bw = ctx.measureText(bonus).width;
    ctx.fillText(bonus, (canvas.width-bw)/2, canvas.height/2+56);
  } else if (state.pizza.pausedForMiss) {
    // ミス画面（一時停止中）
    ctx.fillStyle = 'rgba(255,0,0,0.22)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#ef4444'; const text = state.pizza.feedbackTitle; setCtxFont(64, true, text); const tw = ctx.measureText(text).width;
    ctx.fillText(text, (canvas.width-tw)/2, canvas.height/2 - 120);
    const pen = `-${state.pizza.feedbackPenalty}`; setCtxFont(40, true, pen); const pw = ctx.measureText(pen).width;
    ctx.fillText(pen, (canvas.width-pw)/2, canvas.height/2 - 60);
    if (state.pizza.missedAnswers) {
      ctx.fillStyle = '#e6edf3';
      const answerYLeft = yMid + (fitL.h ? fitL.h/2 : 36) + 30;
      const answerYRight = yMid + (fitR.h ? fitR.h/2 : 36) + 30;
      const leftAnswer = state.pizza.missedAnswers.left;
      setCtxFont(28, true, leftAnswer);
      const leftAnswerW = ctx.measureText(leftAnswer).width;
      ctx.fillText(leftAnswer, promptLeftX - leftAnswerW/2, answerYLeft);
      const rightAnswer = state.pizza.missedAnswers.right;
      setCtxFont(28, true, rightAnswer);
      const rightAnswerW = ctx.measureText(rightAnswer).width;
      ctx.fillText(rightAnswer, promptRightX - rightAnswerW/2, answerYRight);
    }
    // 再開ボタンを表示
    ctx.fillStyle = '#22c55e';
    const resumeText = 'Press SPACE to Resume';
    setCtxFont(48, true, resumeText);
    const resumeW = ctx.measureText(resumeText).width;
    ctx.fillText(resumeText, (canvas.width-resumeW)/2, canvas.height/2 + 180);
  } else if (t < state.pizza.feedbackUntil) {
    // 通常のフィードバック画面（成功時など）
    ctx.fillStyle = 'rgba(255,0,0,0.22)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#ef4444'; const text = state.pizza.feedbackTitle; setCtxFont(64, true, text); const tw = ctx.measureText(text).width;
    ctx.fillText(text, (canvas.width-tw)/2, canvas.height/2);
    const pen = `-${state.pizza.feedbackPenalty}`; setCtxFont(40, true, pen); const pw = ctx.measureText(pen).width;
    ctx.fillText(pen, (canvas.width-pw)/2, canvas.height/2+56);
  }
  // ポーズ画面を描画
  if (state.paused) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#e6edf3';
    const text = 'PAUSED';
    setCtxFont(96, true, text);
    const tw = ctx.measureText(text).width;
    ctx.fillText(text, (canvas.width - tw)/2, canvas.height/2);
    ctx.restore();
  }
};
const updatePizza = () => {
  // ミス画面で一時停止中は処理をスキップ
  if (state.pizza.pausedForMiss) {
    return;
  }
  const it = state.pizza.item; if (!it) return;
  it.y += it.vy;
  // collision zone near player
  const playerY = canvas.height-60;
  const ps = 180;
  const is = 120;
  const pandaTopY = playerY - ps/2;
  const itemBottomY = it.y + is/2;
  const nearTop = Math.abs(itemBottomY - pandaTopY) < 30;
  if (nearTop) {
    if (state.pizza.playerSide==='left' && it.side==='left' || 
        state.pizza.playerSide==='center' && it.side==='center' || 
        state.pizza.playerSide==='right' && it.side==='right') {
      if (it.type==='pizza') {
        state.score += 100;
        state.effects.push({ x: it.x, y: it.y, start: now(), duration: 400 });
        SFX.hit();
        state.pizza.successTitle = 'Yummy!'; state.pizza.successBonus = 100; state.pizza.successUntil = now()+800;
      } else {
        state.score = Math.max(0, state.score-50);
        state.pizza.feedbackTitle = 'Hit Shoe'; state.pizza.feedbackPenalty = 50;
        state.pizza.feedbackUntil = now()+800; state.pizza.shakeUntil = now()+700;
      }
      state.pizza.item = null; spawnPizzaItem();
    } else {
      // avoided mold or missed pizza
      if (it.type==='pizza') {
        // ピザを拾えなかった場合もミス扱い
        state.score = Math.max(0, state.score-50);
        state.pizza.feedbackTitle = 'Missed Pizza'; state.pizza.feedbackPenalty = 50;
        state.pizza.feedbackUntil = now()+800; state.pizza.shakeUntil = now()+700;
        const l = state.pizza.leftWord, r = state.pizza.rightWord;
        state.pizza.missedAnswers = { left: l.target, right: r.target };
        // ミス画面で一時停止
        state.pizza.pausedForMiss = true;
        state.pizza.feedbackUntil = now()+999999999; // 非常に長い時間（再開ボタンで解除）
        // 降ってくるオブジェクトを一番上に戻す
        if (state.pizza.item) {
          state.pizza.item.y = 40;
        }
      }
      state.pizza.item = null; spawnPizzaItem();
    }
  } else if (it.y > canvas.height+20) {
    // fell off screen
    if (it.type==='pizza') {
      // ピザが落ちた場合もミス扱い
      state.score = Math.max(0, state.score-50);
      state.pizza.feedbackTitle = 'Missed Pizza'; state.pizza.feedbackPenalty = 50;
      state.pizza.feedbackUntil = now()+999999999; // 非常に長い時間（再開ボタンで解除）
      state.pizza.shakeUntil = now()+700;
      const l = state.pizza.leftWord, r = state.pizza.rightWord;
      state.pizza.missedAnswers = { left: l.target, right: r.target };
      // ミス画面で一時停止
      state.pizza.pausedForMiss = true;
      // 降ってくるオブジェクトを一番上に戻す（新しいアイテムが生成される前に）
    }
    state.pizza.item = null; spawnPizzaItem();
    // ピザが落ちた場合、新しいアイテムを生成した後、一番上に戻す
    if (state.pizza.pausedForMiss && state.pizza.item) {
      state.pizza.item.y = 40;
    }
  }
};
const tickPizza = () => {
  if (state.mode!=='pizza' || !state.pizza.running) return;
  if (!state.paused && !state.pizza.pausedForMiss) {
    updatePizza();
  }
  drawPizza();
  // update HUD time in health label
  if (!state.paused && !state.pizza.pausedForMiss) {
    const elapsed = now()-state.pizza.startTime; const left = Math.max(0, state.pizza.timeLimitMs - elapsed);
    healthEl.textContent = (left/1000).toFixed(1);
    scoreEl.textContent = Math.floor(state.score);
    if (left<=0) { state.pizza.running=false; initHome(); return; }
  }
  requestAnimationFrame(tickPizza);
};

/* Kana Laser — Row A (あいうえお / アイウエオ) */

const HIRA = [
  { kana: 'あ', roma: 'a' },
  { kana: 'い', roma: 'i' },
  { kana: 'う', roma: 'u' },
  { kana: 'え', roma: 'e' },
  { kana: 'お', roma: 'o' },
];
const KATA = [
  { kana: 'ア', roma: 'a' },
  { kana: 'イ', roma: 'i' },
  { kana: 'ウ', roma: 'u' },
  { kana: 'エ', roma: 'e' },
  { kana: 'オ', roma: 'o' },
];

const TUTORIAL = [
  ...HIRA.map((x) => ({ ...x, script: 'hiragana', label: 'Хирагана' })),
  ...KATA.map((x) => ({ ...x, script: 'katakana', label: 'Катакана' })),
];

const LEVEL_INFO = {
  1: {
    title: 'Уровень 1 — Буква за буквой',
    desc: 'Слушай одну букву. На экране 3 Илона Маска. Выстрели лазером в правильную букву.\nПодуровни: Хирагана (3) → Катакана (3).',
  },
  2: {
    title: 'Уровень 2 — Три в ряд',
    desc: 'Слышишь 3 буквы подряд в одном аудио. Выбери правильную комбинацию из 3 вариантов.\nПодуровни: Хирагана (3) → Катакана (3).',
  },
  3: {
    title: 'Уровень 3 — Босс Халк',
    desc: 'Слушай 5 букв в РАЗБРОС (не по алфавиту). Один Халк в центре, вокруг крутятся 5 букв — стреляй в ту, что сейчас нужна по аудио.\nПодуровни: Хирагана → Катакана.',
  },
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const imgs = {
  player: loadImg('assets/boss-baby.png'),
  elon: loadImg('assets/elon-enemy.png?v=2'),
  hulk: loadImg('assets/hulk-boss.png'),
};

function loadImg(src) {
  const i = new Image();
  i.src = src;
  return i;
}

/** Fit image inside box keeping aspect ratio */
function fitSize(img, maxW, maxH) {
  const iw = img.naturalWidth || maxW;
  const ih = img.naturalHeight || maxH;
  const scale = Math.min(maxW / iw, maxH / ih);
  return { w: iw * scale, h: ih * scale };
}

function drawSprite(img, maxW, maxH) {
  if (!img.complete || !img.naturalWidth) return null;
  const { w, h } = fitSize(img, maxW, maxH);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  return { w, h };
}

/* ---------- Speech ---------- */
let jaVoice = null;
function pickVoice() {
  const voices = speechSynthesis.getVoices();
  jaVoice =
    voices.find((v) => v.lang.startsWith('ja') && /Google|Microsoft|Kyoko|Otoya|Haruka/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith('ja')) ||
    null;
}
speechSynthesis.onvoiceschanged = pickVoice;
pickVoice();

function speakText(text, { rate = 0.85, pauseAfter = 350 } = {}) {
  return new Promise((resolve) => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (jaVoice) u.voice = jaVoice;
    u.rate = rate;
    u.pitch = 1;
    u.onend = () => setTimeout(resolve, pauseAfter);
    u.onerror = () => setTimeout(resolve, pauseAfter);
    speechSynthesis.speak(u);
  });
}

async function speakSequence(kanas, gap = 420) {
  for (const k of kanas) {
    await speakText(k, { rate: 0.8, pauseAfter: gap });
  }
}

function playBeep(ok) {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.connect(g);
    g.connect(ac.destination);
    o.type = 'sine';
    o.frequency.value = ok ? 880 : 180;
    g.gain.value = 0.08;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (ok ? 0.18 : 0.28));
    o.stop(ac.currentTime + (ok ? 0.2 : 0.3));
  } catch (_) {}
}

/* ---------- UI helpers ---------- */
const $ = (id) => document.getElementById(id);
function showScreen(id) {
  ['screen-title', 'screen-tutorial', 'screen-level', 'screen-end'].forEach((s) => {
    $(s).classList.toggle('hidden', s !== id);
  });
}
function hideScreens() {
  ['screen-title', 'screen-tutorial', 'screen-level', 'screen-end'].forEach((s) => $(s).classList.add('hidden'));
}
function showFlash(ok) {
  const f = $('flash');
  f.className = `flash show ${ok ? 'ok' : 'bad'}`;
  setTimeout(() => f.classList.add('hidden'), 350);
}
function showToast(text, ok) {
  const t = $('toast');
  t.textContent = text;
  t.className = `toast ${ok ? 'ok' : 'bad'}`;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.add('hidden'), 900);
}
function updateHud() {
  $('hud-level').textContent = `Уровень ${state.level}`;
  $('hud-script').textContent = state.script === 'hiragana' ? 'Хирагана' : 'Катакана';
  $('hud-lives').textContent = '❤'.repeat(state.lives) + '♡'.repeat(Math.max(0, 5 - state.lives));
  $('hud-coins').textContent = `🪙 ${state.coins}`;
  $('hud-progress').textContent = `${state.progress}/${state.progressMax}`;
}

/* ---------- Game state ---------- */
const keys = Object.create(null);
const state = {
  mode: 'title', // title | tutorial | levelintro | play | boss | end
  level: 1,
  script: 'hiragana',
  lives: 5,
  coins: 0,
  progress: 0,
  progressMax: 3,
  round: null,
  boss: null,
  player: { x: W / 2, y: H - 110, w: 130, h: 170, speed: 5.2 },
  lasers: [],
  enemies: [],
  bossEntity: null,
  cooldown: 0,
  locked: false,
  message: '',
  messageTimer: 0,
  particles: [],
};

function alphabet() {
  return state.script === 'hiragana' ? HIRA : KATA;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickWrong(correctRoma, n) {
  const pool = alphabet().filter((x) => x.roma !== correctRoma);
  return shuffle(pool).slice(0, n);
}

/* ---------- Tutorial ---------- */
let tutIndex = 0;

function startTutorial() {
  state.mode = 'tutorial';
  tutIndex = 0;
  showScreen('screen-tutorial');
  renderTut();
  speakCurrentTut();
}

function renderTut() {
  const item = TUTORIAL[tutIndex];
  $('tut-kana').textContent = item.kana;
  $('tut-roma').textContent = item.roma;
  $('tut-script').textContent = item.label;
  const dots = $('tut-dots');
  dots.innerHTML = TUTORIAL.map((_, i) => {
    const cls = i === tutIndex ? 'on' : i < tutIndex ? 'done' : '';
    return `<span class="${cls}"></span>`;
  }).join('');
}

async function speakCurrentTut() {
  const item = TUTORIAL[tutIndex];
  await speakText(item.kana, { rate: 0.75, pauseAfter: 200 });
}

function nextTut() {
  if (tutIndex < TUTORIAL.length - 1) {
    tutIndex++;
    renderTut();
    speakCurrentTut();
  } else {
    beginLevel(1);
  }
}

/* ---------- Levels ---------- */
function beginLevel(n) {
  state.level = n;
  state.script = 'hiragana';
  state.progress = 0;
  state.progressMax = n === 3 ? 5 : 3;
  state.mode = 'levelintro';
  $('level-title').textContent = LEVEL_INFO[n].title;
  $('level-desc').textContent = LEVEL_INFO[n].desc;
  showScreen('screen-level');
  $('hud').classList.remove('hidden');
  updateHud();
}

function startSubLevel() {
  hideScreens();
  state.locked = false;
  state.lasers = [];
  state.enemies = [];
  state.particles = [];
  state.player.x = W / 2;
  state.progress = 0;
  state.progressMax = state.level === 3 ? 5 : 3;
  updateHud();

  if (state.level === 3) {
    startBossPrep();
  } else {
    state.mode = 'play';
    nextRound();
  }
}

async function nextRound() {
  if (state.progress >= state.progressMax) {
    finishSubLevel();
    return;
  }
  state.locked = true;
  state.lasers = [];
  state.enemies = [];
  state.message = 'Слушай…';
  state.messageTimer = 999;

  if (state.level === 1) {
    const correct = alphabet()[Math.floor(Math.random() * 5)];
    const wrongs = pickWrong(correct.roma, 2);
    const opts = shuffle([correct, ...wrongs]);
    state.round = { type: 'single', correct, opts, sequence: [correct] };
    spawnEnemies(opts.map((o) => ({ label: o.kana, roma: o.roma, meta: o })));
    await speakText(correct.kana, { rate: 0.8, pauseAfter: 250 });
  } else if (state.level === 2) {
    const seq = shuffle(alphabet()).slice(0, 3);
    const correctLabel = seq.map((s) => s.kana).join('');
    const distractors = [];
    while (distractors.length < 2) {
      const fake = shuffle(alphabet()).slice(0, 3);
      const lab = fake.map((s) => s.kana).join('');
      if (lab !== correctLabel && !distractors.some((d) => d.label === lab)) {
        distractors.push({ label: lab, roma: fake.map((f) => f.roma).join('-'), meta: fake });
      }
    }
    const opts = shuffle([
      { label: correctLabel, roma: seq.map((s) => s.roma).join('-'), meta: seq, isCorrect: true },
      ...distractors.map((d) => ({ ...d, isCorrect: false })),
    ]);
    state.round = { type: 'triple', correctLabel, opts, sequence: seq };
    spawnEnemies(opts.map((o) => ({ label: o.label, roma: o.roma, meta: o, isCorrect: !!o.isCorrect })));
    await speakSequence(seq.map((s) => s.kana), 380);
  }

  state.message = 'Стреляй в правильный ответ!';
  state.messageTimer = 120;
  state.locked = false;
  state.cooldown = 20;
}

function spawnEnemies(items) {
  const n = items.length;
  const margin = 120;
  const span = W - margin * 2;
  const boxW = 120;
  const boxH = 150;
  state.enemies = items.map((it, i) => {
    const x = margin + (span * (i + 0.5)) / n;
    return {
      x,
      y: 145 + (i % 2) * 18,
      w: boxW,
      h: boxH,
      kind: 'elon',
      vx: (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.5),
      label: it.label,
      roma: it.roma,
      meta: it.meta,
      isCorrect: it.isCorrect,
      hit: false,
      bob: Math.random() * Math.PI * 2,
    };
  });
}

/* ---------- Boss level ---------- */
async function startBossPrep() {
  state.mode = 'bossprep';
  state.locked = true;
  state.enemies = [];
  state.lasers = [];
  state.bossEntity = null;
  // Scrambled order — NOT alphabet order a-i-u-e-o
  const seq = shuffle(alphabet());
  state.boss = { sequence: seq, index: 0, angle: 0 };
  state.message = 'Слушай порядок букв (разброс)…';
  state.messageTimer = 999;
  await speakSequence(seq.map((s) => s.kana), 450);
  startBossFight();
}

function startBossFight() {
  state.mode = 'boss';
  state.locked = false;
  state.progress = 0;
  state.progressMax = 5;
  updateHud();
  const seq = state.boss.sequence;
  const cx = W / 2;
  const cy = 210;
  state.bossEntity = {
    x: cx,
    y: cy,
    w: 200,
    h: 240,
  };
  // One Hulk + 5 orbiting letter orbs (visual scatter, shoot by audio order)
  state.enemies = seq.map((s, i) => {
    const base = (i / 5) * Math.PI * 2;
    return {
      kind: 'orb',
      label: s.kana,
      roma: s.roma,
      meta: s,
      order: i, // position in scrambled audio sequence
      hit: false,
      angle: base,
      radius: 175,
      cx,
      cy,
      w: 56,
      h: 56,
      x: cx,
      y: cy,
      bob: 0,
    };
  });
  const next = seq[0];
  state.message = `Халк! Стреляй по порядку аудио → сейчас: ${next.kana} (${next.roma})`;
  state.messageTimer = 200;
  state.cooldown = 15;
}

function onBossHit(enemy) {
  const need = state.boss.index;
  if (enemy.order === need) {
    enemy.hit = true;
    state.boss.index++;
    state.progress++;
    state.coins += 15;
    burst(enemy.x, enemy.y, true);
    playBeep(true);
    showFlash(true);
    showToast(`Верно: ${enemy.label} (${enemy.roma})`, true);
    updateHud();
    if (state.boss.index >= 5) {
      state.locked = true;
      setTimeout(() => finishSubLevel(), 700);
    } else {
      const next = state.boss.sequence[state.boss.index];
      state.message = `Дальше: ${next.kana} (${next.roma})`;
      state.messageTimer = 120;
    }
  } else {
    const needLetter = state.boss.sequence[need];
    loseLife(`Не та! Нужна ${needLetter.kana} (${needLetter.roma})`);
    burst(enemy.x, enemy.y, false);
  }
}

function finishSubLevel() {
  state.locked = true;
  if (state.script === 'hiragana') {
    state.script = 'katakana';
    state.progress = 0;
    updateHud();
    showToast('Подуровень: Катакана!', true);
    setTimeout(() => {
      if (state.level === 3) startBossPrep();
      else {
        state.mode = 'play';
        state.locked = false;
        nextRound();
      }
    }, 900);
  } else if (state.level < 3) {
    beginLevel(state.level + 1);
  } else {
    winGame();
  }
}

function loseLife(msg) {
  state.lives--;
  playBeep(false);
  showFlash(false);
  showToast(msg || 'Мимо!', false);
  updateHud();
  if (state.lives <= 0) {
    gameOver();
  }
}

function resolveHit(enemy) {
  if (state.locked || enemy.hit) return;
  if (state.mode === 'boss') {
    onBossHit(enemy);
    return;
  }

  let ok = false;
  if (state.level === 1) {
    ok = enemy.roma === state.round.correct.roma;
  } else if (state.level === 2) {
    ok = enemy.label === state.round.correctLabel || enemy.isCorrect === true;
  }

  if (ok) {
    enemy.hit = true;
    state.progress++;
    state.coins += state.level === 1 ? 10 : 20;
    burst(enemy.x, enemy.y, true);
    playBeep(true);
    showFlash(true);
    showToast('Верно! +монеты', true);
    updateHud();
    state.locked = true;
    setTimeout(() => nextRound(), 750);
  } else {
    loseLife('Неправильная буква!');
    burst(enemy.x, enemy.y, false);
  }
}

function winGame() {
  state.mode = 'end';
  $('end-title').textContent = 'Ряд А пройден!';
  $('end-msg').textContent = 'Хирагана и катакана ряда А под контролем Босса Молокососа.';
  $('end-coins').textContent = `🪙 ${state.coins}`;
  showScreen('screen-end');
}

function gameOver() {
  state.mode = 'end';
  $('end-title').textContent = 'Игра окончена';
  $('end-msg').textContent = 'Жизни закончились. Попробуй ещё раз!';
  $('end-coins').textContent = `🪙 ${state.coins}`;
  showScreen('screen-end');
}

function resetGame() {
  state.lives = 5;
  state.coins = 0;
  state.level = 1;
  state.script = 'hiragana';
  state.lasers = [];
  state.enemies = [];
  state.particles = [];
  updateHud();
  startTutorial();
}

/* ---------- Input ---------- */
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'Space' && (state.mode === 'play' || state.mode === 'boss') && !state.locked) {
    shoot();
  }
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

canvas.addEventListener('pointerdown', () => {
  if ((state.mode === 'play' || state.mode === 'boss') && !state.locked) shoot();
});

function shoot() {
  if (state.cooldown > 0) return;
  state.cooldown = 14;
  const p = state.player;
  state.lasers.push({
    x: p.x,
    y: p.y - p.h / 2,
    vy: -14,
    w: 4,
    h: 22,
  });
}

/* ---------- Particles ---------- */
function burst(x, y, ok) {
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1 + Math.random() * 4;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 30 + Math.random() * 20,
      color: ok ? '#3dff9a' : '#ff4d6d',
    });
  }
}

/* ---------- Update / Draw ---------- */
function update() {
  if (state.mode !== 'play' && state.mode !== 'boss' && state.mode !== 'bossprep') return;

  const p = state.player;
  let dx = 0;
  let dy = 0;
  if (keys.ArrowLeft || keys.KeyA) dx -= 1;
  if (keys.ArrowRight || keys.KeyD) dx += 1;
  if (keys.ArrowUp || keys.KeyW) dy -= 1;
  if (keys.ArrowDown || keys.KeyS) dy += 1;
  if (dx || dy) {
    const len = Math.hypot(dx, dy) || 1;
    p.x += (dx / len) * p.speed;
    p.y += (dy / len) * p.speed;
  }
  p.x = Math.max(60, Math.min(W - 60, p.x));
  p.y = Math.max(H * 0.42, Math.min(H - 70, p.y));

  if (state.cooldown > 0) state.cooldown--;
  if (state.messageTimer > 0) state.messageTimer--;

  // enemies float / orbit
  for (const e of state.enemies) {
    if (e.hit) continue;
    e.bob += 0.04;
    if (state.mode === 'play') {
      e.x += e.vx;
      if (e.x < 70 || e.x > W - 70) e.vx *= -1;
    } else if (state.mode === 'boss' && e.kind === 'orb') {
      e.angle += 0.018;
      e.x = e.cx + Math.cos(e.angle) * e.radius;
      e.y = e.cy + Math.sin(e.angle) * e.radius * 0.72;
    }
  }

  // lasers
  for (const L of state.lasers) {
    L.y += L.vy;
  }
  state.lasers = state.lasers.filter((L) => L.y > -30);

  // collisions
  if (!state.locked) {
    for (const L of state.lasers) {
      for (const e of state.enemies) {
        if (e.hit) continue;
        const ey = state.mode === 'boss' && e.kind === 'orb' ? e.y : e.y + Math.sin(e.bob) * 8;
        const hw = e.kind === 'orb' ? e.w / 2 + 8 : e.w / 2;
        const hh = e.kind === 'orb' ? e.h / 2 + 8 : e.h / 2;
        if (L.x > e.x - hw && L.x < e.x + hw && L.y > ey - hh && L.y < ey + hh) {
          L.y = -999;
          resolveHit(e);
        }
      }
    }
  }

  for (const pt of state.particles) {
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
  }
  state.particles = state.particles.filter((pt) => pt.life > 0);
}

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  // Animated GIF lives under canvas (#bg-gif); light vignette only
  const g = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, H * 0.8);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  if (state.mode === 'title' || state.mode === 'tutorial' || state.mode === 'levelintro' || state.mode === 'end') {
    return;
  }

  // Boss Hulk (single) behind orbiting letters
  if ((state.mode === 'boss' || state.mode === 'bossprep') && state.bossEntity) {
    const b = state.bossEntity;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = 'rgba(40, 255, 80, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, b.h * 0.42, b.w * 0.38, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    const drawnBoss = drawSprite(imgs.hulk, b.w, b.h);
    if (!drawnBoss) {
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(-60, -80, 120, 160);
    }
    ctx.restore();
  }

  // enemies: Elon (L1–2) or orbiting kana orbs (L3)
  for (const e of state.enemies) {
    if (e.hit) continue;
    if (e.kind === 'orb') {
      const isNext = state.boss && state.boss.index === e.order;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fillStyle = isNext ? 'rgba(61,255,154,0.95)' : 'rgba(8,14,36,0.88)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = isNext ? '#fff' : 'rgba(120,200,255,0.65)';
      ctx.stroke();
      if (isNext) {
        ctx.shadowColor = '#3dff9a';
        ctx.shadowBlur = 18;
      }
      ctx.fillStyle = isNext ? '#041018' : '#fff';
      ctx.font = '700 28px "Noto Sans JP", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.label, 0, 1);
      ctx.shadowBlur = 0;
      ctx.restore();
      continue;
    }

    const ey = e.y + Math.sin(e.bob) * 8;
    ctx.save();
    ctx.translate(e.x, ey);
    ctx.fillStyle = 'rgba(255, 80, 120, 0.12)';
    ctx.beginPath();
    ctx.ellipse(0, 28, e.w * 0.42, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    const drawn = drawSprite(imgs.elon, e.w, e.h);
    if (!drawn) {
      ctx.fillStyle = '#333';
      ctx.fillRect(-40, -50, 80, 100);
    }
    const badgeY = (drawn ? drawn.h / 2 : e.h / 2) - 4;
    const label = e.label;
    const fontSize = label.length > 2 ? 20 : 34;
    const badgeW = label.length > 2 ? 108 : 88;
    ctx.fillStyle = 'rgba(5,10,30,0.82)';
    drawRoundedRect(-badgeW / 2, badgeY, badgeW, 38, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,200,255,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${fontSize}px "Noto Sans JP", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, badgeY + 20);
    ctx.restore();
  }

  // lasers
  for (const L of state.lasers) {
    const lg = ctx.createLinearGradient(L.x, L.y, L.x, L.y + L.h);
    lg.addColorStop(0, '#fff');
    lg.addColorStop(0.4, '#5ee7ff');
    lg.addColorStop(1, 'rgba(94,231,255,0)');
    ctx.fillStyle = lg;
    ctx.shadowColor = '#5ee7ff';
    ctx.shadowBlur = 12;
    ctx.fillRect(L.x - L.w / 2, L.y, L.w, L.h);
    ctx.shadowBlur = 0;
  }

  // player — larger Boss Baby, proportional
  const p = state.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  const playerDrawn = drawSprite(imgs.player, p.w, p.h);
  if (!playerDrawn) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-40, -55, 80, 110);
  }
  ctx.restore();

  // particles
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / 40);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // message banner
  if (state.message && state.messageTimer > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    drawRoundedRect(W / 2 - 260, 24, 520, 42, 12);
    ctx.fill();
    ctx.fillStyle = '#cfe8ff';
    ctx.font = '700 16px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.message, W / 2, 46);
  }

  // replay tip
  if ((state.mode === 'play' || state.mode === 'boss') && !state.locked) {
    ctx.fillStyle = 'rgba(200,220,255,0.55)';
    ctx.font = '12px Nunito, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('R — повторить аудио', 16, H - 16);
  }
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && (state.mode === 'play' || state.mode === 'boss') && !state.locked) {
    replayAudio();
  }
});

async function replayAudio() {
  if (state.level === 1 && state.round) {
    await speakText(state.round.correct.kana, { rate: 0.8, pauseAfter: 100 });
  } else if (state.level === 2 && state.round) {
    await speakSequence(state.round.sequence.map((s) => s.kana), 350);
  } else if (state.level === 3 && state.boss) {
    await speakSequence(state.boss.sequence.map((s) => s.kana), 400);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

/* ---------- Buttons ---------- */
$('btn-start').onclick = () => startTutorial();
$('btn-tut-next').onclick = () => nextTut();
$('btn-tut-replay').onclick = () => speakCurrentTut();
$('btn-tut-skip').onclick = () => beginLevel(1);
$('btn-level-go').onclick = () => startSubLevel();
$('btn-restart').onclick = () => resetGame();

// unlock speech on first gesture
document.body.addEventListener(
  'click',
  () => {
    pickVoice();
    if (speechSynthesis.paused) speechSynthesis.resume();
  },
  { once: true }
);

loop();

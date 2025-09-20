// Mobile menu
const toggle = document.querySelector('.nav__toggle');
const menu = document.getElementById('menu');
if (toggle && menu){
  toggle.addEventListener('click', ()=>{
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Закриваємо меню автоматично при кліку на будь-яке посилання всередині меню
  menu.addEventListener('click', (e) => {
    const link = e.target.closest && e.target.closest('a');
    if (!link) return;
    // Невелика затримка дозволяє браузеру виконати перехід/скрол перед закриттям
    setTimeout(() => {
      if (menu.classList.contains('open')) {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    }, 50);
  });
}

// Theme toggle
const themeBtn = document.querySelector('.theme-toggle');
const root = document.documentElement;
function setTheme(mode){
  root.setAttribute('data-theme', mode);
  localStorage.setItem('theme', mode);
}
if (themeBtn){
  themeBtn.addEventListener('click', ()=>{
    const current = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(current);
  });
  const saved = localStorage.getItem('theme');
  if (saved) setTheme(saved);
}

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Respect reduced motion
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  document.querySelectorAll('*').forEach(el => el.style.scrollBehavior = 'auto');
}

// --- Hero cubes animation ---
(() => {
  const canvas = document.getElementById('hero-cubes');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  let DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  let W = 0, H = 0;

  const WORD = 'Determine';
  const FONT_FAMILY = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  const ACCENT = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#18c4a0';
  const BASE = 'rgba(255, 255, 255, 1)';
  const BG_FADE = 0.08;
  const PIXEL_STEP = 4;
  const CUBE = 2.6;
  const MAX_PARTICLES = 1200;

  let particles = [];
  let targets = [];
  let scatter = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = Math.floor(rect.width * DPR);
    H = Math.floor(rect.height * DPR);
    canvas.width = W; canvas.height = H;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(DPR, DPR);

    buildTargets();
    buildScatter();
    spawnParticles();
  }

  function buildTargets() {
    targets = [];
    const off = document.createElement('canvas');
    const octx = off.getContext('2d');

    // використовуємо розміри в device pixels (W/H вже множені на DPR)
    off.width = Math.min(W, 1400);
    off.height = Math.min(H, 400);

    octx.clearRect(0,0,off.width, off.height);
    // вимикаємо згладжування щоб текст був різким при масштабуванні
    octx.imageSmoothingEnabled = false;

    // Розрахунок розміру шрифту у device-px — дає чіткий великий шрифт на мобілці
    const baseFont = Math.floor(off.width * 0.15); // ~15% від ширини в device px
    const fontSize = Math.max(80, Math.min(baseFont, 300)); // clamp: 80..300
    octx.fillStyle = '#fff';
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.font = `800 ${fontSize}px ${FONT_FAMILY}`;

    const cx = off.width / 2;
    const cy = off.height * 0.58;
    octx.fillText(WORD, cx, cy);

    const { data, width, height } = octx.getImageData(0, 0, off.width, off.height);

    // робимо крок сканування пропорційно DPR — щоб позиції були точніші
    const scanStep = Math.max(3, PIXEL_STEP);

    for (let y = 0; y < height; y += scanStep){
      for (let x = 0; x < width; x += scanStep){
        const idx = (y * width + x) * 4 + 3;
        if (data[idx] > 128){
          targets.push({
            // перетворюємо з device-px назад у CSS-px (ділимо на DPR) і округлюємо
            x: Math.round((canvas.clientWidth - off.width / DPR) / 2 + x / DPR),
            y: Math.round((canvas.clientHeight - off.height / DPR) / 2 + y / DPR)
          });
        }
      }
    }

    if (targets.length > MAX_PARTICLES){
      const ratio = MAX_PARTICLES / targets.length;
      targets = targets.filter((_, i) => i % Math.floor(1/ratio || 1) === 0);
    }
  }

  function buildScatter() {
    scatter = targets.map(() => ({
      x: Math.random() * canvas.clientWidth,
      y: Math.random() * canvas.clientHeight
    }));
  }

  function spawnParticles() {
    const n = targets.length;
    particles = new Array(n).fill(0).map((_, i) => {
      const t = targets[i];
      return {
        x: t.x + (Math.random()*50 - 25),
        y: t.y + (Math.random()*50 - 25),
        vx: 0, vy: 0,
        size: CUBE + (Math.random()*0.8 - 0.4),
        hue: Math.random() < 0.25 ? ACCENT : BASE
      };
    });
  }

  // цикл: довше зібране, потім розлітається й знову збирається
  function getPhase(time) {
    const cycle = 10000; // 10 секунд
    const t = (time % cycle) / cycle;

    if (t < 0.6) {
      return 1; // 6 сек стоїть зібране
    } else if (t < 0.8) {
      return 1 - (t - 0.6) / 0.2; // 2 сек розлітається
    } else {
      return (t - 0.8) / 0.2; // 2 сек збирається назад
    }
  }

  function tick(time) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(0,0,0,${BG_FADE})`;
    ctx.fillRect(0,0,canvas.clientWidth, canvas.clientHeight);
    ctx.restore();

    const phase = getPhase(time);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const t = targets[i];
      const s = scatter[i];

      const targetX = s.x * (1 - phase) + t.x * phase;
      const targetY = s.y * (1 - phase) + t.y * phase;

      p.vx += (targetX - p.x) * 0.03;
      p.vy += (targetY - p.y) * 0.03;
      p.vx *= 0.9;
      p.vy *= 0.9;

      p.x += p.vx;
      p.y += p.vy;

      ctx.fillStyle = p.hue;
      const sz = p.size;
      ctx.fillRect(p.x - sz/2, p.y - sz/2, sz, sz);
    }

    rafId = requestAnimationFrame(tick);
  }

  let rafId = null;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(rafId);
    resize();
    rafId = requestAnimationFrame(tick);
  });
  ro.observe(canvas);

  if (themeBtn){
    themeBtn.addEventListener('click', () => {
      const newAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      particles.forEach(p => { if (p.hue !== BASE) p.hue = newAccent; });
    });
  }
})();

// Contact form -> показати "дякуємо" після відправки
const form = document.getElementById('contactForm');
const thankYou = document.getElementById('thankYouMessage');

if (form && thankYou) {
  form.addEventListener('submit', function () {
    setTimeout(() => {
      form.style.display = 'none';
      thankYou.style.display = 'block';
    }, 500); // невелика затримка, щоб Google Forms встиг прийняти дані
  });
}


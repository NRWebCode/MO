const SCHEDULE = [
    {
        index: 0,
        id: 'abismo',
        label: 'I · ABISMO',
        file: 'index.html',
        start: '2026-11-26T00:00:00',
        end:   '2026-12-03T00:00:00'
    },
    {
        index: 1,
        id: 'transmision',
        label: 'II · TRANSMISIÓN',
        file: 'transmision.html',
        start: '2026-12-03T00:00:00',
        end:   '2026-12-10T00:00:00'
    },
    {
        index: 2,
        id: 'biblioteca',
        label: 'III · BIBLIOTECA',
        file: 'biblioteca.html',
        start: '2026-12-10T00:00:00',
        end:   '2026-12-17T00:00:00'
    },
    {
        index: 3,
        id: 'cuenta-atras',
        label: 'IV · CUENTA ATRÁS',
        file: 'cuenta-atras.html',
        start: '2026-12-17T00:00:00',
        end:   '2026-12-24T19:00:00' // Fin de cuenta regresiva: 24 dic 2026 a las 19:00
    },
    {
        index: 4,
        id: 'umbral',
        label: 'V · UMBRAL (2H)',
        file: 'umbral.html',
        start: '2026-12-24T19:00:00', // Inicia a las 19:00 tras el fin de la cuenta regresiva
        end:   '2026-12-24T21:00:00' // Dura 2 horas (hasta las 21:00)
    },
    {
        index: 5,
        id: 'menu',
        label: 'VI · ARCHIVO ABIERTO',
        file: 'archivo-abierto.html',
        start: '2026-12-24T21:00:00', // Permanente a partir de ahí
        end:   null
    }
];

// Destino externo exclusivo para celulares en la Fase 4 (umbral.html)
const MOBILE_EXTERNAL_URL = 'https://ejemplo-externo-arg.org/señal';

// Clave para forzar modo en pruebas sin alterar el reloj
const OVERRIDE_KEY = 'arg_phase_override';

let currentPhaseIndex = 0;

function getScheduledPhaseIndex(nowMs = Date.now()) {
    for (let i = 0; i < SCHEDULE.length; i++) {
        const entry = SCHEDULE[i];
        const startMs = new Date(entry.start).getTime();
        const endMs = entry.end ? new Date(entry.end).getTime() : Infinity;

        if (nowMs >= startMs && nowMs < endMs) {
            return entry.index;
        }
    }
    // Si la fecha actual es anterior al inicio del cronograma, cae en index.html (Fase 0)
    const firstStart = new Date(SCHEDULE[0].start).getTime();
    return nowMs < firstStart ? 0 : SCHEDULE.length - 1;
}

function getActivePhaseIndex() {
    const params = new URLSearchParams(window.location.search);
    const paramVal = params.get('fase');

    if (paramVal !== null) {
        const parsed = parseInt(paramVal, 10);
        if (!Number.isNaN(parsed) && SCHEDULE[parsed]) {
            sessionStorage.setItem(OVERRIDE_KEY, String(parsed));
            return parsed;
        }
        if (paramVal === 'auto') {
            sessionStorage.removeItem(OVERRIDE_KEY);
            return getScheduledPhaseIndex();
        }
    }

    const savedOverride = sessionStorage.getItem(OVERRIDE_KEY);
    if (savedOverride !== null) {
        const parsed = parseInt(savedOverride, 10);
        if (!Number.isNaN(parsed) && SCHEDULE[parsed]) {
            return parsed;
        }
    }

    return getScheduledPhaseIndex();
}

function getCurrentFileName() {
    const path = window.location.pathname;
    const file = path.substring(path.lastIndexOf('/') + 1);
    return file === '' ? 'index.html' : file;
}

// Navega a la fase indicada (usado por teclado, botones o consola)
window.goToPhase = function(index, persistOverride = true) {
    if (index < 0 || index >= SCHEDULE.length) return;

    if (persistOverride) {
        sessionStorage.setItem(OVERRIDE_KEY, String(index));
    } else {
        sessionStorage.removeItem(OVERRIDE_KEY);
    }

    const targetFile = SCHEDULE[index].file;
    if (getCurrentFileName() !== targetFile) {
        window.location.href = targetFile;
    } else {
        currentPhaseIndex = index;
        renderDevBar();
    }
};

window.resetToSchedule = function() {
    sessionStorage.removeItem(OVERRIDE_KEY);
    const scheduled = getScheduledPhaseIndex();
    window.location.href = SCHEDULE[scheduled].file;
};

function setupRotationControls() {
    window.addEventListener('keydown', (e) => {
        // 1 a 6: saltar directo a la fase correspondiente
        if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
            window.goToPhase(parseInt(e.key, 10) - 1, true);
            return;
        }

        // Flecha derecha o Espacio: rotar a la siguiente fase
        if (e.key === 'ArrowRight' || e.key === ' ') {
            e.preventDefault();
            const next = (currentPhaseIndex + 1) % SCHEDULE.length;
            window.goToPhase(next, true);
            return;
        }

        // Flecha izquierda: retroceder a la fase anterior
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prev = (currentPhaseIndex - 1 + SCHEDULE.length) % SCHEDULE.length;
            window.goToPhase(prev, true);
            return;
        }

        // Tecla 'r': volver a la fase que corresponde por fecha/hora real
        if (e.key.toLowerCase() === 'r') {
            window.resetToSchedule();
        }
    });
}

function renderDevBar() {
    let bar = document.getElementById('dev-rotation-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'dev-rotation-bar';
        bar.className = 'dev-bar';
        document.body.appendChild(bar);
    }

    const isOverride = sessionStorage.getItem(OVERRIDE_KEY) !== null;

    bar.innerHTML = '';
    SCHEDULE.forEach((item) => {
        const btn = document.createElement('button');
        btn.textContent = item.label;
        if (item.index === currentPhaseIndex) btn.classList.add('active');
        btn.onclick = () => window.goToPhase(item.index, true);
        bar.appendChild(btn);
    });

    const autoBtn = document.createElement('button');
    autoBtn.textContent = isOverride ? 'AUTO (FORZADO)' : 'AUTO (FECHA)';
    autoBtn.onclick = () => window.resetToSchedule();
    bar.appendChild(autoBtn);
}

function isMobileDevice() {
    const narrowScreen = window.matchMedia('(max-width: 768px)').matches;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const mobileUA = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return (narrowScreen && coarsePointer) || mobileUA;
}

/* ==========================================
   INICIALIZACIÓN POR PÁGINA
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    const pageType = document.body.dataset.page;
    const expectedPhase = getActivePhaseIndex();
    const expectedFile = SCHEDULE[expectedPhase].file;
    const currentFile = getCurrentFileName();

    // Redirección automática si la página abierta no coincide con la fase activa
    // (En archivo-abierto.html se permite navegar libremente a cualquier fase desde el menú)
    if (pageType !== 'menu' && currentFile !== expectedFile) {
        window.location.replace(expectedFile);
        return;
    }

    currentPhaseIndex = pageType === 'menu'
        ? SCHEDULE.findIndex(s => s.file === currentFile)
        : expectedPhase;

    setupRotationControls();
    renderDevBar();

    if (pageType === 'void') initVoidPage();
    if (pageType === 'audio') initAudioPage();
    if (pageType === 'library') initLibraryPage();
    if (pageType === 'countdown') initCountdownPage();
    if (pageType === 'threshold') initThresholdPage();
});

/* ==========================================
   FASE 0: ABISMO (index.html)
   ========================================== */
function initVoidPage() {
    const canvas = document.getElementById('void-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const glyphEl = document.getElementById('ghost-glyph');
    const glyphs = ['☿', '⚸', '♄', '☩', '⸸', '⟁', '⌖', '⚳'];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    setInterval(() => {
        if (glyphEl && Math.random() > 0.72) {
            glyphEl.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
            glyphEl.style.transform = `translate(${(Math.random() - 0.5) * 320}px, ${(Math.random() - 0.5) * 320}px)`;
            glyphEl.style.opacity = String(0.2 + Math.random() * 0.55);
            setTimeout(() => {
                glyphEl.style.opacity = '0';
            }, 130);
        }
    }, 550);

    function draw() {
        ctx.fillStyle = 'rgba(3, 3, 3, 0.12)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (Math.random() > 0.84) {
            ctx.strokeStyle = 'rgba(158, 11, 15, 0.28)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, canvas.height / 2);
            ctx.lineTo(
                mouse.x + (Math.random() - 0.5) * 110,
                mouse.y + (Math.random() - 0.5) * 110
            );
            ctx.stroke();
        }
        requestAnimationFrame(draw);
    }
    draw();
}

/* ==========================================
   FASE 1: TRANSMISIÓN / AUDIO (transmision.html)
   ========================================== */
function initAudioPage() {
    const audioEl = document.getElementById('ritual-audio');
    const trigger = document.getElementById('audio-trigger');
    if (!trigger) return;

    let started = false;
    let synthCtx = null;

    const startDroneSynth = () => {
        if (synthCtx) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        synthCtx = new AudioContextClass();

        const osc1 = synthCtx.createOscillator();
        const osc2 = synthCtx.createOscillator();
        const filter = synthCtx.createBiquadFilter();
        const gain = synthCtx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.value = 55;
        osc2.type = 'sine';
        osc2.frequency.value = 58.5;

        filter.type = 'lowpass';
        filter.frequency.value = 140;
        gain.gain.value = 0.15;

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(synthCtx.destination);

        osc1.start();
        osc2.start();
    };

    const startAudio = () => {
        if (started) return;
        started = true;
        trigger.classList.add('playing');

        if (audioEl) {
            audioEl.play().catch(() => {
                startDroneSynth();
            });
        } else {
            startDroneSynth();
        }
    };

    startAudio();
    trigger.addEventListener('click', startAudio);
    document.body.addEventListener('click', startAudio, { once: true });
}

/* ==========================================
   FASE 2: BIBLIOTECA (biblioteca.html)
   ========================================== */
function initLibraryPage() {
    const nodes = document.querySelectorAll('.node');
    const viewer = document.getElementById('viewer');
    const viewerContent = document.getElementById('viewer-content');
    const closeBtn = document.getElementById('close-viewer');

    if (!viewer || !viewerContent || !closeBtn) return;

    nodes.forEach((node) => {
        node.addEventListener('click', () => {
            const type = node.dataset.type;
            const content = node.dataset.content || '';

            if (type === 'symbol') {
                viewerContent.innerHTML = `<div style="font-size: 2.5rem; color: #ff1e27; letter-spacing: 1rem;">${content}</div>`;
            } else if (type === 'sigil') {
                viewerContent.innerHTML = `<svg width="200" height="200" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="80" stroke="#9e0b0f" fill="none" stroke-width="1"/>
                    <polygon points="100,20 170,140 30,140" stroke="#b8b2a6" fill="none" stroke-width="1"/>
                    <polygon points="100,180 170,60 30,60" stroke="#9e0b0f" fill="none" stroke-width="1"/>
                    <circle cx="100" cy="100" r="12" fill="#ff1e27"/>
                </svg>`;
            } else if (type === 'file') {
                viewerContent.innerHTML = `<p style="margin-bottom: 1.5rem;">${content}</p><a href="${node.dataset.url || '#'}" target="_blank" style="color:#ff1e27; letter-spacing:0.25rem;">[ ABRIR DOCUMENTO ]</a>`;
            } else {
                viewerContent.textContent = content;
            }

            viewer.classList.remove('hidden');
        });
    });

    closeBtn.addEventListener('click', () => {
        viewer.classList.add('hidden');
    });
}

/* ==========================================
   FASE 3: CUENTA ATRÁS (cuenta-atras.html)
   ========================================== */
function initCountdownPage() {
    const timerEl = document.getElementById('timer');
    if (!timerEl) return;

    // Coincide con el cierre de la Fase 3 / apertura de la Fase 4 (19:00)
    const targetMs = new Date(SCHEDULE[3].end).getTime();

    function update() {
        const diff = Math.max(0, targetMs - Date.now());
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / (1000 * 60)) % 60);
        const secs = Math.floor((diff / 1000) % 60);

        const pad = (n) => String(n).padStart(2, '0');
        timerEl.textContent = `${pad(days)}:${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    }

    update();
    setInterval(update, 1000);
}

/* ==========================================
   FASE 4: MÓVIL -> EXTERNO / PC -> TEXTO LARGO (umbral.html)
   ========================================== */
function initThresholdPage() {
    const mobileBox = document.getElementById('mobile-view');
    const pcBox = document.getElementById('pc-view');
    const directLink = document.getElementById('mobile-external-link');

    if (directLink) {
        directLink.href = MOBILE_EXTERNAL_URL;
    }

    if (isMobileDevice()) {
        if (pcBox) pcBox.classList.add('hidden');
        if (mobileBox) mobileBox.classList.remove('hidden');

        // Redirección automática en celular tras breve instante
        setTimeout(() => {
            window.location.href = MOBILE_EXTERNAL_URL;
        }, 900);
    } else {
        if (mobileBox) mobileBox.classList.add('hidden');
        if (pcBox) pcBox.classList.remove('hidden');
    }
}
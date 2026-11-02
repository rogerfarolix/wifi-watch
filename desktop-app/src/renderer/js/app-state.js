/**
 * Wifi-Watch — Renderer : État global, utilitaires et synthétiseur audio
 * (module issu du découpage d'app.js ; scripts classiques, portée globale partagée)
 */

/**
 * Wifi-Watch — Renderer Client Application
 * Gère l'interface réactive, les graphiques temps réel, les événements réseau
 * et les nouvelles fonctionnalités (Radar, Speedtest, Analyseur Wi-Fi, WoL, Audit).
 */

// ─── État Global ────────────────────────────────────────────────────────────
let appState = {
    currentView: 'dashboard',
    environment: null,
    devices: [],
    alerts: [],
    stats: {},
    settings: {
        scanInterval: 30,
        notifications: true,
        soundAlerts: true,
        autoScan: true,
        minimizeToTray: true
    },
    deviceFilter: 'all',
    alertFilter: 'all',
    searchQuery: '',
    viewMode: 'grid', // 'grid' | 'table'
    liveChart: null,
    monitorChart: null,
    radar: null,
    isSpeedTesting: false,
    voiceSentinel: null,
    spyResults: null,
    ruviewVisualizer: null,
    ruviewRunning: false,
    wallboardRadar: null,
    wanInfo: null,
    shodanAudit: null,
    wallboardClockInterval: null
};

// ─── Synthétiseur Audio d'Alertes (Web Audio API) ───────────────────────────
function playAlertBeep(type = 'warning') {
    if (!appState.settings.soundAlerts) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'critical') {
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.35);
        } else {
            osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.2);
        }
    } catch (_) {}
}

// ─── Utilitaires ────────────────────────────────────────────────────────────
function getDeviceIcon(type) {
    switch (type) {
        case 'phone': return 'smartphone';
        case 'tablet': return 'tablet';
        case 'laptop': return 'laptop';
        case 'desktop': return 'monitor';
        case 'router': return 'router';
        case 'tv': return 'tv';
        case 'console': return 'gamepad-2';
        case 'iot': return 'cpu';
        case 'printer': return 'printer';
        default: return 'help-circle';
    }
}

function formatTime(isoString) {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


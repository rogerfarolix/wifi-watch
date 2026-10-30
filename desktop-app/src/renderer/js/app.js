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
    ruviewRunning: false
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

// ─── Initialisation ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    initWindowControls();
    initNavigation();
    initCharts();
    initRadar();
    initFiltersAndSearch();
    initModal();
    initTools();
    initSpeedTestEvents();
    initChannelAnalyzerEvents();
    initAuditEvents();
    initSettingsEvents();
    initVoiceSentinel();
    initSpyHunterEvents();
    initTimelineEvents();
    initGuestPortalEvents();
    initRuViewEvents();
    initDnsGuardEvents();
    initEnterpriseExportEvents();
    initLanguageAndThemeEvents();
    initHoneypotEvents();
    initDhcpEvents();

    // Chargement initial des données
    await refreshAll();

    // Écoute des événements du processus principal (Main)
    setupIpcListeners();

    if (window.lucide) {
        window.lucide.createIcons();
    }
});

// ─── Contrôles de Fenêtre (Frameless) ────────────────────────────────────────
function initWindowControls() {
    document.getElementById('btn-win-minimize')?.addEventListener('click', () => window.api.minimizeWindow());
    document.getElementById('btn-win-maximize')?.addEventListener('click', () => window.api.maximizeWindow());
    document.getElementById('btn-win-close')?.addEventListener('click', () => window.api.closeWindow());
}

// ─── Navigation entre Vues ──────────────────────────────────────────────────
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetView = item.getAttribute('data-view');
            switchView(targetView);
        });
    });

    document.getElementById('btn-view-all-devices')?.addEventListener('click', () => {
        switchView('devices');
    });

    document.getElementById('btn-manual-scan')?.addEventListener('click', async () => {
        await window.api.startScan();
    });
}

function switchView(viewName) {
    appState.currentView = viewName;

    // Mise à jour de la barre latérale
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-view') === viewName);
    });

    // Affichage de la vue cible
    document.querySelectorAll('.view-section').forEach(sec => {
        sec.classList.remove('active');
    });
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
        target.classList.add('active');
    }

    if (viewName === 'radar' && appState.radar) {
        appState.radar.initCanvas();
        appState.radar.setData(appState.devices, appState.environment?.gatewayIp, appState.environment?.wifi);
    }
    if (viewName === 'devices') renderDevicesView();
    if (viewName === 'security') renderSecurityView();
    if (viewName === 'channels') refreshChannelsView();
    if (viewName === 'audit') refreshAuditView();
    if (viewName === 'spy') renderSpyView();
    if (viewName === 'timeline') renderTimelineView();
    if (viewName === 'guest') renderGuestView();
    if (viewName === 'honeypot') refreshHoneypotView();
    if (viewName === 'ruview') {
        if (!appState.ruviewVisualizer && window.RuViewVisualizer) {
            appState.ruviewVisualizer = new window.RuViewVisualizer('ruview-pose-canvas', 'ruview-wave-canvas');
        } else if (appState.ruviewVisualizer) {
            appState.ruviewVisualizer.resize();
        }
        if (!appState.ruviewRunning) {
            toggleRuViewFeed(true);
        }
    }

    if (window.lucide) window.lucide.createIcons();
}

// ─── Initialisation du Radar Réseau ─────────────────────────────────────────
function initRadar() {
    if (window.NetworkRadar) {
        appState.radar = new window.NetworkRadar('radar-canvas');

        const btnToggleOffline = document.getElementById('btn-radar-toggle-offline');
        const toggleTxt = document.getElementById('radar-toggle-text');
        btnToggleOffline?.addEventListener('click', () => {
            appState.radar.showOffline = !appState.radar.showOffline;
            toggleTxt.innerText = appState.radar.showOffline ? 'Masquer Hors-Ligne' : 'Afficher Hors-Ligne';
            appState.radar.calculatePositions();
        });

        const btnToggleMode = document.getElementById('btn-radar-toggle-mode');
        const modeTxt = document.getElementById('radar-mode-text');
        btnToggleMode?.addEventListener('click', () => {
            const newMode = appState.radar.toggleMode();
            if (modeTxt) {
                modeTxt.innerText = newMode === 'topology' ? 'Mode Radar 360°' : 'Arbre Topologique';
            }
        });

        document.getElementById('btn-radar-scan-now')?.addEventListener('click', async () => {
            await window.api.startScan();
        });
    }
}

// ─── Initialisation des Graphiques Chart.js ─────────────────────────────────
function initCharts() {
    const ctxLive = document.getElementById('live-bandwidth-chart')?.getContext('2d');
    if (ctxLive && window.Chart) {
        appState.liveChart = new Chart(ctxLive, {
            type: 'line',
            data: {
                labels: Array(30).fill(''),
                datasets: [
                    {
                        label: 'Téléchargement (Mbps)',
                        borderColor: '#00f0ff',
                        backgroundColor: 'rgba(0, 240, 255, 0.08)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 0,
                        data: Array(30).fill(0),
                        yAxisID: 'y'
                    },
                    {
                        label: 'Téléversement (Mbps)',
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 0,
                        data: Array(30).fill(0),
                        yAxisID: 'y'
                    },
                    {
                        label: 'Latence Box (ms)',
                        borderColor: '#f59e0b',
                        borderWidth: 1.5,
                        borderDash: [4, 4],
                        pointRadius: 0,
                        data: Array(30).fill(0),
                        yAxisID: 'yPing'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: { labels: { color: '#94a3b8', font: { size: 11, family: 'Inter' } } }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.04)' },
                        ticks: { color: '#64748b', font: { size: 10 } }
                    },
                    yPing: {
                        position: 'right',
                        beginAtZero: true,
                        grid: { display: false },
                        ticks: { color: '#f59e0b', font: { size: 10 }, callback: v => v + ' ms' }
                    }
                }
            }
        });
    }

    const ctxMonitor = document.getElementById('monitor-bandwidth-chart')?.getContext('2d');
    if (ctxMonitor && window.Chart) {
        appState.monitorChart = new Chart(ctxMonitor, {
            type: 'line',
            data: {
                labels: Array(50).fill(''),
                datasets: [
                    {
                        label: 'Débit Download (Mbps)',
                        borderColor: '#00f0ff',
                        backgroundColor: 'rgba(0, 240, 255, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 1,
                        data: Array(50).fill(0)
                    },
                    {
                        label: 'Débit Upload (Mbps)',
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 1,
                        data: Array(50).fill(0)
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: { legend: { labels: { color: '#94a3b8' } } },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.04)' },
                        ticks: { color: '#64748b' }
                    }
                }
            }
        });
    }
}

// ─── Écouteurs IPC Temps Réel ───────────────────────────────────────────────
function setupIpcListeners() {
    window.api.onScanProgress((data) => {
        const container = document.getElementById('scan-progress-container');
        const text = document.getElementById('scan-progress-text');
        const pct = document.getElementById('scan-progress-pct');
        const fill = document.getElementById('scan-progress-fill');

        if (container) container.classList.add('active');
        if (text) text.innerText = data.status || 'Scan en cours...';
        if (pct) pct.innerText = `${data.percent || 0}%`;
        if (fill) fill.style.width = `${data.percent || 0}%`;
    });

    window.api.onScanComplete(async () => {
        const container = document.getElementById('scan-progress-container');
        if (container) {
            setTimeout(() => {
                container.classList.remove('active');
            }, 1200);
        }
        playAlertBeep('info');
        await refreshAll();

        if (appState.voiceSentinel && appState.stats.onlineDevices) {
            appState.voiceSentinel.announceScanComplete(appState.stats.onlineDevices);
        }
    });

    window.api.onBandwidthUpdate((sample) => {
        const throughputEl = document.getElementById('kpi-throughput');
        const rxTxSubEl = document.getElementById('kpi-rx-tx-sub');
        const pingEl = document.getElementById('kpi-ping');
        const pingNetEl = document.getElementById('kpi-ping-internet');
        const titlebarPing = document.getElementById('titlebar-ping-text');

        const totalMbps = (sample.rxMbps + sample.txMbps).toFixed(2);
        if (throughputEl) throughputEl.innerHTML = `${totalMbps} <span style="font-size: 14px; font-weight: normal; color: var(--text-muted);">Mbps</span>`;
        if (rxTxSubEl) rxTxSubEl.innerText = `↓ ${sample.rxMbps.toFixed(2)} Mbps | ↑ ${sample.txMbps.toFixed(2)} Mbps`;

        if (pingEl) pingEl.innerHTML = `${sample.pingGatewayMs || '--'} <span style="font-size: 14px; font-weight: normal; color: var(--text-muted);">ms</span>`;
        if (pingNetEl) pingNetEl.innerText = `Internet: ${sample.pingInternetMs || '--'} ms`;
        if (titlebarPing) titlebarPing.innerText = `Box: ${sample.pingGatewayMs || '--'}ms | Net: ${sample.pingInternetMs || '--'}ms`;

        const monDown = document.getElementById('mon-download-rate');
        const monUp = document.getElementById('mon-upload-rate');
        if (monDown) monDown.innerHTML = `${sample.rxMbps.toFixed(2)} <span style="font-size: 16px; font-weight: normal; color: var(--text-muted);">Mbps</span>`;
        if (monUp) monUp.innerHTML = `${sample.txMbps.toFixed(2)} <span style="font-size: 16px; font-weight: normal; color: var(--text-muted);">Mbps</span>`;

        if (appState.liveChart) {
            const datasets = appState.liveChart.data.datasets;
            datasets[0].data.push(sample.rxMbps);
            datasets[0].data.shift();
            datasets[1].data.push(sample.txMbps);
            datasets[1].data.shift();
            datasets[2].data.push(sample.pingGatewayMs || 0);
            datasets[2].data.shift();
            appState.liveChart.update();
        }

        if (appState.monitorChart) {
            const datasets = appState.monitorChart.data.datasets;
            datasets[0].data.push(sample.rxMbps);
            datasets[0].data.shift();
            datasets[1].data.push(sample.txMbps);
            datasets[1].data.shift();
            appState.monitorChart.update();
        }
    });

    window.api.onAlertAdded((alert) => {
        playAlertBeep(alert.severity);
        refreshAlerts();

        if (appState.voiceSentinel) {
            if (alert.type === 'NEW_DEVICE') {
                appState.voiceSentinel.announceNewDevice(alert.metadata?.vendor, alert.metadata?.ip);
            } else if (alert.severity === 'critical') {
                appState.voiceSentinel.announceThreat(alert.title);
            }
        }
    });

    // Progression de la Chasse aux Espions
    window.api.onSpyProgress((data) => {
        const fill = document.getElementById('spy-progress-bar');
        const count = document.getElementById('spy-progress-count');
        const label = document.getElementById('spy-progress-label');
        if (fill && data.total) {
            const pct = Math.round((data.current / data.total) * 100);
            fill.style.width = `${pct}%`;
        }
        if (count) count.innerText = `${data.current}/${data.total}`;
        if (label) label.innerText = `Audit vidéo de ${data.currentName} (${data.currentIp})...`;
    });

    // Progression du Speedtest
    window.api.onSpeedTestProgress((data) => {
        const dial = document.getElementById('speedtest-dial');
        const mainVal = document.getElementById('st-main-val');
        const mainUnit = document.getElementById('st-main-unit');
        const phaseLabel = document.getElementById('st-phase-label');

        if (dial) dial.classList.add('running');
        if (phaseLabel && data.status) phaseLabel.innerText = data.status;

        if (data.phase === 'download') {
            mainVal.innerText = (data.currentMbps || 0).toFixed(1);
            mainUnit.innerText = 'Mbps (Download)';
            document.getElementById('st-kpi-down').innerText = (data.currentMbps || 0).toFixed(1) + ' Mbps';
        } else if (data.phase === 'upload') {
            mainVal.innerText = (data.currentMbps || 0).toFixed(1);
            mainUnit.innerText = 'Mbps (Upload)';
            document.getElementById('st-kpi-up').innerText = (data.currentMbps || 0).toFixed(1) + ' Mbps';
        }
    });

    // Télémétrie & État RuView (ruvnet/RuView)
    window.api.onRuViewTelemetry((data) => {
        if (appState.ruviewVisualizer) {
            appState.ruviewVisualizer.updateTelemetry(data);
        }
        updateRuViewHud(data);
    });

    window.api.onRuViewStatus((status) => {
        const badge = document.getElementById('ruview-mode-badge');
        if (badge) {
            badge.innerText = status.mode === 'hardware' ? 'ESP32 Matériel Connecté' : 'Moteur RuSense RF';
            badge.style.color = status.mode === 'hardware' ? 'var(--accent-green)' : 'var(--accent-cyan)';
        }
    });

    window.api.onRuViewNodeDiscovered((info) => {
        const input = document.getElementById('ruview-node-input-url');
        if (input && !input.value) {
            input.value = `ws://${info.ip}:8765`;
            const hwCard = document.getElementById('ruview-hardware-card');
            if (hwCard) hwCard.style.display = 'block';
        }
    });
}

// ─── Chargement Global ──────────────────────────────────────────────────────
async function refreshAll() {
    await Promise.all([
        refreshEnvironment(),
        refreshDevices(),
        refreshAlerts(),
        refreshStats()
    ]);
}

async function refreshEnvironment() {
    try {
        const env = await window.api.getEnvironment();
        appState.environment = env;

        const ssid = env.wifi?.ssid || 'Réseau Local';
        document.getElementById('dash-ssid').innerText = ssid;
        document.getElementById('titlebar-wifi-name').innerText = ssid;
        document.getElementById('sb-ssid').innerText = ssid;

        document.getElementById('dash-bssid').innerText = `BSSID : ${env.wifi?.bssid || '--'}`;
        document.getElementById('dash-channel').innerText = `Canal : ${env.wifi?.channel || '--'}`;
        document.getElementById('dash-radio').innerText = `Radio : ${env.wifi?.radioType || '802.11'}`;
        document.getElementById('dash-gateway').innerText = `Passerelle : ${env.gatewayIp || '--'}`;
        document.getElementById('dash-signal').innerText = `Signal : ${env.wifi?.signal || 0}%`;

        document.getElementById('sb-ip').innerText = env.localIp || '--';
        document.getElementById('sb-gw').innerText = env.gatewayIp || '--';

        document.getElementById('mon-signal-val').innerText = `${env.wifi?.signal || 0}%`;
        document.getElementById('mon-bssid').innerText = env.wifi?.bssid || '--';
        document.getElementById('mon-radio').innerText = env.wifi?.radioType || '--';
        document.getElementById('mon-rates').innerText = `↓ ${env.wifi?.rxRateMbps || 0} / ↑ ${env.wifi?.txRateMbps || 0} Mbps`;
        document.getElementById('mon-sec').innerText = env.wifi?.security || 'WPA2-Personal';

        if (appState.radar) {
            appState.radar.setData(appState.devices, env.gatewayIp, env.wifi);
        }
    } catch (err) {
        console.error('Erreur refreshEnvironment:', err);
    }
}

async function refreshDevices() {
    try {
        const devices = await window.api.getDevices();
        appState.devices = devices;

        const onlineCount = devices.filter(d => d.isOnline).length;
        document.getElementById('sidebar-online-count').innerText = onlineCount;

        const toolsSelect = document.getElementById('tools-device-select');
        if (toolsSelect) {
            toolsSelect.innerHTML = '<option value="">-- Sélectionner un appareil détecté --</option>';
            devices.filter(d => d.isOnline).forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.ip;
                opt.innerText = `${d.customName || d.hostname || d.mac} (${d.ip})`;
                toolsSelect.appendChild(opt);
            });
        }

        renderDashboardDevices(devices);
        renderDevicesView();

        if (appState.radar) {
            appState.radar.setData(devices, appState.environment?.gatewayIp, appState.environment?.wifi);
            const hud = document.getElementById('radar-hud-info');
            if (hud) {
                hud.innerText = `Cible : ${appState.environment?.wifi?.ssid || 'Routeur'} • ${onlineCount} appareils connectés`;
            }
        }
    } catch (err) {
        console.error('Erreur refreshDevices:', err);
    }
}

async function refreshAlerts() {
    try {
        const alerts = await window.api.getAlerts();
        appState.alerts = alerts;

        const unreadCount = alerts.filter(a => !a.isRead).length;
        const alertBadge = document.getElementById('sidebar-alert-count');
        if (alertBadge) {
            if (unreadCount > 0) {
                alertBadge.style.display = 'inline-block';
                alertBadge.innerText = unreadCount;
            } else {
                alertBadge.style.display = 'none';
            }
        }

        renderDashboardAlerts(alerts);
        renderSecurityView();
    } catch (err) {
        console.error('Erreur refreshAlerts:', err);
    }
}

async function refreshStats() {
    try {
        const stats = await window.api.getStats();
        appState.stats = stats;

        document.getElementById('kpi-online-devices').innerHTML = `${stats.onlineDevices} <span style="font-size: 14px; font-weight: normal; color: var(--text-muted);">/ ${stats.totalDevices} total</span>`;
        document.getElementById('kpi-unknown-devices').innerText = stats.unknownDevices;
    } catch (err) {
        console.error('Erreur refreshStats:', err);
    }
}

// ─── Speedtest Intégré & Benchmark SLA ──────────────────────────────────────
function initSpeedTestEvents() {
    const btn = document.getElementById('btn-run-speedtest');
    btn?.addEventListener('click', async () => {
        if (appState.isSpeedTesting) return;
        appState.isSpeedTesting = true;

        btn.disabled = true;
        document.getElementById('btn-run-speedtest-text').innerText = 'Test en cours...';
        const dial = document.getElementById('speedtest-dial');
        if (dial) dial.classList.add('running');

        try {
            const results = await window.api.runSpeedTest();

            document.getElementById('st-main-val').innerText = results.downloadMbps.toFixed(1);
            document.getElementById('st-main-unit').innerText = 'Mbps (Download)';
            document.getElementById('st-phase-label').innerText = 'Test Réussi !';

            document.getElementById('st-kpi-down').innerHTML = `${results.downloadMbps} <span style="font-size:12px;color:var(--text-muted);">Mbps</span>`;
            document.getElementById('st-kpi-up').innerHTML = `${results.uploadMbps} <span style="font-size:12px;color:var(--text-muted);">Mbps</span>`;
            document.getElementById('st-kpi-ping').innerHTML = `${results.pingMs} <span style="font-size:12px;color:var(--text-muted);">ms</span>`;
            document.getElementById('st-kpi-jitter').innerHTML = `${results.jitterMs} <span style="font-size:12px;color:var(--text-muted);">ms</span>`;
        } catch (err) {
            alert('Erreur lors du Speedtest : ' + err);
        } finally {
            appState.isSpeedTesting = false;
            btn.disabled = false;
            document.getElementById('btn-run-speedtest-text').innerText = 'Relancer le Test';
            if (dial) dial.classList.remove('running');
        }
    });

    const btnBench = document.getElementById('btn-run-benchmark');
    btnBench?.addEventListener('click', async () => {
        btnBench.disabled = true;
        const btnTxt = document.getElementById('btn-benchmark-text');
        if (btnTxt) btnTxt.innerText = 'Évaluation SLA en cours...';

        try {
            const target = appState.environment?.gatewayIp || '1.1.1.1';
            const bench = await window.api.runBenchmark(target);

            const gradeBadge = document.getElementById('sla-grade-badge');
            if (gradeBadge) {
                gradeBadge.innerText = bench.grade;
                const colors = {
                    'A+': 'var(--accent-green)',
                    'A': 'var(--accent-green)',
                    'B': 'var(--accent-cyan)',
                    'C': 'var(--accent-amber)',
                    'F': 'var(--accent-red)'
                };
                gradeBadge.style.color = colors[bench.grade] || 'var(--accent-green)';
            }

            const gradeLabel = document.getElementById('sla-grade-label');
            if (gradeLabel) gradeLabel.innerText = bench.rating;

            const dnsEl = document.getElementById('sla-dns-latency');
            if (dnsEl) dnsEl.innerText = `${bench.dnsLatencyMs} ms`;

            const httpEl = document.getElementById('sla-http-latency');
            if (httpEl) httpEl.innerText = `${bench.httpLatencyMs} ms`;

            const lossEl = document.getElementById('sla-packet-loss');
            if (lossEl) lossEl.innerText = `${bench.ping.packetLoss}%`;

            const jitterEl = document.getElementById('sla-jitter-val');
            if (jitterEl) jitterEl.innerText = `${bench.ping.jitterMs} ms`;

            const descEl = document.getElementById('sla-benchmark-desc');
            if (descEl) {
                descEl.innerText = `Audit SLA validé (${new Date(bench.timestamp).toLocaleTimeString()}) — Cible testée : ${target} (Min: ${bench.ping.minMs}ms, Moy: ${bench.ping.avgMs}ms, Max: ${bench.ping.maxMs}ms)`;
            }
        } catch (err) {
            console.error('Erreur benchmark:', err);
        } finally {
            btnBench.disabled = false;
            if (btnTxt) btnTxt.innerText = 'Relancer Benchmark SLA';
        }
    });
}

// ─── Analyseur Wi-Fi & Canaux ───────────────────────────────────────────────
function initChannelAnalyzerEvents() {
    document.getElementById('btn-refresh-channels')?.addEventListener('click', () => {
        refreshChannelsView();
    });
}

async function refreshChannelsView() {
    try {
        const data = await window.api.scanChannels();
        const { accessPoints, channelStats, evilTwinDetected } = data;

        // Bannière recommandation
        document.getElementById('chan-best-title').innerText = `Canal 2.4 GHz Optimal Recommandé : Canal ${channelStats.recommendedChannel24}`;
        document.getElementById('chan-best-desc').innerText = `Basé sur l'analyse de ${channelStats.totalNearbyAps} point(s) d'accès visible(s) dans votre environnement.`;

        // Alerte Evil Twin
        const evilCard = document.getElementById('evil-twin-alert-card');
        const evilDesc = document.getElementById('evil-twin-desc');
        if (evilTwinDetected) {
            evilCard.style.display = 'block';
            evilDesc.innerText = `Attention : Un faux réseau «${evilTwinDetected.ssid}» utilise la MAC pirate ${evilTwinDetected.rogueBssid} sur le canal ${evilTwinDetected.channel}.`;
        } else {
            evilCard.style.display = 'none';
        }

        // Barres de congestion des canaux 2.4 GHz
        const barContainer = document.getElementById('channels-bar-container');
        if (barContainer) {
            const ch24 = channelStats.channels24 || {};
            const maxVal = Math.max(1, ...Object.values(ch24));

            barContainer.innerHTML = Object.entries(ch24).map(([ch, count]) => {
                const pct = Math.min(100, Math.round((count / maxVal) * 100));
                const isOptimal = (parseInt(ch, 10) === channelStats.recommendedChannel24);
                return `
                    <div class="channel-bar-item">
                        <span class="channel-num">Canal ${ch} ${isOptimal ? '★' : ''}</span>
                        <div class="channel-track">
                            <div class="channel-fill ${pct > 70 ? 'high' : ''}" style="width: ${Math.max(4, pct)}%;"></div>
                        </div>
                        <span style="font-size: 11px; width: 60px; color: ${isOptimal ? 'var(--accent-green)' : 'var(--text-muted)'}; font-weight: ${isOptimal ? 'bold' : 'normal'};">
                            ${count} AP(s)
                        </span>
                    </div>
                `;
            }).join('');
        }

        // Table des réseaux voisins
        const tbody = document.getElementById('neighbor-networks-tbody');
        if (tbody) {
            if (accessPoints.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Aucun réseau Wi-Fi voisin détecté.</td></tr>`;
            } else {
                tbody.innerHTML = accessPoints.map(ap => `
                    <tr style="${ap.isCurrent ? 'background: rgba(0, 240, 255, 0.05); font-weight: bold;' : ''}">
                        <td>${escapeHtml(ap.ssid)} ${ap.isCurrent ? '<span class="badge badge-online">Votre Box</span>' : ''}</td>
                        <td style="font-family: monospace;">${ap.bssid}</td>
                        <td>${ap.signal}%</td>
                        <td>${ap.channel}</td>
                        <td>${ap.band}</td>
                        <td>${escapeHtml(ap.security)}</td>
                    </tr>
                `).join('');
            }
        }
    } catch (err) {
        console.error('Erreur scan canaux:', err);
    }
}

// ─── Score de Sécurité & Rapport d'Audit ─────────────────────────────────────
function initAuditEvents() {
    document.getElementById('btn-export-audit-report')?.addEventListener('click', async () => {
        try {
            const html = await window.api.generateAuditReport();
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-securite-wifi-watch-${new Date().toISOString().slice(0, 10)}.html`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Erreur lors de la génération du rapport : ' + err);
        }
    });
}

async function refreshAuditView() {
    try {
        const audit = await window.api.getSecurityScore();

        // Cadran Score
        const dial = document.getElementById('audit-score-dial');
        const num = document.getElementById('audit-score-num');
        const gradeTxt = document.getElementById('audit-grade-txt');

        if (num) num.innerText = audit.score;
        if (gradeTxt) gradeTxt.innerText = `GRADE ${audit.grade}`;
        if (dial) {
            dial.style.borderColor = audit.gradeColor;
            dial.style.color = audit.gradeColor;
        }

        // Déductions
        const dedList = document.getElementById('audit-deductions-list');
        if (dedList) {
            if (audit.deductions.length === 0) {
                dedList.innerHTML = `<li style="padding: 12px; background: rgba(16, 185, 129, 0.08); border-radius: 8px; color: var(--accent-green); font-size: 13px;">Aucun point faible majeur détecté. Configuration saine !</li>`;
            } else {
                dedList.innerHTML = audit.deductions.map(d => `
                    <li style="padding: 10px 14px; background: rgba(239, 68, 68, 0.08); border-radius: 8px; border-left: 3px solid var(--accent-red); font-size: 13px; display: flex; justify-content: space-between;">
                        <span>${escapeHtml(d.rule)}</span>
                        <span style="color: var(--accent-red); font-weight: bold;">-${d.penalty} pts</span>
                    </li>
                `).join('');
            }
        }

        // Recommandations
        const recList = document.getElementById('audit-recommendations-list');
        if (recList) {
            recList.innerHTML = audit.recommendations.map(r => `
                <li style="padding: 10px 14px; background: rgba(0, 240, 255, 0.05); border-radius: 8px; border-left: 3px solid var(--accent-cyan); font-size: 13px;">
                    ${escapeHtml(r)}
                </li>
            `).join('');
        }

        // Tableau de Conformité NIS2 & ISO 27001
        const compTbody = document.getElementById('audit-compliance-tbody');
        if (compTbody && audit.complianceChecks) {
            compTbody.innerHTML = audit.complianceChecks.map(c => `
                <tr>
                    <td style="font-family: monospace; font-size: 12px; color: var(--text-muted);">${escapeHtml(c.standard)}</td>
                    <td><strong>${escapeHtml(c.title)}</strong></td>
                    <td>
                        ${c.status === 'CONFORME' 
                            ? '<span class="badge badge-online">Conforme</span>' 
                            : c.status === 'ATTENTION' 
                                ? '<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: var(--accent-amber);">Attention</span>' 
                                : '<span class="badge badge-blocked">Non Conforme</span>'}
                    </td>
                    <td style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(c.detail)}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Erreur audit score:', err);
    }
}

// ─── Rendu Spécifique au Dashboard ──────────────────────────────────────────
function renderDashboardDevices(devices) {
    const tbody = document.getElementById('dash-recent-devices-tbody');
    if (!tbody) return;

    if (!devices || devices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">Aucun équipement répertorié. Lancez un scan.</td></tr>`;
        return;
    }

    const top5 = devices.slice(0, 5);
    tbody.innerHTML = top5.map(d => `
        <tr>
            <td>
                <div class="device-name-col">
                    <div class="device-icon-box">
                        <i data-lucide="${getDeviceIcon(d.deviceType)}"></i>
                    </div>
                    <div>
                        <div class="device-primary-name">${escapeHtml(d.customName || d.hostname || d.mac)}</div>
                        <div class="device-secondary-name">${escapeHtml(d.vendor || 'Inconnu')} • ${d.mac}</div>
                    </div>
                </div>
            </td>
            <td><span class="detail-val">${d.ip}</span></td>
            <td>
                ${d.isOnline ? '<span class="badge badge-online">En ligne</span>' : '<span class="badge badge-offline">Hors ligne</span>'}
                ${d.isBlocked ? '<span class="badge badge-blocked">Bloqué</span>' : (d.isTrusted ? '<span class="badge badge-trusted">Fiable</span>' : '<span class="badge badge-unknown">Inconnu</span>')}
            </td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="openDeviceModal('${d.mac}')">Gérer</button>
            </td>
        </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
}

function renderDashboardAlerts(alerts) {
    const list = document.getElementById('dash-recent-alerts-list');
    if (!list) return;

    if (!alerts || alerts.length === 0) {
        list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">Aucune anomalie réseau détectée.</div>`;
        return;
    }

    const top3 = alerts.slice(0, 3);
    list.innerHTML = top3.map(a => `
        <div class="alert-item ${a.severity}">
            <div class="alert-body">
                <h4>${escapeHtml(a.title)}</h4>
                <p>${escapeHtml(a.description)}</p>
                <div class="alert-meta">
                    <span>${formatTime(a.timestamp)}</span>
                    ${a.ip ? `<span>IP : ${a.ip}</span>` : ''}
                </div>
            </div>
            ${!a.isRead ? `<button class="btn btn-secondary btn-sm" onclick="markAlertRead('${a.id}')">Lu</button>` : ''}
        </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
}

function getCategoryLabel(cat) {
    switch (cat) {
        case 'server': return 'Serveur Critique';
        case 'network': return 'Équipement Réseau';
        case 'printer': return 'Imprimante';
        case 'iot': return 'IoT / Caméra';
        case 'mobile': return 'Mobile / Tablette';
        case 'guest': return 'Invité';
        case 'unauthorized': return 'Non Autorisé';
        case 'workstation':
        default: return 'Poste Travail';
    }
}

// ─── Rendu de la Vue Appareils (Grille / Tableau) ────────────────────────────
function renderDevicesView() {
    let filtered = [...appState.devices];

    if (appState.deviceFilter === 'online') filtered = filtered.filter(d => d.isOnline);
    else if (appState.deviceFilter === 'offline') filtered = filtered.filter(d => !d.isOnline);
    else if (appState.deviceFilter === 'trusted') filtered = filtered.filter(d => d.isTrusted || d.authorized);
    else if (appState.deviceFilter === 'unknown') filtered = filtered.filter(d => !d.isTrusted && !d.isBlocked && !d.authorized);
    else if (appState.deviceFilter === 'blocked') filtered = filtered.filter(d => d.isBlocked || d.quarantined);
    else if (appState.deviceFilter === 'workstation') filtered = filtered.filter(d => (d.category || 'workstation') === 'workstation');
    else if (appState.deviceFilter === 'server') filtered = filtered.filter(d => d.category === 'server');
    else if (appState.deviceFilter === 'network') filtered = filtered.filter(d => d.category === 'network' || d.deviceType === 'router');
    else if (appState.deviceFilter === 'iot') filtered = filtered.filter(d => d.category === 'iot' || d.deviceType === 'iot');
    else if (appState.deviceFilter === 'unauthorized') filtered = filtered.filter(d => !d.authorized && !d.isTrusted && !d.isBlocked);

    if (appState.searchQuery) {
        const q = appState.searchQuery.toLowerCase();
        filtered = filtered.filter(d =>
            (d.customName && d.customName.toLowerCase().includes(q)) ||
            (d.hostname && d.hostname.toLowerCase().includes(q)) ||
            (d.ip && d.ip.includes(q)) ||
            (d.mac && d.mac.toLowerCase().includes(q)) ||
            (d.vendor && d.vendor.toLowerCase().includes(q)) ||
            (d.category && d.category.toLowerCase().includes(q)) ||
            (d.owner && d.owner.toLowerCase().includes(q)) ||
            (d.department && d.department.toLowerCase().includes(q))
        );
    }

    const gridContainer = document.getElementById('devices-grid-container');
    const tableCard = document.getElementById('devices-table-card');
    const tableBody = document.getElementById('devices-full-tbody');

    if (appState.viewMode === 'grid') {
        gridContainer.style.display = 'grid';
        tableCard.style.display = 'none';

        if (filtered.length === 0) {
            gridContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Aucun appareil correspondant aux critères de recherche.</div>`;
            return;
        }

        gridContainer.innerHTML = filtered.map(d => {
            const cat = d.category || (d.deviceType === 'router' ? 'network' : 'workstation');
            return `
            <div class="device-card">
                <div class="device-card-header">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="device-icon-box">
                            <i data-lucide="${getDeviceIcon(d.deviceType)}"></i>
                        </div>
                        <div>
                            <div class="device-primary-name">${escapeHtml(d.customName || d.hostname || d.mac)}</div>
                            <div class="device-secondary-name">${escapeHtml(d.vendor || 'Inconnu')}</div>
                        </div>
                    </div>
                    ${d.isOnline ? '<span class="status-pulse" title="En ligne"></span>' : '<span style="width: 7px; height: 7px; border-radius: 50%; background: #64748b;" title="Hors ligne"></span>'}
                </div>

                <div class="device-card-details">
                    <div class="detail-line"><span>IP :</span><span class="detail-val" style="font-family: monospace;">${d.ip}</span></div>
                    <div class="detail-line"><span>MAC :</span><span class="detail-val" style="font-family: monospace;">${d.mac}</span></div>
                    <div class="detail-line"><span>Catégorie :</span><span class="badge-tag tag-${cat}">${getCategoryLabel(cat)}</span></div>
                    ${d.owner ? `<div class="detail-line"><span>Responsable :</span><span class="detail-val">${escapeHtml(d.owner)} ${d.department ? `(${escapeHtml(d.department)})` : ''}</span></div>` : ''}
                    <div class="detail-line"><span>Latence :</span><span class="detail-val">${d.latencyMs !== null ? d.latencyMs + ' ms' : '--'}</span></div>
                </div>

                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px;">
                    ${d.isOnline ? '<span class="badge badge-online">En ligne</span>' : '<span class="badge badge-offline">Hors ligne</span>'}
                    ${d.isBlocked || d.quarantined ? '<span class="badge badge-blocked">Bloqué / Isolé</span>' : (d.authorized || d.isTrusted ? '<span class="badge-authorized">Approuvé</span>' : '<span class="badge-unauthorized">Non Validé</span>')}
                </div>

                <div class="device-card-actions">
                    <button class="btn btn-secondary btn-sm" onclick="openDeviceModal('${d.mac}')" style="flex: 1;">Fiche & Actions</button>
                    ${!d.isTrusted && !d.authorized && !d.isBlocked ? `<button class="btn btn-success btn-sm" onclick="trustDevice('${d.mac}')" title="Approuver cet équipement"><i data-lucide="check"></i></button>` : ''}
                    ${!d.isBlocked ? `<button class="btn btn-danger btn-sm" onclick="blockDevice('${d.mac}')" title="Bloquer l'appareil"><i data-lucide="ban"></i></button>` : `<button class="btn btn-secondary btn-sm" onclick="unblockDevice('${d.mac}')" title="Débloquer"><i data-lucide="unlock"></i></button>`}
                </div>
            </div>
            `;
        }).join('');
    } else {
        gridContainer.style.display = 'none';
        tableCard.style.display = 'block';

        tableBody.innerHTML = filtered.map(d => {
            const cat = d.category || (d.deviceType === 'router' ? 'network' : 'workstation');
            return `
            <tr>
                <td>
                    <div class="device-name-col">
                        <div class="device-icon-box">
                            <i data-lucide="${getDeviceIcon(d.deviceType)}"></i>
                        </div>
                        <div>
                            <div class="device-primary-name">${escapeHtml(d.customName || d.hostname || d.mac)}</div>
                            <div class="device-secondary-name">${escapeHtml(d.vendor || 'Inconnu')}</div>
                        </div>
                    </div>
                </td>
                <td><span class="detail-val" style="font-family: monospace;">${d.ip}</span></td>
                <td><span class="detail-val" style="font-family: monospace;">${d.mac}</span></td>
                <td>${escapeHtml(d.vendor || 'Inconnu')}</td>
                <td><span class="badge-tag tag-${cat}">${getCategoryLabel(cat)}</span></td>
                <td><span style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(d.owner || '--')} ${d.department ? `<br><small style="color:var(--text-muted);">${escapeHtml(d.department)}</small>` : ''}</span></td>
                <td>${d.isOnline ? '<span class="badge badge-online">En ligne</span>' : '<span class="badge badge-offline">Hors ligne</span>'}</td>
                <td>${d.isBlocked || d.quarantined ? '<span class="badge badge-blocked">Bloqué / Isolé</span>' : (d.authorized || d.isTrusted ? '<span class="badge-authorized">Approuvé</span>' : '<span class="badge-unauthorized">Non Validé</span>')}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="openDeviceModal('${d.mac}')">Fiche</button>
                </td>
            </tr>
            `;
        }).join('');
    }

    if (window.lucide) window.lucide.createIcons();
}

// ─── Rendu de la Vue Sécurité ───────────────────────────────────────────────
function renderSecurityView() {
    let filtered = [...appState.alerts];

    if (appState.alertFilter === 'critical') filtered = filtered.filter(a => a.severity === 'critical');
    else if (appState.alertFilter === 'warning') filtered = filtered.filter(a => a.severity === 'warning');
    else if (appState.alertFilter === 'info') filtered = filtered.filter(a => a.severity === 'info');

    const container = document.getElementById('full-alerts-list');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 50px;">Aucune alerte enregistrée dans cette catégorie.</div>`;
        return;
    }

    container.innerHTML = filtered.map(a => `
        <div class="alert-item ${a.severity}">
            <div class="alert-body">
                <h4>${escapeHtml(a.title)}</h4>
                <p>${escapeHtml(a.description)}</p>
                <div class="alert-meta">
                    <span>${new Date(a.timestamp).toLocaleString('fr-FR')}</span>
                    ${a.ip ? `<span>IP : ${a.ip}</span>` : ''}
                    ${a.deviceMac ? `<span>MAC : ${a.deviceMac}</span>` : ''}
                </div>
            </div>
            <div>
                ${!a.isRead ? `<button class="btn btn-secondary btn-sm" onclick="markAlertRead('${a.id}')">Marquer comme lu</button>` : '<span style="color: var(--text-muted); font-size: 11px;">Lu</span>'}
            </div>
        </div>
    `).join('');
}

// ─── Filtres, Recherche & Actions Rapides ────────────────────────────────────
function initFiltersAndSearch() {
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.deviceFilter = btn.getAttribute('data-filter');
            renderDevicesView();
        });
    });

    document.getElementById('devices-search-input')?.addEventListener('input', (e) => {
        appState.searchQuery = e.target.value;
        renderDevicesView();
    });

    document.getElementById('btn-toggle-view-grid')?.addEventListener('click', () => {
        appState.viewMode = 'grid';
        renderDevicesView();
    });
    document.getElementById('btn-toggle-view-table')?.addEventListener('click', () => {
        appState.viewMode = 'table';
        renderDevicesView();
    });

    document.querySelectorAll('.filter-btn[data-alert-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn[data-alert-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.alertFilter = btn.getAttribute('data-alert-filter');
            renderSecurityView();
        });
    });

    document.getElementById('btn-sec-clear-all')?.addEventListener('click', async () => {
        if (confirm('Voulez-vous vraiment effacer tout l\'historique des alertes ?')) {
            await window.api.clearAlerts();
            await refreshAlerts();
        }
    });

    document.getElementById('btn-sec-mark-all')?.addEventListener('click', async () => {
        await window.api.markAllAlertsRead();
        await refreshAlerts();
    });
    document.getElementById('btn-mark-all-read-dash')?.addEventListener('click', async () => {
        await window.api.markAllAlertsRead();
        await refreshAlerts();
    });
}

// ─── Modal Appareil ─────────────────────────────────────────────────────────
function initModal() {
    const modal = document.getElementById('device-modal');
    const closeBtn = document.getElementById('modal-btn-close');
    const cancelBtn = document.getElementById('modal-btn-cancel');
    const saveBtn = document.getElementById('modal-btn-save');

    const closeModal = () => modal.classList.remove('active');
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    saveBtn?.addEventListener('click', async () => {
        const mac = document.getElementById('modal-device-mac').value;
        const customName = document.getElementById('modal-device-custom-name').value;
        const category = document.getElementById('modal-device-category')?.value || 'workstation';
        const owner = document.getElementById('modal-device-owner')?.value || '';
        const department = document.getElementById('modal-device-department')?.value || '';
        const location = document.getElementById('modal-device-location')?.value || '';
        const authorized = document.getElementById('modal-device-authorized')?.checked || false;
        const isCritical = document.getElementById('modal-device-critical')?.checked || false;
        const notes = document.getElementById('modal-device-notes')?.value || '';

        if (mac) {
            await window.api.updateDevice(mac, {
                customName,
                category,
                owner,
                department,
                location,
                authorized,
                isTrusted: authorized,
                isCritical,
                notes
            });
            closeModal();
            await refreshDevices();
        }
    });

    document.getElementById('modal-btn-toggle-block')?.addEventListener('click', async () => {
        const mac = document.getElementById('modal-device-mac').value;
        const dev = appState.devices.find(d => d.mac === mac);
        if (dev) {
            const isBlocked = !dev.isBlocked;
            await window.api.updateDevice(mac, { isBlocked, isTrusted: isBlocked ? false : dev.isTrusted });
            closeModal();
            await refreshDevices();
        }
    });

    document.getElementById('modal-btn-scan-ports')?.addEventListener('click', async () => {
        const ip = document.getElementById('modal-info-ip').innerText;
        const mac = document.getElementById('modal-device-mac').value;
        const btn = document.getElementById('modal-btn-scan-ports');
        const container = document.getElementById('modal-ports-container');
        const listEl = document.getElementById('modal-ports-list');
        const countBadge = document.getElementById('modal-ports-count-badge');

        if (!ip || ip === '--') return;

        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Scan...`;
        if (window.lucide) window.lucide.createIcons();

        try {
            const ports = await window.api.scanDevicePortsDetailed(ip, mac);
            container.style.display = 'block';
            countBadge.innerText = `${ports.length} port(s) ouvert(s)`;

            if (ports.length === 0) {
                listEl.innerHTML = `<span style="font-size: 11px; color: var(--accent-green); padding: 4px 0; display: block;">✅ Aucun port vulnérable courant exposé.</span>`;
            } else {
                listEl.innerHTML = ports.map(p => `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <span><strong style="color: var(--accent-cyan); font-family: monospace;">Port ${p.port}</strong> (${p.service})</span>
                        <span class="badge ${p.risk === 'CRITICAL' || p.risk === 'HIGH' ? 'badge-blocked' : (p.risk === 'MEDIUM' ? 'badge-unknown' : 'badge-trusted')}">
                            ${p.risk}
                        </span>
                    </div>
                `).join('');
            }
        } catch (err) {
            alert('Erreur port scan: ' + err);
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="scan"></i> <span>Tester Ports</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    });

    // Bouton Wake-on-LAN
    document.getElementById('modal-btn-wol')?.addEventListener('click', async () => {
        const mac = document.getElementById('modal-device-mac').value;
        if (!mac) return;
        try {
            await window.api.wakeOnLan(mac);
            alert(`Paquet Magique Wake-on-LAN transmis avec succès à ${mac} !`);
        } catch (err) {
            alert(`Échec de l'envoi Wake-on-LAN : ${err}`);
        }
    });

    // Bouton Audit Espion (Caméras / Micros)
    document.getElementById('modal-btn-spy-check')?.addEventListener('click', async () => {
        const mac = document.getElementById('modal-device-mac').value;
        const dev = appState.devices.find(d => d.mac === mac);
        if (!dev) return;

        const btn = document.getElementById('modal-btn-spy-check');
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Analyse...`;
        if (window.lucide) window.lucide.createIcons();

        try {
            const report = await window.api.scanDeviceSpy(dev);
            if (report && report.isSurveillanceDevice) {
                if (appState.voiceSentinel) {
                    appState.voiceSentinel.announceSpyDevice(report.detectedBrand, report.ip);
                }
                alert(`🚨 ALERTE SURVEILLANCE DÉTECTÉE !\n\nAppareil : ${report.detectedBrand || 'Caméra/Micro'}\nType : ${report.equipmentType}\nMenace : ${report.threatLevel}\nRaison : ${report.riskReason}\nPorts vidéo : ${report.openSurveillancePorts.map(p => p.port).join(', ') || 'N/A'}\nFlux RTSP : ${report.streamUrls.join('\n') || 'Non exposé'}`);
            } else {
                alert(`✅ Aucune signature de caméra ou de micro espion détectée sur ${dev.ip}.`);
            }
        } catch (err) {
            alert(`Erreur lors de l'audit espion : ${err}`);
        } finally {
            btn.innerHTML = `<i data-lucide="video"></i> <span>Audit Espion</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    });

    // Bouton Isolation Réseau (Pare-feu Windows)
    document.getElementById('modal-btn-toggle-isolate')?.addEventListener('click', async () => {
        const mac = document.getElementById('modal-device-mac').value;
        const dev = appState.devices.find(d => d.mac === mac);
        if (!dev) return;

        const textEl = document.getElementById('modal-isolate-text');
        const isCurrentlyIsolated = await window.api.checkQuarantineStatus(dev.ip);

        if (isCurrentlyIsolated) {
            await window.api.unisolateDevice(dev.ip, dev.mac);
            textEl.innerText = 'Isoler (Pare-feu)';
            alert(`La quarantaine de l'appareil ${dev.ip} a été levée.`);
        } else {
            if (confirm(`Voulez-vous couper immédiatement tout trafic réseau avec ${dev.ip} (${dev.hostname || dev.customName || 'Inconnu'}) via le pare-feu Windows ?`)) {
                await window.api.isolateDevice(dev.ip, dev.mac);
                textEl.innerText = 'Lever Isolation';
                if (appState.voiceSentinel) {
                    appState.voiceSentinel.speak(`Équipement ${dev.ip} placé en quarantaine.`);
                }
                alert(`Bouclier activé : l'équipement ${dev.ip} est totalement isolé.`);
            }
        }
        await refreshDevices();
    });
}

window.openDeviceModal = async function(mac) {
    const dev = appState.devices.find(d => d.mac === mac);
    if (!dev) return;

    document.getElementById('modal-device-mac').value = dev.mac;
    document.getElementById('modal-device-custom-name').value = dev.customName || '';
    if (document.getElementById('modal-device-category')) {
        document.getElementById('modal-device-category').value = dev.category || (dev.deviceType === 'router' ? 'network' : 'workstation');
    }
    if (document.getElementById('modal-device-owner')) {
        document.getElementById('modal-device-owner').value = dev.owner || '';
    }
    if (document.getElementById('modal-device-department')) {
        document.getElementById('modal-device-department').value = dev.department || '';
    }
    if (document.getElementById('modal-device-location')) {
        document.getElementById('modal-device-location').value = dev.location || '';
    }
    if (document.getElementById('modal-device-authorized')) {
        document.getElementById('modal-device-authorized').checked = !!(dev.authorized || dev.isTrusted);
    }
    if (document.getElementById('modal-device-critical')) {
        document.getElementById('modal-device-critical').checked = !!dev.isCritical;
    }
    if (document.getElementById('modal-device-notes')) {
        document.getElementById('modal-device-notes').value = dev.notes || '';
    }

    document.getElementById('modal-info-ip').innerText = dev.ip;
    document.getElementById('modal-info-mac').innerText = dev.mac;
    document.getElementById('modal-info-vendor').innerText = dev.vendor || 'Inconnu';
    document.getElementById('modal-info-model').innerText = dev.model || 'Non détecté';
    document.getElementById('modal-info-hostname').innerText = dev.hostname || 'Non résolu';
    document.getElementById('modal-info-firstseen').innerText = new Date(dev.firstSeen).toLocaleString('fr-FR');
    document.getElementById('modal-info-lastseen').innerText = new Date(dev.lastSeen).toLocaleString('fr-FR');

    const container = document.getElementById('modal-ports-container');
    const listEl = document.getElementById('modal-ports-list');
    const countBadge = document.getElementById('modal-ports-count-badge');
    if (container && dev.openPorts && dev.openPorts.length > 0) {
        container.style.display = 'block';
        countBadge.innerText = `${dev.openPorts.length} port(s)`;
        listEl.innerHTML = dev.openPorts.map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <span><strong style="color: var(--accent-cyan); font-family: monospace;">Port ${typeof p === 'object' ? p.port : p}</strong> ${typeof p === 'object' ? `(${p.service})` : ''}</span>
                <span class="badge ${typeof p === 'object' && (p.risk === 'CRITICAL' || p.risk === 'HIGH') ? 'badge-blocked' : 'badge-trusted'}">${typeof p === 'object' ? p.risk : 'OUVERT'}</span>
            </div>
        `).join('');
    } else if (container) {
        container.style.display = 'none';
    }

    const blockText = document.getElementById('modal-block-text');
    if (blockText) {
        blockText.innerText = dev.isBlocked ? 'Débloquer' : 'Bloquer';
    }

    const isolateText = document.getElementById('modal-isolate-text');
    if (isolateText) {
        const isIsolated = await window.api.checkQuarantineStatus(dev.ip);
        isolateText.innerText = isIsolated ? 'Lever Isolation' : 'Isoler (Pare-feu)';
    }

    document.getElementById('device-modal').classList.add('active');
    if (window.lucide) window.lucide.createIcons();
};

window.trustDevice = async function(mac) {
    await window.api.updateDevice(mac, { isTrusted: true, isBlocked: false });
    await refreshDevices();
};

window.blockDevice = async function(mac) {
    await window.api.updateDevice(mac, { isBlocked: true, isTrusted: false });
    await refreshDevices();
};

window.unblockDevice = async function(mac) {
    await window.api.updateDevice(mac, { isBlocked: false });
    await refreshDevices();
};

window.markAlertRead = async function(id) {
    await window.api.markAlertRead(id);
    await refreshAlerts();
};

// ─── Outils : Scanner de Ports ──────────────────────────────────────────────
function initTools() {
    const deviceSelect = document.getElementById('tools-device-select');
    deviceSelect?.addEventListener('change', (e) => {
        if (e.target.value) {
            document.getElementById('tools-target-ip').value = e.target.value;
        }
    });

    const btnScan = document.getElementById('btn-launch-port-scan');
    btnScan?.addEventListener('click', async () => {
        const ip = document.getElementById('tools-target-ip').value.trim();
        if (!ip) {
            alert('Veuillez saisir ou choisir une adresse IP cible.');
            return;
        }

        btnScan.disabled = true;
        btnScan.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Scan en cours...`;
        if (window.lucide) window.lucide.createIcons();

        try {
            const ports = await window.api.scanPorts(ip);

            const resultsCard = document.getElementById('tools-port-results-card');
            const resultsTbody = document.getElementById('tools-port-results-tbody');
            const badge = document.getElementById('tools-port-count-badge');

            resultsCard.style.display = 'block';
            badge.innerText = `${ports.length} port(s) ouvert(s)`;

            if (ports.length === 0) {
                resultsTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--accent-green); padding: 20px;">Aucun port vulnérable courant ouvert détecté sur ${ip}.</td></tr>`;
            } else {
                resultsTbody.innerHTML = ports.map(p => `
                    <tr>
                        <td><span class="detail-val" style="font-weight: bold; font-size: 13px;">${p.port}</span></td>
                        <td><span style="font-weight: 600;">${p.service}</span></td>
                        <td>
                            <span class="badge ${p.risk === 'high' ? 'badge-blocked' : (p.risk === 'medium' ? 'badge-unknown' : 'badge-trusted')}">
                                ${p.risk.toUpperCase()}
                            </span>
                        </td>
                        <td style="color: var(--text-secondary);">${p.description}</td>
                        <td><span class="badge badge-online">Ouvert</span></td>
                    </tr>
                `).join('');
            }
        } catch (err) {
            alert('Erreur lors du scan de ports : ' + err);
        } finally {
            btnScan.disabled = false;
            btnScan.innerHTML = `<i data-lucide="shield-alert"></i> <span>Lancer l'Audit</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    });
}

// ─── Paramètres ─────────────────────────────────────────────────────────────
async function initSettingsEvents() {
    const settings = await window.api.getSettings();
    appState.settings = settings;

    const intervalSelect = document.getElementById('setting-scan-interval');
    const notifCheck = document.getElementById('setting-notifications');
    const soundCheck = document.getElementById('setting-sound');
    const autoScanCheck = document.getElementById('setting-autoscan');
    const trayCheck = document.getElementById('setting-tray');

    if (intervalSelect) intervalSelect.value = String(settings.scanInterval || 30);
    if (notifCheck) notifCheck.checked = !!settings.notifications;
    if (soundCheck) soundCheck.checked = !!settings.soundAlerts;
    if (autoScanCheck) autoScanCheck.checked = !!settings.autoScan;
    if (trayCheck) trayCheck.checked = (settings.minimizeToTray !== false);

    intervalSelect?.addEventListener('change', async (e) => {
        await window.api.updateSettings({ scanInterval: parseInt(e.target.value, 10) });
    });

    notifCheck?.addEventListener('change', async (e) => {
        await window.api.updateSettings({ notifications: e.target.checked });
    });

    trayCheck?.addEventListener('change', async (e) => {
        await window.api.updateSettings({ minimizeToTray: e.target.checked });
    });

    soundCheck?.addEventListener('change', async (e) => {
        await window.api.updateSettings({ soundAlerts: e.target.checked });
        appState.settings.soundAlerts = e.target.checked;
    });

    autoScanCheck?.addEventListener('change', async (e) => {
        await window.api.updateSettings({ autoScan: e.target.checked });
    });

    // Multi-Sous-Réseaux & VLANs
    const customSubnetsInput = document.getElementById('setting-custom-subnets');
    if (customSubnetsInput) customSubnetsInput.value = settings.customSubnets || '';
    customSubnetsInput?.addEventListener('change', async (e) => {
        await window.api.updateSettings({ customSubnets: e.target.value.trim() });
    });

    // Webhooks Entreprise (Slack, Discord, Teams, Generic)
    const whEnabled = document.getElementById('setting-webhook-enabled');
    const whType = document.getElementById('setting-webhook-type');
    const whUrl = document.getElementById('setting-webhook-url');
    const whSev = document.getElementById('setting-webhook-severity');

    if (whEnabled) whEnabled.checked = !!settings.webhookEnabled;
    if (whType) whType.value = settings.webhookType || 'slack';
    if (whUrl) whUrl.value = settings.webhookUrl || '';
    if (whSev) whSev.value = settings.webhookMinSeverity || 'warning';

    const saveWebhookSettings = async () => {
        await window.api.updateSettings({
            webhookEnabled: whEnabled ? whEnabled.checked : false,
            webhookType: whType ? whType.value : 'slack',
            webhookUrl: whUrl ? whUrl.value.trim() : '',
            webhookMinSeverity: whSev ? whSev.value : 'warning'
        });
    };

    whEnabled?.addEventListener('change', saveWebhookSettings);
    whType?.addEventListener('change', saveWebhookSettings);
    whUrl?.addEventListener('change', saveWebhookSettings);
    whSev?.addEventListener('change', saveWebhookSettings);

    document.getElementById('btn-test-webhook')?.addEventListener('click', async () => {
        const url = whUrl?.value?.trim();
        if (!url) {
            alert('Veuillez spécifier une URL de Webhook valide avant de tester.');
            return;
        }

        const btn = document.getElementById('btn-test-webhook');
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Envoi...`;
        if (window.lucide) window.lucide.createIcons();

        try {
            const res = await window.api.testWebhook({
                url,
                type: whType?.value || 'generic'
            });
            if (res && res.success) {
                alert('✅ Webhook expédié avec succès ! Vérifiez votre canal Slack/Teams/Discord.');
            } else {
                alert(`❌ Échec d'envoi du webhook : ${res?.message || 'Erreur réseau ou URL invalide'}`);
            }
        } catch (err) {
            alert('Erreur lors du test webhook : ' + err);
        } finally {
            btn.innerHTML = `<i data-lucide="send"></i> <span>Tester le Webhook</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    });

    // Exports de sauvegarde
    document.getElementById('btn-export-db')?.addEventListener('click', () => {
        const payload = {
            generator: 'Wifi-Watch Enterprise Sentinel v2.0',
            exportedAt: new Date().toISOString(),
            environment: appState.environment,
            devices: appState.devices,
            alerts: appState.alerts
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wifi-watch-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('btn-export-alerts-csv')?.addEventListener('click', async () => {
        try {
            const csv = await window.api.exportAlertsCsv();
            const result = await window.api.saveExportFile(`wifi-watch-alerts-${new Date().toISOString().slice(0, 10)}.csv`, csv);
            if (result && result.success) {
                alert(`Alertes exportées avec succès sous :\n${result.filePath}`);
            }
        } catch (err) {
            alert('Erreur export alertes : ' + err);
        }
    });

    // Thème et Langue initiaux
    if (settings.theme === 'corporate') {
        document.body.classList.add('theme-corporate');
        const themeSel = document.getElementById('setting-theme');
        if (themeSel) themeSel.value = 'corporate';
    }
    if (settings.language && window.i18n) {
        window.i18n.setLanguage(settings.language);
        const label = document.getElementById('lang-current-label');
        if (label) label.innerText = settings.language.toUpperCase();
        const langSel = document.getElementById('setting-language');
        if (langSel) langSel.value = settings.language;
    }
}

// ─── DNS Guard & SLA Events ─────────────────────────────────────────────────
function initDnsGuardEvents() {
    const btnAudit = document.getElementById('btn-run-dns-audit');
    btnAudit?.addEventListener('click', async () => {
        btnAudit.disabled = true;
        btnAudit.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Audit en cours...`;
        if (window.lucide) window.lucide.createIcons();

        try {
            const report = await window.api.auditDns();

            const latEl = document.getElementById('dns-kpi-latency');
            const latSubEl = document.getElementById('dns-kpi-latency-sub');
            const integEl = document.getElementById('dns-kpi-integrity');
            const integIcon = document.getElementById('dns-kpi-integrity-icon');
            const countEl = document.getElementById('dns-kpi-servers-count');

            if (latEl) latEl.innerHTML = `${report.latencyMs || '--'} <span style="font-size: 14px; font-weight: normal; color: var(--text-muted);">ms</span>`;
            if (latSubEl) latSubEl.innerText = report.latencyMs < 100 ? 'Excellent SLA (< 100ms)' : (report.latencyMs < 250 ? 'SLA Conforme' : 'SLA Dégradé (> 250ms)');

            if (integEl) {
                if (report.hijackDetected) {
                    integEl.innerText = 'Détournement !';
                    integEl.style.color = 'var(--accent-red)';
                    if (integIcon) integIcon.className = 'kpi-icon red';
                } else {
                    integEl.innerText = 'Intègre (Vérifié)';
                    integEl.style.color = 'var(--accent-green)';
                    if (integIcon) integIcon.className = 'kpi-icon green';
                }
            }
            if (countEl) countEl.innerText = (report.testedServers || []).length;

            const tbody = document.getElementById('dns-servers-tbody');
            if (tbody) {
                tbody.innerHTML = (report.testedServers || []).map(s => {
                    const isSystem = (report.systemServers || []).includes(s.server);
                    const isCloudflare = s.server === '1.1.1.1';
                    const isGoogle = s.server === '8.8.8.8';
                    const provider = isSystem ? 'Passerelle / DNS Système' : (isCloudflare ? 'Cloudflare CDN Edge' : (isGoogle ? 'Google Public DNS' : 'Serveur Personnalisé'));

                    return `
                        <tr>
                            <td><strong style="font-family: monospace;">${s.server}</strong></td>
                            <td><span style="font-size: 12px; color: var(--text-secondary);">${provider}</span></td>
                            <td>${s.reachable ? '<span class="badge badge-online">Disponible</span>' : '<span class="badge badge-blocked">Injoignable</span>'}</td>
                            <td><span style="font-family: monospace; font-weight: 600; color: ${s.avgLatencyMs < 80 ? 'var(--accent-green)' : (s.avgLatencyMs < 200 ? 'var(--accent-cyan)' : 'var(--accent-amber)')};">${s.avgLatencyMs > 0 ? s.avgLatencyMs + ' ms' : '--'}</span></td>
                            <td>${s.hijackDetected ? '<span class="badge badge-blocked">Hijack Détecté</span>' : '<span class="badge badge-online">Vérifié (Conforme)</span>'}</td>
                        </tr>
                    `;
                }).join('');
            }

            const recoCard = document.getElementById('dns-recommendations-card');
            const recoList = document.getElementById('dns-recommendations-list');
            if (recoCard && recoList) {
                const items = [...(report.warnings || []), ...(report.recommendations || [])];
                if (items.length > 0) {
                    recoCard.style.display = 'block';
                    recoList.innerHTML = items.map(w => `<li>• ${escapeHtml(w)}</li>`).join('');
                } else {
                    recoCard.style.display = 'none';
                }
            }
        } catch (err) {
            alert('Erreur audit DNS : ' + err);
        } finally {
            btnAudit.disabled = false;
            btnAudit.innerHTML = `<i data-lucide="shield-check"></i> <span data-i18n="dns.btn_audit">Tester l'Infrastructure DNS</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    });
}

// ─── Enterprise Exports Events ──────────────────────────────────────────────
function initEnterpriseExportEvents() {
    const triggerExport = async (format) => {
        try {
            let content = '';
            let defaultName = '';
            const dateStr = new Date().toISOString().slice(0, 10);

            if (format === 'csv') {
                content = await window.api.exportDevicesCsv();
                defaultName = `wifi-watch-inventory-${dateStr}.csv`;
            } else if (format === 'json') {
                content = await window.api.exportDevicesJson();
                defaultName = `wifi-watch-inventory-${dateStr}.json`;
            }

            const result = await window.api.saveExportFile(defaultName, content);
            if (result && result.success) {
                alert(`Export réussi !\nFichier enregistré sous :\n${result.filePath}`);
            } else if (result && result.error) {
                alert(`Échec de l'exportation : ${result.error}`);
            }
        } catch (err) {
            alert('Erreur lors de l\'exportation : ' + err);
        }
    };

    document.getElementById('btn-export-csv')?.addEventListener('click', () => triggerExport('csv'));
    document.getElementById('btn-quick-export')?.addEventListener('click', () => triggerExport('csv'));
    document.getElementById('btn-export-json')?.addEventListener('click', () => triggerExport('json'));
}

// ─── Langue & Thème Events ──────────────────────────────────────────────────
function initLanguageAndThemeEvents() {
    const langToggleBtn = document.getElementById('btn-lang-toggle');
    langToggleBtn?.addEventListener('click', async () => {
        const cur = window.i18n ? window.i18n.getLanguage() : 'fr';
        const next = cur === 'fr' ? 'en' : 'fr';
        if (window.i18n) window.i18n.setLanguage(next);
        const label = document.getElementById('lang-current-label');
        if (label) label.innerText = next.toUpperCase();
        const sel = document.getElementById('setting-language');
        if (sel) sel.value = next;
        await window.api.updateSettings({ language: next });
    });

    document.getElementById('setting-language')?.addEventListener('change', async (e) => {
        const lang = e.target.value;
        if (window.i18n) window.i18n.setLanguage(lang);
        const label = document.getElementById('lang-current-label');
        if (label) label.innerText = lang.toUpperCase();
        await window.api.updateSettings({ language: lang });
    });

    document.getElementById('setting-theme')?.addEventListener('change', async (e) => {
    });
}

// ─── Canari Cyber & Piège Anti-Ransomware (Honeypot) ────────────────────────
async function refreshHoneypotView() {
    try {
        const status = await window.api.getHoneypotStatus();
        const kpiStatus = document.getElementById('hp-kpi-status');
        const kpiPort = document.getElementById('hp-kpi-port');
        const kpiProbes = document.getElementById('hp-kpi-probes');
        const kpiAuto = document.getElementById('hp-kpi-autoblock');
        const btnToggleText = document.getElementById('btn-honeypot-text');
        const inputPort = document.getElementById('hp-input-port');
        const checkAuto = document.getElementById('hp-check-autoblock');

        if (kpiStatus) {
            kpiStatus.innerText = status.isRunning ? 'Actif (Armé)' : 'Désactivé';
            kpiStatus.style.color = status.isRunning ? 'var(--accent-green)' : 'var(--text-muted)';
        }
        if (kpiPort) kpiPort.innerText = `Port leurre : ${status.port}`;
        if (kpiProbes) kpiProbes.innerText = status.totalProbes || 0;
        if (kpiAuto) {
            kpiAuto.innerText = status.autoBlock ? 'Actif (Armé)' : 'Inactif';
            kpiAuto.style.color = status.autoBlock ? 'var(--accent-green)' : 'var(--text-muted)';
        }
        if (btnToggleText) btnToggleText.innerText = status.isRunning ? 'Désactiver le Piège' : 'Activer le Piège Canari';
        if (inputPort && !inputPort.matches(':focus')) inputPort.value = status.port;
        if (checkAuto) checkAuto.checked = !!status.autoBlock;

        const tbody = document.getElementById('hp-probes-tbody');
        if (tbody && status.recentProbes && status.recentProbes.length > 0) {
            tbody.innerHTML = status.recentProbes.map(p => `
                <tr>
                    <td style="font-family: monospace;">${new Date(p.timestamp).toLocaleTimeString()}</td>
                    <td><strong style="color: var(--accent-red); font-family: monospace;">${p.attackerIp}</strong></td>
                    <td>Port TCP ${p.targetPort}</td>
                    <td><span class="badge badge-blocked">CRITIQUE</span></td>
                    <td>${p.autoBlocked ? '<span class="badge badge-blocked">Isolé via Pare-feu</span>' : '<span class="badge badge-unknown">Alerte Notifiée</span>'}</td>
                </tr>
            `).join('');
        }
    } catch (_) {}
}

function initHoneypotEvents() {
    document.getElementById('btn-toggle-honeypot')?.addEventListener('click', async () => {
        const cur = await window.api.getHoneypotStatus();
        const port = Number(document.getElementById('hp-input-port')?.value) || 4455;
        const autoBlock = document.getElementById('hp-check-autoblock')?.checked || false;
        await window.api.toggleHoneypot(!cur.isRunning, port, autoBlock);
        await refreshHoneypotView();
    });

    document.getElementById('btn-save-honeypot-cfg')?.addEventListener('click', async () => {
        const port = Number(document.getElementById('hp-input-port')?.value) || 4455;
        const autoBlock = document.getElementById('hp-check-autoblock')?.checked || false;
        await window.api.toggleHoneypot(true, port, autoBlock);
        await refreshHoneypotView();
        alert(`Canari réseau reconfiguré sur le port ${port} avec auto-quarantaine ${autoBlock ? 'activée' : 'désactivée'}.`);
    });

    document.getElementById('btn-test-honeypot')?.addEventListener('click', async () => {
        alert('Simulation de sonde déclenchée ! Le port canari va intercepter un paquet test.');
        window.api.scanDevicePortsDetailed('127.0.0.1', null, [4455]);
    });

    window.api.onCanaryProbe((probe) => {
        playAlertBeep('critical');
        if (appState.voiceSentinel) {
            appState.voiceSentinel.announceThreat(`Mouvement latéral suspect intercepté depuis ${probe.attackerIp}`);
        }
        refreshHoneypotView();
    });
}

// ─── Audit Serveurs DHCP & Passerelles ───────────────────────────────────────
function initDhcpEvents() {
    const btn = document.getElementById('btn-run-dhcp-audit');
    btn?.addEventListener('click', async () => {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Audit en cours...`;
        if (window.lucide) window.lucide.createIcons();

        try {
            const report = await window.api.auditDhcp();
            document.getElementById('dhcp-val-server').innerText = (report.dhcpServers || []).join(', ') || 'Auto (Passerelle)';
            document.getElementById('dhcp-val-gateway').innerText = (report.gateways || []).join(', ') || '--';

            const statusEl = document.getElementById('dhcp-val-status');
            const detailsEl = document.getElementById('dhcp-val-details');

            if (report.isRogueDetected || report.status === 'CRITICAL') {
                statusEl.innerText = 'DANGER ROGUE';
                statusEl.style.color = 'var(--accent-red)';
                detailsEl.innerText = report.message;
                detailsEl.style.color = 'var(--accent-red)';
            } else {
                statusEl.innerText = 'Sécurisé';
                statusEl.style.color = 'var(--accent-green)';
                detailsEl.innerText = report.message;
                detailsEl.style.color = 'var(--text-muted)';
            }
        } catch (err) {
            alert('Erreur audit DHCP: ' + err);
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="refresh-cw"></i> <span>Auditer DHCP</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    });
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

// ─── Voice Sentinel (Assistant Vocal Cyber) ─────────────────────────────────
async function initVoiceSentinel() {
    if (typeof VoiceSentinel !== 'undefined') {
        appState.voiceSentinel = new VoiceSentinel();
        const settings = await window.api.getSettings();
        const enabled = (settings.voiceSentinelEnabled !== false);
        appState.voiceSentinel.setEnabled(enabled);
        updateVoiceToggleUI(enabled);
    }

    const toggleBtn = document.getElementById('btn-voice-toggle');
    toggleBtn?.addEventListener('click', async () => {
        if (!appState.voiceSentinel) return;
        const current = appState.voiceSentinel.isEnabled();
        const next = !current;
        appState.voiceSentinel.setEnabled(next);
        updateVoiceToggleUI(next);
        await window.api.updateSettings({ voiceSentinelEnabled: next });
        if (next) {
            appState.voiceSentinel.testVoice();
        }
    });
}

function updateVoiceToggleUI(enabled) {
    const text = document.getElementById('voice-status-text');
    const btn = document.getElementById('btn-voice-toggle');

    if (text) text.innerText = enabled ? 'Voix : ON' : 'Voix : OFF';
    if (btn) {
        btn.style.color = enabled ? 'var(--accent-cyan)' : 'var(--text-muted)';
        btn.style.borderColor = enabled ? 'rgba(0, 240, 255, 0.3)' : 'var(--border-color)';
        btn.style.background = enabled ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)';
    }
}

// ─── IoT Spy Hunter (Détecteur de Caméras & Micros) ─────────────────────────
function initSpyHunterEvents() {
    const btnStart = document.getElementById('btn-start-spy-hunt');
    btnStart?.addEventListener('click', async () => {
        const progressContainer = document.getElementById('spy-progress-container');
        const btnText = document.getElementById('btn-spy-text');

        btnStart.disabled = true;
        btnText.innerText = 'Chasse en cours...';
        if (progressContainer) progressContainer.style.display = 'block';

        if (appState.voiceSentinel) {
            appState.voiceSentinel.speak("Lancement de la traque des caméras et micros espions sur le réseau local.");
        }

        try {
            const report = await window.api.huntSpyDevices();
            appState.spyResults = report;
            renderSpyView();

            if (report.spyDevicesFound > 0) {
                if (appState.voiceSentinel) {
                    const first = report.devices[0];
                    appState.voiceSentinel.announceSpyDevice(first.detectedBrand || 'Caméra inconnue', first.ip);
                }
            } else {
                if (appState.voiceSentinel) {
                    appState.voiceSentinel.speak("Chasse terminée : aucun équipement de surveillance hostile détecté.");
                }
            }
        } catch (err) {
            alert('Erreur durant la chasse aux espions : ' + err);
        } finally {
            btnStart.disabled = false;
            btnText.innerText = 'Lancer la Chasse aux Espions';
            if (progressContainer) {
                setTimeout(() => { progressContainer.style.display = 'none'; }, 2000);
            }
            if (window.lucide) window.lucide.createIcons();
        }
    });
}

function renderSpyView() {
    const report = appState.spyResults;
    const scannedEl = document.getElementById('spy-stat-scanned');
    const foundEl = document.getElementById('spy-stat-found');
    const rtspEl = document.getElementById('spy-stat-rtsp');
    const threatEl = document.getElementById('spy-stat-threat');
    const threatDescEl = document.getElementById('spy-stat-threat-desc');
    const tbody = document.getElementById('spy-devices-table-body');
    const badge = document.getElementById('sidebar-spy-count');

    if (!report) {
        if (scannedEl) scannedEl.innerText = `${appState.devices.filter(d => d.isOnline).length}`;
        return;
    }

    if (scannedEl) scannedEl.innerText = `${report.scannedCount}`;
    if (foundEl) foundEl.innerText = `${report.spyDevicesFound}`;

    let rtspCount = 0;
    (report.devices || []).forEach(d => {
        if (d.openSurveillancePorts?.some(p => p.port === 554 || p.port === 8554)) rtspCount++;
    });
    if (rtspEl) rtspEl.innerText = `${rtspCount}`;

    if (badge) {
        badge.innerText = `${report.spyDevicesFound}`;
        badge.style.display = report.spyDevicesFound > 0 ? 'inline-block' : 'none';
    }

    if (report.spyDevicesFound > 0) {
        if (threatEl) {
            threatEl.innerText = 'SURVEILLANCE ACTIVE';
            threatEl.className = 'stat-value text-red';
        }
        if (threatDescEl) threatDescEl.innerText = `${report.spyDevicesFound} équipement(s) vidéo/audio actif(s)`;
    } else {
        if (threatEl) {
            threatEl.innerText = 'SÉCURISÉ';
            threatEl.className = 'stat-value text-green';
        }
        if (threatDescEl) threatDescEl.innerText = 'Aucune caméra hostile';
    }

    if (!tbody) return;

    if (!report.devices || report.devices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--accent-green); padding: 35px;">
                    <i data-lucide="shield-check" style="width: 32px; height: 32px; margin-bottom: 8px; display: inline-block;"></i>
                    <div style="font-weight: 600;">Périmètre Sain : Aucune caméra ou micro espion détecté sur le réseau local.</div>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = report.devices.map(d => {
            const portsStr = (d.openSurveillancePorts || []).map(p => `<span class="badge badge-unknown" style="font-family: monospace;">${p.port} (${p.service})</span>`).join(' ');
            const rtspUrlsHtml = (d.streamUrls || []).length > 0 
                ? `<div style="font-size: 11px; color: var(--accent-cyan); font-family: monospace; margin-top: 4px;">Flux : ${d.streamUrls[0]}</div>`
                : '';

            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(255,51,102,0.15); border: 1px solid rgba(255,51,102,0.3); display: flex; align-items: center; justify-content: center; color: var(--accent-red);">
                                <i data-lucide="video" style="width: 18px; height: 18px;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 600;">${escapeHtml(d.hostname)}</div>
                                <div style="font-size: 11px; color: var(--text-muted);">${d.mac}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="detail-val" style="font-weight: 600;">${d.ip}</span></td>
                    <td>
                        <div style="font-weight: 600;">${escapeHtml(d.detectedBrand || d.vendor)}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">${d.equipmentType}</div>
                    </td>
                    <td>
                        <div>${portsStr || '<span style="color: var(--text-muted);">Aucun port standard</span>'}</div>
                        ${rtspUrlsHtml}
                    </td>
                    <td>
                        <span class="badge ${d.threatLevel === 'CRITICAL' ? 'badge-blocked' : (d.threatLevel === 'HIGH' ? 'badge-blocked' : 'badge-unknown')}">
                            ${d.threatLevel}
                        </span>
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">${escapeHtml(d.riskReason)}</div>
                    </td>
                    <td>
                        <button class="btn btn-danger btn-sm" onclick="isolateRogueDevice('${d.ip}', '${d.mac}')" title="Couper tout accès réseau via le pare-feu">
                            <i data-lucide="shield-off"></i>
                            <span>Isoler</span>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    if (window.lucide) window.lucide.createIcons();
}

window.isolateRogueDevice = async function(ip, mac) {
    if (confirm(`Voulez-vous isoler immédiatement l'équipement ${ip} avec le pare-feu Windows ?`)) {
        await window.api.isolateDevice(ip, mac);
        if (appState.voiceSentinel) {
            appState.voiceSentinel.speak(`Équipement de surveillance ${ip} neutralisé.`);
        }
        alert(`Équipement ${ip} isolé avec succès ! Tout échange de paquets est désormais bloqué.`);
        await refreshDevices();
        if (appState.currentView === 'spy') {
            document.getElementById('btn-start-spy-hunt')?.click();
        }
    }
};

// ─── Timeline & Présence (Contrôle Parental) ────────────────────────────────
function initTimelineEvents() {
    const filterSelect = document.getElementById('timeline-device-filter');
    const refreshBtn = document.getElementById('btn-refresh-timeline');
    const clearBtn = document.getElementById('btn-clear-sessions');

    filterSelect?.addEventListener('change', () => {
        renderTimelineView();
    });

    refreshBtn?.addEventListener('click', () => {
        renderTimelineView();
    });

    clearBtn?.addEventListener('click', async () => {
        const selectedMac = filterSelect.value || null;
        if (confirm('Voulez-vous effacer l\'historique des sessions de présence ?')) {
            await window.api.clearSessions(selectedMac);
            renderTimelineView();
        }
    });
}

async function renderTimelineView() {
    const filterSelect = document.getElementById('timeline-device-filter');
    const selectedMac = filterSelect ? filterSelect.value : null;

    // Remplir le filtre avec les appareils si besoin
    if (filterSelect && filterSelect.options.length <= 1) {
        appState.devices.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.mac;
            opt.innerText = `${d.customName || d.hostname || d.ip} (${d.vendor})`;
            filterSelect.appendChild(opt);
        });
    }

    try {
        const [sessions, stats] = await Promise.all([
            window.api.getDeviceSessions(selectedMac, 100),
            window.api.getTimelineStats(selectedMac)
        ]);

        const kpiHours = document.getElementById('timeline-kpi-hours');
        const kpiSessions = document.getElementById('timeline-kpi-sessions');
        const kpiNight = document.getElementById('timeline-kpi-night');
        const kpiNightDesc = document.getElementById('timeline-kpi-night-desc');
        const kpiActive = document.getElementById('timeline-kpi-active');
        const tbody = document.getElementById('timeline-sessions-table-body');

        if (kpiHours) kpiHours.innerText = `${stats.totalHoursToday} h`;
        if (kpiSessions) kpiSessions.innerText = `${stats.totalSessionsToday}`;

        if (kpiNight) {
            kpiNight.innerText = stats.hasNightActivity ? 'OUI' : 'NON';
            kpiNight.className = stats.hasNightActivity ? 'stat-value text-orange' : 'stat-value text-green';
        }
        if (kpiNightDesc) {
            kpiNightDesc.innerText = stats.hasNightActivity ? 'Connexion nocturne détectée (23h - 6h)' : 'Aucune utilisation la nuit';
        }
        if (kpiActive) kpiActive.innerText = `${stats.activeNowCount}`;

        if (!tbody) return;

        if (!sessions || sessions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
                        Aucune session de connexion enregistrée. Les sessions se créent automatiquement à chaque scan réseau.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = sessions.map(s => {
            const dev = appState.devices.find(d => d.mac === s.mac) || {};
            const icon = getDeviceIcon(dev.deviceType || 'unknown');
            const isOnlineNow = !s.endedAt;
            const startFormatted = new Date(s.startedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            const endFormatted = s.endedAt ? new Date(s.endedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
            
            let durationStr = `${s.durationMinutes || 1} min`;
            if (s.durationMinutes >= 60) {
                const h = Math.floor(s.durationMinutes / 60);
                const m = s.durationMinutes % 60;
                durationStr = `${h}h ${m}m`;
            }

            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i data-lucide="${icon}" style="width: 16px; height: 16px; color: var(--accent-cyan);"></i>
                            <div>
                                <span style="font-weight: 600;">${escapeHtml(s.hostname || 'Appareil')}</span>
                                <div style="font-size: 11px; color: var(--text-muted);">${s.mac}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="detail-val">${s.ip || '—'}</span></td>
                    <td style="font-size: 12px;">${startFormatted}</td>
                    <td style="font-size: 12px;">${isOnlineNow ? '<span class="badge badge-online">Actif maintenant</span>' : endFormatted}</td>
                    <td>
                        <span style="font-family: monospace; font-weight: 600; color: var(--accent-cyan);">${durationStr}</span>
                    </td>
                    <td>
                        ${s.isNightSession ? '<span class="badge badge-unknown" title="Activité entre 23h et 06h"><i data-lucide="moon" style="width: 10px; height: 10px; display: inline;"></i> Nuit</span>' : '<span class="badge badge-trusted">Journée</span>'}
                        ${isOnlineNow ? '<span class="badge badge-online">Connecté</span>' : '<span class="badge badge-offline">Déconnecté</span>'}
                    </td>
                </tr>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        console.error('Erreur render timeline:', err);
    }
}

// ─── Portail Invité Wi-Fi & QR Code ─────────────────────────────────────────
function initGuestPortalEvents() {
    const ssidInput = document.getElementById('guest-input-ssid');
    const passInput = document.getElementById('guest-input-password');
    const secSelect = document.getElementById('guest-select-security');
    const generateBtn = document.getElementById('btn-generate-guest-qr');
    const togglePassBtn = document.getElementById('btn-toggle-guest-pass');
    const printBtn = document.getElementById('btn-print-badge');

    togglePassBtn?.addEventListener('click', () => {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        togglePassBtn.innerHTML = isPass ? '<i data-lucide="eye-off" style="width: 16px; height: 16px;"></i>' : '<i data-lucide="eye" style="width: 16px; height: 16px;"></i>';
        if (window.lucide) window.lucide.createIcons();
    });

    generateBtn?.addEventListener('click', () => {
        renderGuestBadge();
    });

    printBtn?.addEventListener('click', () => {
        window.print();
    });
}

function renderGuestView() {
    const ssidInput = document.getElementById('guest-input-ssid');
    if (ssidInput && !ssidInput.value && appState.environment?.wifi?.ssid) {
        ssidInput.value = appState.environment.wifi.ssid;
    }
    renderGuestBadge();
}

function renderGuestBadge() {
    const ssidInput = document.getElementById('guest-input-ssid');
    const passInput = document.getElementById('guest-input-password');
    const secSelect = document.getElementById('guest-select-security');
    const canvas = document.getElementById('guest-qr-canvas');
    const badgeSsid = document.getElementById('badge-display-ssid');
    const badgeSec = document.getElementById('badge-display-sec');

    const ssid = ssidInput?.value.trim() || appState.environment?.wifi?.ssid || 'Mon_WiFi';
    const password = passInput?.value || '';
    const security = secSelect?.value || 'WPA';

    if (badgeSsid) badgeSsid.innerText = ssid;
    if (badgeSec) badgeSec.innerText = security === 'OPEN' ? 'Réseau Ouvert (Sans code)' : security;

    if (typeof QRCodeGenerator !== 'undefined' && canvas) {
        const payload = QRCodeGenerator.formatWifiPayload(ssid, password, security);
        QRCodeGenerator.renderToCanvas(canvas, payload, {
            size: 190,
            fgColor: '#00f0ff',
            bgColor: '#090d16',
            margin: 3
        });
    }
}

// ─── RuView (Spatial Sensing & WiFi DensePose - ruvnet/RuView) ───────────────
function initRuViewEvents() {
    const btnToggle = document.getElementById('btn-ruview-toggle-feed');
    const btnCalibrate = document.getElementById('btn-ruview-calibrate');
    const btnToggleNode = document.getElementById('btn-ruview-toggle-node');
    const btnConnect = document.getElementById('btn-ruview-connect');
    const btnRevert = document.getElementById('btn-ruview-revert-rusense');
    const actSelect = document.getElementById('ruview-activity-select');

    btnToggle?.addEventListener('click', () => {
        toggleRuViewFeed(!appState.ruviewRunning);
    });

    btnCalibrate?.addEventListener('click', async () => {
        btnCalibrate.disabled = true;
        btnCalibrate.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Étalonnage...`;
        if (window.lucide) window.lucide.createIcons();

        if (appState.voiceSentinel) {
            appState.voiceSentinel.speak("Étalonnage du bruit électromagnétique ambiant en cours.");
        }

        await window.api.calibrateRuView();

        setTimeout(() => {
            btnCalibrate.disabled = false;
            btnCalibrate.innerHTML = `<i data-lucide="sliders"></i> <span>Calibrer Espace RF</span>`;
            if (window.lucide) window.lucide.createIcons();
            if (appState.voiceSentinel) {
                appState.voiceSentinel.speak("Étalonnage terminé. Espace RF référencé.");
            }
        }, 1500);
    });

    btnToggleNode?.addEventListener('click', () => {
        const card = document.getElementById('ruview-hardware-card');
        if (card) {
            card.style.display = card.style.display === 'none' ? 'block' : 'none';
        }
    });

    btnConnect?.addEventListener('click', async () => {
        const url = document.getElementById('ruview-node-input-url')?.value.trim();
        if (!url) {
            alert('Veuillez entrer une adresse WebSocket valide (ex: ws://192.168.1.150:8765)');
            return;
        }
        await window.api.connectRuViewNode(url);
        toggleRuViewFeed(true);
    });

    btnRevert?.addEventListener('click', async () => {
        await window.api.connectRuViewNode(null);
        document.getElementById('ruview-hardware-card').style.display = 'none';
        toggleRuViewFeed(true);
    });

    actSelect?.addEventListener('change', async (e) => {
        const act = e.target.value;
        await window.api.setRuViewActivity(act);
        if (act === 'FALL_ALERT' && appState.voiceSentinel) {
            appState.voiceSentinel.speak("Alerte critique RuView : Chute d'une personne détectée dans la zone de surveillance !", 'critical');
        }
    });
}

async function toggleRuViewFeed(start) {
    appState.ruviewRunning = Boolean(start);
    const btnText = document.getElementById('ruview-feed-text');
    const btnIcon = document.getElementById('ruview-feed-icon');

    if (start) {
        await window.api.startRuView();
        if (btnText) btnText.innerText = 'Pause Flux RF';
        if (btnIcon) btnIcon.setAttribute('data-lucide', 'pause');
    } else {
        await window.api.stopRuView();
        if (btnText) btnText.innerText = 'Reprendre Flux RF';
        if (btnIcon) btnIcon.setAttribute('data-lucide', 'play');
    }
    if (window.lucide) window.lucide.createIcons();
}

function updateRuViewHud(data) {
    const presenceEl = document.getElementById('ruview-stat-presence');
    const confEl = document.getElementById('ruview-stat-conf');
    const occEl = document.getElementById('ruview-stat-occupancy');
    const breathEl = document.getElementById('ruview-stat-breathing');
    const heartEl = document.getElementById('ruview-stat-heart');

    if (presenceEl) {
        if (data.presence) {
            if (data.activity === 'FALL_ALERT') {
                presenceEl.innerText = 'CHUTE AU SOL';
                presenceEl.className = 'stat-value text-red';
            } else {
                presenceEl.innerText = 'DÉTECTÉE';
                presenceEl.className = 'stat-value text-cyan';
            }
        } else {
            presenceEl.innerText = 'ABSENCE';
            presenceEl.className = 'stat-value text-green';
        }
    }

    if (confEl) confEl.innerText = `${data.confidence || 0}% Confiance Spatiale`;
    if (occEl) occEl.innerText = `${data.occupancy || 0} Personne${(data.occupancy || 0) > 1 ? 's' : ''}`;
    if (breathEl) breathEl.innerHTML = `${data.breathingBpm || '--'} <span style="font-size: 13px; font-weight: normal; color: var(--text-muted);">BPM</span>`;
    if (heartEl) heartEl.innerHTML = `${data.heartBpm || '--'} <span style="font-size: 13px; font-weight: normal; color: var(--text-muted);">BPM</span>`;
}


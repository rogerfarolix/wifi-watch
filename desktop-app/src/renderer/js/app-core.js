/**
 * Wifi-Watch - Renderer : Initialisation, navigation, radar, graphiques, événements IPC et rafraîchissement
 * (module issu du découpage d'app.js ; scripts classiques, portée globale partagée)
 */

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
    initToastSystem();
    initCommandPalette();
    initWallboardEvents();

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
    if (viewName === 'wallboard') refreshWallboard();

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

    // Démo uniquement : les graphiques démarrent avec l'historique préparé par le processus principal
    window.api.isDemo().then(async (isDemo) => {
        if (!isDemo) return;
        const history = await window.api.getBandwidthHistory();
        const fill = (chart, series) => {
            if (!chart) return;
            series.forEach((values, i) => {
                const data = chart.data.datasets[i].data;
                const tail = values.slice(-data.length);
                chart.data.datasets[i].data = Array(data.length - tail.length).fill(0).concat(tail);
            });
            chart.update();
        };
        fill(appState.liveChart, [history.map(h => h.rxMbps), history.map(h => h.txMbps), history.map(h => h.pingGatewayMs || 0)]);
        fill(appState.monitorChart, [history.map(h => h.rxMbps), history.map(h => h.txMbps)]);
    });
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

// Délégation d'événements : remplace les attributs onclick inline (compatibles avec la CSP script-src 'self')
const DELEGATED_ACTIONS = ['openDeviceModal', 'markAlertRead', 'trustDevice', 'blockDevice', 'unblockDevice', 'isolateRogueDevice'];
document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (!DELEGATED_ACTIONS.includes(action) || typeof window[action] !== 'function') return;
    const args = [el.dataset.arg1, el.dataset.arg2].filter(a => a !== undefined);
    window[action](...args);
});

// Libellés des graphiques Chart.js (canvas, hors DOM) : suivent la langue de l'interface
if (window.i18n) {
    window.i18n.onChange(() => {
        for (const chart of [appState.liveChart, appState.monitorChart]) {
            if (!chart) continue;
            chart.data.datasets.forEach(ds => {
                ds.__fr = ds.__fr || ds.label;
                ds.label = window.i18n.tr(ds.__fr);
            });
            chart.update('none');
        }
    });
}

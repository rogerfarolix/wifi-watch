/**
 * Wifi-Watch - Electron Main Process
 * Coeur de l'application de bureau : orchestration des modules réseau,
 * base de données embarquée, plateau système (Tray) et ponts IPC.
 */

const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage, dialog, safeStorage, shell } = require('electron');
const path = require('path');
const V = require('./network/validators');
const fs = require('fs');

const Database = require('./data/database');
const { getNetworkEnvironment: realGetNetworkEnvironment } = require('./network/detector');
const { performScan: realPerformScan } = require('./network/scanner');
const { scanDevicePorts: realScanDevicePorts } = require('./network/portScanner');
const SpeedMonitor = require('./network/speedMonitor');
const Sentinel = require('./network/sentinel');
const { executeFullSpeedTest } = require('./network/speedtest');
const { scanNeighborNetworks: realScanNeighborNetworks } = require('./network/channelAnalyzer');
const { wakeDevice: realWakeDevice } = require('./network/wol');
const { calculateSecurityScore, generateHtmlReport } = require('./network/auditReport');
const { scanDeviceForSurveillance: realScanDeviceForSurveillance, huntAllSpyDevices: realHuntAllSpyDevices } = require('./network/spyDetector');
const quarantine = require('./network/quarantine');
const RuViewBridge = require('./network/ruviewBridge');
const WebhookDispatcher = require('./network/webhookDispatcher');
const DnsGuard = require('./network/dnsGuard');
const ExportManager = require('./network/exportManager');
const { PortScanner } = require('./network/portScanner');
const ZeroConfDiscovery = require('./network/zeroConfDiscovery');
const Honeypot = require('./network/honeypot');
const DhcpAuditor = require('./network/dhcpAuditor');
const SpectrumAnalyzer = require('./network/spectrumAnalyzer');
const SpeedBenchmark = require('./network/speedBenchmark');
const ThreatIntelligenceApis = require('./network/threatIntelligenceApis');
const { checkForUpdate, RELEASES_URL } = require('./network/updateChecker');
const demo = require('./network/demo');

// Mode démo (`--demo`) : réseau fictif, données isolées, aucune règle de pare-feu réelle
const DEMO = process.argv.includes('--demo');
if (DEMO) {
    const demoDir = path.join(app.getPath('appData'), 'wifi-watch-demo');
    fs.rmSync(demoDir, { recursive: true, force: true });
    app.setPath('userData', demoDir);
}
const getNetworkEnvironment = DEMO ? async () => demo.getEnvironment() : realGetNetworkEnvironment;
const performScan = DEMO ? async (env, onProgress) => demo.scan(onProgress) : realPerformScan;
const scanNeighborNetworks = DEMO ? async () => demo.neighborNetworks() : realScanNeighborNetworks;
const scanDevicePorts = DEMO ? async (ip) => demo.scanPorts(ip) : realScanDevicePorts;
const huntAllSpyDevices = DEMO ? demo.spyHunt : realHuntAllSpyDevices;
const scanDeviceForSurveillance = DEMO ? async (d) => demo.spyReport(d) : realScanDeviceForSurveillance;
const wakeDevice = DEMO ? async () => ({ success: true }) : realWakeDevice;
const isolateDevice = DEMO ? async () => ({ success: true }) : quarantine.isolateDevice;
const unisolateDevice = DEMO ? async () => ({ success: true }) : quarantine.unisolateDevice;
const checkQuarantineStatus = DEMO ? async () => false : quarantine.checkQuarantineStatus;
if (DEMO) {
    ThreatIntelligenceApis.getPublicIpAndIsp = async () => demo.wanInfo();
    ThreatIntelligenceApis.auditWanWithShodan = async (ip) => ({ ip: ip || demo.wanInfo().ip, isExposed: false, openPorts: [], cves: [], tags: [], hostnames: [], rating: 'SÉCURISÉ' });
}

let mainWindow = null;
let tray = null;
let db = null;
let speedMonitor = null;
let sentinel = null;
let ruviewBridge = null;
let currentEnv = null;

let isScanning = false;
let isSpeedTesting = false;
let speedInterval = null;
let autoScanInterval = null;

function createWindow() {
    const iconPath = path.join(__dirname, 'renderer', 'assets', 'icon.png');
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 840,
        minWidth: 1060,
        minHeight: 700,
        icon: iconPath,
        frame: false, // Fenêtre frameless moderne avec barre de titre personnalisée
        backgroundColor: '#0a0e17',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        },
        show: false
    });

    // Verrouillage de la navigation : aucune fenêtre externe, aucune redirection hors de l'app
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    mainWindow.webContents.on('will-navigate', (e) => e.preventDefault());

    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        startBackgroundServices();
    });

    mainWindow.on('close', (e) => {
        const settings = db?.getSettings() || {};
        if (settings.minimizeToTray && !app.isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        } else {
            stopBackgroundServices();
            mainWindow = null;
        }
    });
}

/**
 * Crée l'icône de zone de notification Windows (System Tray)
 */
function createSystemTray() {
    const iconPath = path.join(__dirname, 'renderer', 'assets', 'icon.png');
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 });

    tray = new Tray(icon);
    tray.setToolTip('Wifi-Watch // Cyber Sentinel');
    updateTrayMenu();
}

/** (Re)construit le menu du tray dans la langue de l'interface. */
function updateTrayMenu() {
    if (!tray) return;
    const en = (db?.getSettings().language || 'fr') === 'en';
    const contextMenu = Menu.buildFromTemplate([
        {
            label: en ? 'Open Wifi-Watch' : 'Ouvrir Wifi-Watch',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        {
            label: en ? 'Scan Network Now' : 'Scanner le Réseau Maintenant',
            click: () => executeScan()
        },
        { type: 'separator' },
        {
            label: en ? 'Quit Completely' : 'Quitter Définitivement',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);
    if (tray.__dblClickBound) return;
    tray.__dblClickBound = true;
    tray.on('double-click', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

/**
 * Lance la boucle de surveillance du débit et les scans automatiques
 */
async function startBackgroundServices() {
    try {
        currentEnv = await getNetworkEnvironment();
    } catch (err) {
        console.error('[MAIN] Erreur détection réseau:', err);
    }

    if (!speedInterval) {
        speedInterval = setInterval(async () => {
            if (!mainWindow || mainWindow.isDestroyed()) return;
            try {
                const gatewayIp = currentEnv?.gatewayIp || '192.168.1.254';
                const sample = DEMO ? demo.bandwidthSample() : await speedMonitor.getSample(gatewayIp);
                db.addBandwidthSample(sample);
                mainWindow.webContents.send('bandwidth:update', sample);
            } catch (_) {}
        }, 2000);
    }

    setTimeout(() => {
        executeScan();
    }, 1000);

    if (DEMO) {
        // Démo : quelques alertes réalistes en plus de l'Evil Twin levé par le scan
        setTimeout(() => {
            const seeded = [
                db.addAlert({
                    type: 'CANARY_TRAP_TRIGGERED',
                    title: 'ALERTE INTRUSION : Sonde suspecte sur le port canari !',
                    description: "L'hôte 192.168.1.88 a tenté de se connecter au port leurre 4455. Risque de scan agressif ou mouvement latéral.",
                    severity: 'critical', ip: '192.168.1.88'
                }),
                db.addAlert({
                    type: 'NEW_DEVICE', title: 'Nouvel appareil détecté sur le Wi-Fi',
                    description: "Un appareil inconnu (Inconnu) a rejoint le réseau avec l'IP 192.168.1.77 et la MAC A0:B1:C2:77:00:77.",
                    severity: 'warning', deviceMac: 'A0:B1:C2:77:00:77', ip: '192.168.1.77'
                }),
                db.addAlert({
                    type: 'NEW_DEVICE', title: 'Nouvel appareil détecté sur le Wi-Fi',
                    description: "Un appareil inconnu (Inconnu) a rejoint le réseau avec l'IP 192.168.1.88 et la MAC A0:B1:C2:88:00:88.",
                    severity: 'warning', deviceMac: 'A0:B1:C2:88:00:88', ip: '192.168.1.88'
                })
            ].filter(Boolean);
            for (const alert of seeded) {
                if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('alert:added', alert);
            }
        }, 4000);
    }

    // Initialisation du canari Honeypot si activé
    const settings = db.getSettings();
    if (settings.honeypotEnabled) {
        Honeypot.start(settings.honeypotPort || 4455, settings.honeypotAutoBlock || false).catch(err => {
            console.error('[MAIN] Erreur démarrage honeypot:', err);
        });
    }

    Honeypot.removeAllListeners('canary-trigger');
    Honeypot.on('canary-trigger', async (probe) => {
        const curSettings = db.getSettings();
        const alert = db.addAlert({
            type: 'CANARY_TRAP_TRIGGERED',
            title: 'ALERTE INTRUSION : Sonde suspecte sur le port canari !',
            description: `L'hôte ${probe.attackerIp} a tenté de se connecter au port leurre ${probe.targetPort}. Risque de scan agressif ou mouvement latéral.`,
            severity: 'critical',
            ip: probe.attackerIp
        });

        if (curSettings.webhookEnabled && curSettings.webhookUrl) {
            WebhookDispatcher.dispatch(curSettings, alert).catch(() => {});
        }

        if (probe.autoBlocked) {
            await isolateDevice(probe.attackerIp);
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('canary:probe', probe);
            mainWindow.webContents.send('alert:added', alert);
        }
    });

    resetAutoScanTimer();
}

function stopBackgroundServices() {
    Honeypot.stop();
    if (speedInterval) {
        clearInterval(speedInterval);
        speedInterval = null;
    }
    if (autoScanInterval) {
        clearInterval(autoScanInterval);
        autoScanInterval = null;
    }
}

function resetAutoScanTimer() {
    if (autoScanInterval) {
        clearInterval(autoScanInterval);
        autoScanInterval = null;
    }

    const settings = db.getSettings();
    if (!settings.autoScan) return;

    const intervalMs = Math.max(15, settings.scanInterval || 30) * 1000;
    autoScanInterval = setInterval(() => {
        if (!isScanning) {
            executeScan();
        }
    }, intervalMs);
}

/**
 * Exécute un scan complet et notifie le renderer
 */
async function executeScan() {
    if (isScanning) return;
    isScanning = true;

    try {
        currentEnv = await getNetworkEnvironment();
        const settings = db.getSettings();
        const customSubnets = settings.customSubnets || null;

        const progressCb = (data) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('scan:progress', data);
            }
        };

        const results = await performScan(currentEnv, progressCb, customSubnets);

        const onlineMacs = [];
        for (const dev of results) {
            onlineMacs.push(dev.mac);
            db.upsertDevice(dev);
        }

        db.markAllOfflineExcept(onlineMacs);
        db.recordPresence(results);

        // Surveillance Uptime des Équipements Critiques (Watchdog "Always-Online")
        if (settings.watchdogEnabled) {
            const criticalDevices = db.getCriticalDevices();
            for (const crit of criticalDevices) {
                if (!onlineMacs.includes(crit.mac)) {
                    const alert = db.addAlert({
                        type: 'CRITICAL_ASSET_OFFLINE',
                        title: 'Alerte Disponibilité : Équipement critique hors-ligne !',
                        description: `L'équipement critique «${crit.customName || crit.hostname || crit.ip}» (${crit.mac}) ne répond plus sur le réseau.`,
                        severity: 'critical',
                        deviceMac: crit.mac,
                        ip: crit.ip
                    });
                    if (alert) newAlerts.push(alert);
                }
            }
        }

        // Découverte passive ZeroConf (mDNS/UPnP) en arrière-plan
        ZeroConfDiscovery.discoverDevices(2500).then(discovered => {
            if (discovered && discovered.size > 0) {
                for (const [ip, info] of discovered.entries()) {
                    const devices = db.getDevices();
                    const target = devices.find(d => d.ip === ip);
                    if (target) {
                        const patch = {};
                        if (!target.model && info.model) patch.model = info.model;
                        if ((!target.hostname || target.hostname === 'Hôte inconnu') && info.name) patch.hostname = info.name;
                        if (Object.keys(patch).length > 0) {
                            db.updateDevice(target.mac, patch);
                        }
                    }
                }
            }
        }).catch(() => {});

        // Détection d'anomalies de sécurité
        const newAlerts = sentinel.analyzeScan(results, currentEnv);

        // Analyse Evil Twin sur les réseaux voisins
        try {
            const channelAnalysis = await scanNeighborNetworks(currentEnv.wifi?.ssid, currentEnv.wifi?.bssid);
            if (channelAnalysis && channelAnalysis.evilTwinDetected) {
                const twin = channelAnalysis.evilTwinDetected;
                const alert = db.addAlert({
                    type: 'EVIL_TWIN_ATTACK',
                    title: 'DANGER : Point d\'accès pirate (Evil Twin) détecté !',
                    description: `Un faux réseau Wi-Fi portant le même nom «${twin.ssid}» a été détecté avec l'adresse MAC pirate ${twin.rogueBssid}. Ne vous y connectez sous aucun prétexte !`,
                    severity: 'critical',
                    metadata: twin
                });
                if (alert) newAlerts.push(alert);
            }
        } catch (_) {}

        // Envoi automatique aux Webhooks Entreprise (Slack, Discord, Teams, etc.)
        if (settings.webhookEnabled && settings.webhookUrl && newAlerts.length > 0) {
            for (const alert of newAlerts) {
                WebhookDispatcher.dispatch({
                    url: settings.webhookUrl,
                    type: settings.webhookType,
                    minSeverity: settings.webhookMinSeverity,
                    enabled: settings.webhookEnabled
                }, alert).catch(err => console.error('[MAIN] Webhook Dispatch Error:', err));
            }
        }

        // Notifications Windows
        if (settings.notifications && newAlerts.length > 0) {
            for (const alert of newAlerts) {
                if (alert.severity === 'critical' || alert.severity === 'warning') {
                    if (Notification.isSupported()) {
                        new Notification({
                            title: `Wifi-Watch : ${alert.title}`,
                            body: alert.description,
                            urgency: alert.severity === 'critical' ? 'critical' : 'normal'
                        }).show();
                    }
                }
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('alert:added', alert);
                }
            }
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('scan:complete', {
                devices: db.getDevices(),
                stats: db.getStats(),
                environment: currentEnv
            });
        }
    } catch (err) {
        console.error('[MAIN] Erreur durant le scan:', err);
    } finally {
        isScanning = false;
    }
}

// ─── Initialisation App ─────────────────────────────────────────────────────

app.whenReady().then(() => {
    const userDataPath = app.getPath('userData');
    const isFirstRun = !fs.existsSync(path.join(userDataPath, 'wifi_watch.db.json'));
    const cipher = safeStorage.isEncryptionAvailable() ? {
        encrypt: (text) => safeStorage.encryptString(text).toString('base64'),
        decrypt: (b64) => safeStorage.decryptString(Buffer.from(b64, 'base64'))
    } : null;
    db = new Database(userDataPath, cipher);
    if (isFirstRun) {
        // Première exécution : langue de l'interface alignée sur celle du système
        db.updateSettings({ language: app.getLocale().toLowerCase().startsWith('fr') ? 'fr' : 'en' });
    }
    if (DEMO) {
        // Historique de débit prérempli pour que le graphique ne démarre pas à vide
        for (let i = 60; i > 0; i--) {
            const sample = demo.bandwidthSample();
            sample.timestamp = new Date(Date.now() - i * 2000).toISOString();
            db.addBandwidthSample(sample);
        }
    }
    speedMonitor = new SpeedMonitor();
    sentinel = new Sentinel(db);
    if (DEMO) sentinel.getHour = () => 14; // démo : pas d'alerte « activité nocturne » selon l'heure réelle
    ruviewBridge = new RuViewBridge(() => mainWindow);

    createWindow();
    createSystemTray();

    // Vérification silencieuse d'une nouvelle version, 15 s après le démarrage
    setTimeout(async () => {
        if (db.getSettings().checkUpdates === false) return;
        try {
            const info = await checkForUpdate(app.getVersion());
            if (info.updateAvailable && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update:available', info);
        } catch (e) { /* hors ligne ou GitHub indisponible : nouvel essai au prochain lancement */ }
    }, 15000);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// ─── Handlers IPC ───────────────────────────────────────────────────────────

// Environnement réseau
ipcMain.handle('network:get-environment', async () => {
    if (!currentEnv) currentEnv = await getNetworkEnvironment();
    return currentEnv;
});

// Déclencheur de scan manuel
ipcMain.handle('network:start-scan', async () => {
    if (isScanning) return { scanning: true };
    executeScan();
    return { started: true };
});

// Speedtest Réel
ipcMain.handle('network:run-speedtest', async () => {
    if (isSpeedTesting) return { running: true };
    isSpeedTesting = true;

    try {
        const progressCb = (data) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('speedtest:progress', data);
            }
        };

        const result = await executeFullSpeedTest(progressCb);
        isSpeedTesting = false;
        return result;
    } catch (err) {
        isSpeedTesting = false;
        throw err;
    }
});

// Analyseur de réseaux Wi-Fi voisins & canaux
ipcMain.handle('network:scan-channels', async () => {
    try {
        const ssid = currentEnv?.wifi?.ssid || '';
        const bssid = currentEnv?.wifi?.bssid || '';
        return await scanNeighborNetworks(ssid, bssid);
    } catch (err) {
        console.error('[MAIN] Erreur scan canaux:', err);
        return { accessPoints: [], channelStats: { channels24: {}, channels5G: {}, recommendedChannel24: 1 } };
    }
});

// Wake-on-LAN
ipcMain.handle('network:wake-on-lan', async (_, mac) => {
    if (!V.isValidMac(mac)) throw new Error('Adresse MAC invalide');
    return await wakeDevice(mac);
});

// Audit de Sécurité & Rapport
ipcMain.handle('audit:get-score', () => {
    const devices = db.getDevices();
    const alerts = db.getAlerts();
    const wifiInfo = currentEnv?.wifi || {};
    return calculateSecurityScore(devices, alerts, wifiInfo);
});

ipcMain.handle('audit:generate-report', () => {
    const devices = db.getDevices();
    const alerts = db.getAlerts();
    const wifiInfo = currentEnv?.wifi || {};
    const stats = db.getStats();
    const securityAudit = calculateSecurityScore(devices, alerts, wifiInfo);

    return generateHtmlReport({
        env: currentEnv,
        devices,
        alerts,
        stats,
        securityAudit
    });
});

// Scan de ports
ipcMain.handle('network:scan-ports', async (_, ip) => {
    if (!V.isValidIpv4(ip)) return [];
    try {
        const ports = await scanDevicePorts(ip);
        const devices = db.getDevices();
        const target = devices.find(d => d.ip === ip);
        if (target) {
            db.updateDevice(target.mac, { openPorts: ports.map(p => p.port) });
        }
        return ports;
    } catch (err) {
        console.error('[MAIN] Erreur scan ports:', err);
        return [];
    }
});

// IoT Spy Hunter (Caméras & Micros Espions)
ipcMain.handle('spy:hunt', async () => {
    try {
        const devices = db.getDevices();
        const progressCb = (data) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('spy:progress', data);
            }
        };
        return await huntAllSpyDevices(devices, progressCb);
    } catch (err) {
        console.error('[MAIN] Erreur hunt spy:', err);
        return { scannedCount: 0, spyDevicesFound: 0, devices: [] };
    }
});

ipcMain.handle('spy:scan-device', async (_, device) => {
    try {
        if (!device) return null;
        return await scanDeviceForSurveillance(device);
    } catch (err) {
        console.error('[MAIN] Erreur scan surveillance appareil:', err);
        return null;
    }
});

// Timeline & Présence (Contrôle Parental & Historique)
ipcMain.handle('timeline:get-sessions', (_, mac, limit) => {
    return db.getSessions(mac, limit || 100);
});

ipcMain.handle('timeline:get-stats', (_, mac) => {
    return db.getTimelineStats(mac);
});

ipcMain.handle('timeline:clear-sessions', (_, mac) => {
    return db.clearSessions(mac);
});

// Bouclier & Quarantaine Réseau (Isolation Intrus)
ipcMain.handle('quarantine:isolate', async (_, ip, mac) => {
    try {
        if (!V.isValidIpv4(ip)) return { success: false, error: 'Adresse IP invalide' };
        const res = await isolateDevice(ip);
        if (mac) {
            db.updateDevice(mac, { isBlocked: true });
            db.addAlert({
                type: 'DEVICE_QUARANTINED',
                title: 'Équipement placé en quarantaine stricte',
                description: `L'adresse IP ${ip} a été isolée du réseau hôte via les règles de pare-feu Windows.`,
                severity: 'warning',
                deviceMac: mac,
                ip
            });
        }
        return res;
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('quarantine:unisolate', async (_, ip, mac) => {
    try {
        if (!V.isValidIpv4(ip)) return { success: false, error: 'Adresse IP invalide' };
        const res = await unisolateDevice(ip);
        if (mac) {
            db.updateDevice(mac, { isBlocked: false });
        }
        return res;
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('quarantine:status', async (_, ip) => {
    if (!V.isValidIpv4(ip)) return false;
    return await checkQuarantineStatus(ip);
});

// ─── RuView : Détection RF & DensePose Spatiale (ruvnet/RuView) ──────────────
ipcMain.handle('ruview:start', () => {
    if (ruviewBridge) {
        ruviewBridge.start();
        return ruviewBridge.getStatus();
    }
    return { isRunning: false };
});

ipcMain.handle('ruview:stop', () => {
    if (ruviewBridge) {
        ruviewBridge.stop();
        return ruviewBridge.getStatus();
    }
    return { isRunning: false };
});

ipcMain.handle('ruview:connect-node', (_, url) => {
    if (ruviewBridge && url && V.isValidWsUrl(url)) {
        ruviewBridge.connectHardware(url);
        return ruviewBridge.getStatus();
    }
    return { error: 'URL WebSocket invalide (ws:// ou wss:// requis)' };
});

ipcMain.handle('ruview:calibrate', () => {
    if (ruviewBridge) {
        ruviewBridge.calibrate();
        return { calibrating: true };
    }
    return { calibrating: false };
});

ipcMain.handle('ruview:set-activity', (_, act) => {
    if (ruviewBridge) {
        ruviewBridge.setActivity(act);
        return ruviewBridge.getStatus();
    }
    return {};
});

ipcMain.handle('ruview:get-status', () => {
    if (ruviewBridge) {
        return ruviewBridge.getStatus();
    }
    return { isRunning: false, mode: 'rusense' };
});

// Base de Données
ipcMain.handle('db:get-devices', () => db.getDevices());
ipcMain.handle('db:update-device', (_, mac, patch) => db.updateDevice(mac, patch));
ipcMain.handle('db:delete-device', (_, mac) => db.deleteDevice(mac));

ipcMain.handle('db:get-alerts', () => db.getAlerts());
ipcMain.handle('db:mark-alert-read', (_, id) => db.markAlertRead(id));
ipcMain.handle('db:mark-all-alerts-read', () => db.markAllAlertsRead());
ipcMain.handle('db:clear-alerts', () => db.clearAlerts());

ipcMain.handle('db:get-stats', () => db.getStats());
ipcMain.handle('db:get-bandwidth-history', () => db.getBandwidthHistory());
ipcMain.handle('db:get-settings', () => db.getSettings());
ipcMain.handle('db:update-settings', (_, patch) => {
    const updated = db.updateSettings(patch);
    if (patch && patch.language) updateTrayMenu();
    resetAutoScanTimer();
    return updated;
});

// ─── Mode démo ──────────────────────────────────────────────────────────────
ipcMain.handle('app:is-demo', () => DEMO);

ipcMain.handle('app:toggle-demo', () => {
    const args = process.argv.slice(1).filter(a => a !== '--demo');
    if (!DEMO) args.push('--demo');
    app.relaunch({ args });
    app.exit(0);
});

// ─── Mises à jour ───────────────────────────────────────────────────────────
ipcMain.handle('app:get-version', () => app.getVersion());

ipcMain.handle('app:check-update', async () => {
    try {
        return { success: true, ...(await checkForUpdate(app.getVersion())) };
    } catch (e) {
        return { success: false, current: app.getVersion(), message: e.message };
    }
});

// URL fixe côté processus principal : le renderer ne peut pas faire ouvrir une adresse arbitraire
ipcMain.handle('app:open-release-page', () => shell.openExternal(RELEASES_URL));

// ─── Enterprise & Exports IPC ───────────────────────────────────────────────
ipcMain.handle('export:devices-csv', () => {
    return ExportManager.exportDevicesCsv(db.getDevicesMap());
});

ipcMain.handle('export:devices-json', () => {
    return ExportManager.exportDevicesJson(db.getDevicesMap(), {
        network: currentEnv?.wifi?.ssid || '',
        gateway: currentEnv?.gatewayIp || ''
    });
});

ipcMain.handle('export:alerts-csv', () => {
    return ExportManager.exportAlertsCsv(db.getAlerts(500));
});

ipcMain.handle('file:save-export', async (_, defaultFilename, content) => {
    if (!mainWindow || typeof content !== 'string' || content.length > 50 * 1024 * 1024) return { success: false };
    defaultFilename = V.sanitizeExportFilename(defaultFilename);
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Enregistrer le fichier d\'export',
        defaultPath: defaultFilename,
        filters: [
            { name: 'Fichiers compatibles (*.csv, *.json, *.txt)', extensions: ['csv', 'json', 'txt'] },
            { name: 'Tous les fichiers', extensions: ['*'] }
        ]
    });

    if (canceled || !filePath) return { canceled: true };

    try {
        fs.writeFileSync(filePath, content, 'utf-8');
        return { success: true, filePath };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// DNS Guard & SLA
ipcMain.handle('dns:audit', async (_, customServers) => {
    try {
        return await DnsGuard.auditDns(customServers);
    } catch (err) {
        console.error('[MAIN] Erreur audit DNS:', err);
        return { status: 'ERROR', error: err.message, testedServers: [] };
    }
});

// Test Webhook
ipcMain.handle('webhook:test', async (_, config) => {
    try {
        return await WebhookDispatcher.test(config);
    } catch (err) {
        return { success: false, message: err.message };
    }
});

// ─── Modules Avancés Enterprise & Cyber ───────────────────────────────────────
ipcMain.handle('honeypot:status', () => {
    return Honeypot.getStatus();
});

ipcMain.handle('honeypot:toggle', async (_, enabled, port, autoBlock) => {
    try {
        if (port != null && (!V.isValidPort(Number(port)) || Number(port) < 1024)) {
            return { error: 'Port invalide (1024-65535)', isRunning: false };
        }
        if (enabled) {
            await Honeypot.start(Number(port) || 4455, !!autoBlock);
        } else {
            Honeypot.stop();
        }
        db.updateSettings({
            honeypotEnabled: !!enabled,
            honeypotPort: Number(port) || 4455,
            honeypotAutoBlock: !!autoBlock
        });
        return Honeypot.getStatus();
    } catch (err) {
        return { error: err.message, isRunning: false };
    }
});

ipcMain.handle('dhcp:audit', async () => {
    try {
        return await DhcpAuditor.audit();
    } catch (err) {
        return { status: 'ERROR', message: err.message };
    }
});

ipcMain.handle('spectrum:analyze', async () => {
    try {
        return await SpectrumAnalyzer.analyze();
    } catch (err) {
        return SpectrumAnalyzer.getFallbackData(err.message);
    }
});

ipcMain.handle('benchmark:run', async (_, targetHost) => {
    try {
        const host = targetHost || currentEnv?.gatewayIp || '1.1.1.1';
        if (!V.isValidHost(host)) return { grade: 'F', rating: 'Hôte invalide', error: 'Hôte invalide' };
        return await SpeedBenchmark.runBenchmark(host);
    } catch (err) {
        return { grade: 'F', rating: 'Échec du benchmark', error: err.message };
    }
});

ipcMain.handle('zeroconf:discover', async () => {
    try {
        const discovered = await ZeroConfDiscovery.discoverDevices(2500);
        return Array.from(discovered.entries()).map(([ip, data]) => ({ ip, ...data }));
    } catch (err) {
        return [];
    }
});

ipcMain.handle('device:scan-ports', async (_, ip, mac, customPorts) => {
    if (!V.isValidIpv4(ip)) return [];
    if (customPorts != null && !(Array.isArray(customPorts) && customPorts.length <= 100 && customPorts.every(V.isValidPort))) return [];
    try {
        const ports = await PortScanner.scanHost(ip, customPorts);
        if (mac) {
            db.setDevicePorts(mac, ports);
        }
        return ports;
    } catch (err) {
        console.error('[MAIN] Erreur port scan:', err);
        return [];
    }
});

// Contrôles de fenêtre
ipcMain.on('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
});
ipcMain.on('window:maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) mainWindow.unmaximize();
        else mainWindow.maximize();
    }
});
ipcMain.on('window:close', () => {
    const settings = db?.getSettings() || {};
    if (settings.minimizeToTray) {
        if (mainWindow) mainWindow.hide();
    } else {
        if (mainWindow) mainWindow.close();
    }
});

// Threat Intelligence & Public APIs
ipcMain.handle('threat:get-wan', async () => {
    return await ThreatIntelligenceApis.getPublicIpAndIsp();
});

ipcMain.handle('threat:audit-wan', async (_, ip) => {
    if (ip != null && !V.isValidIpv4(ip)) return { error: 'IP invalide' };
    return await ThreatIntelligenceApis.auditWanWithShodan(ip);
});

ipcMain.handle('threat:check-ip', async (_, ip, apiKey) => {
    if (!V.isValidIpv4(ip) || (apiKey != null && typeof apiKey !== 'string')) return { error: 'Paramètres invalides' };
    return await ThreatIntelligenceApis.checkIpReputationAbuse(ip, apiKey || db.getSettings().abuseIpdbKey || '');
});

ipcMain.handle('threat:check-c2', async (_, indicator) => {
    return await ThreatIntelligenceApis.checkThreatFox(indicator);
});

ipcMain.handle('threat:lookup-mac', async (_, mac) => {
    return await ThreatIntelligenceApis.lookupMacOnline(mac);
});

ipcMain.handle('window:toggle-fullscreen', () => {
    if (mainWindow) {
        const isFS = mainWindow.isFullScreen();
        mainWindow.setFullScreen(!isFS);
        return !isFS;
    }
    return false;
});

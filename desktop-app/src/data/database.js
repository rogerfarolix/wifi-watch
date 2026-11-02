/**
 * Wifi-Watch - Local Embedded Database
 * Stockage atomique et persistant sous forme JSON avec reprise sur incident.
 */

const fs = require('fs');
const path = require('path');

/** Catégorie d'inventaire par défaut déduite du type d'appareil détecté. */
function defaultCategory(deviceType) {
    switch (deviceType) {
        case 'router': return 'network';
        case 'phone': return 'mobile';
        case 'iot': case 'camera': case 'tv': return 'iot';
        case 'printer': return 'printer';
        case 'server': case 'nas': return 'server';
        default: return 'workstation';
    }
}

const SECRET_FIELDS = ['webhookUrl', 'abuseIpdbKey'];
const ENC_PREFIX = 'enc:v1:';

class Database {
    /**
     * @param {string} storageDir
     * @param {{encrypt:(s:string)=>string, decrypt:(s:string)=>string}|null} cipher
     *        Chiffrement des secrets au repos (safeStorage d'Electron : DPAPI sous Windows).
     */
    constructor(storageDir, cipher = null) {
        this.cipher = cipher;
        this.dir = storageDir || path.join(__dirname, '..', '..', 'data');
        this.filePath = path.join(this.dir, 'wifi_watch.db.json');
        this.tempPath = path.join(this.dir, 'wifi_watch.db.tmp');

        this.data = {
            meta: {
                version: '2.0.0',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            settings: {
                scanInterval: 30, // secondes
                notifications: true,
                soundAlerts: true,
                voiceSentinelEnabled: true,
                autoScan: true,
                subnet: 'auto',
                customSubnets: '', // e.g. '192.168.1.0/24, 10.0.0.0/24'
                language: 'fr', // 'fr' ou 'en'
                theme: 'cyber', // 'cyber' ou 'corporate'
                webhookEnabled: false,
                webhookUrl: '',
                abuseIpdbKey: '', // clé API AbuseIPDB (optionnelle)
                webhookType: 'slack', // 'slack', 'discord', 'teams', 'generic'
                webhookMinSeverity: 'warning', // 'info', 'warning', 'critical'
                honeypotEnabled: false,
                honeypotPort: 4455,
                honeypotAutoBlock: false,
                watchdogEnabled: true
            },
            devices: {}, // indexé par MAC
            alerts: [],
            bandwidthHistory: [],
            sessions: [] // sessions de connexion (timeline de présence)
        };

        this.init();
    }

    init() {
        if (!fs.existsSync(this.dir)) {
            fs.mkdirSync(this.dir, { recursive: true });
        }

        if (fs.existsSync(this.filePath)) {
            try {
                const raw = fs.readFileSync(this.filePath, 'utf-8');
                const parsed = JSON.parse(raw);
                this.data = {
                    ...this.data,
                    ...parsed,
                    settings: { ...this.data.settings, ...(parsed.settings || {}) },
                    devices: parsed.devices || {},
                    alerts: parsed.alerts || [],
                    bandwidthHistory: parsed.bandwidthHistory || [],
                    sessions: parsed.sessions || []
                };
                this.decryptSecrets(this.data.settings);
            } catch (err) {
                console.error('[DATABASE] Erreur lecture DB, réinitialisation de secours:', err);
                this.save();
            }
        } else {
            this.save();
        }
    }

    encryptSecrets(settings) {
        if (!this.cipher) return settings;
        for (const f of SECRET_FIELDS) {
            if (settings[f] && !String(settings[f]).startsWith(ENC_PREFIX)) {
                try { settings[f] = ENC_PREFIX + this.cipher.encrypt(String(settings[f])); } catch (_) { /* conserve la valeur */ }
            }
        }
        return settings;
    }

    decryptSecrets(settings) {
        for (const f of SECRET_FIELDS) {
            const v = settings[f];
            if (typeof v === 'string' && v.startsWith(ENC_PREFIX)) {
                try { settings[f] = this.cipher ? this.cipher.decrypt(v.slice(ENC_PREFIX.length)) : ''; } catch (_) { settings[f] = ''; }
            }
        }
    }

    save() {
        try {
            this.data.meta.updatedAt = new Date().toISOString();
            const toWrite = { ...this.data, settings: this.encryptSecrets({ ...this.data.settings }) };
            const json = JSON.stringify(toWrite, null, 2);
            fs.writeFileSync(this.tempPath, json, 'utf-8');
            fs.renameSync(this.tempPath, this.filePath);
        } catch (err) {
            console.error('[DATABASE] Échec de sauvegarde atomique:', err);
        }
    }

    // ─── Appareils (Devices) ────────────────────────────────────────────────

    getDevices() {
        return Object.values(this.data.devices).sort((a, b) => {
            if (a.isOnline === b.isOnline) {
                return new Date(b.lastSeen) - new Date(a.lastSeen);
            }
            return a.isOnline ? -1 : 1;
        });
    }

    getDevicesMap() {
        return this.data.devices || {};
    }

    getDevice(mac) {
        if (!mac) return null;
        return this.data.devices[mac.toUpperCase()] || null;
    }

    upsertDevice(deviceData) {
        if (!deviceData || !deviceData.mac) return null;
        const mac = deviceData.mac.toUpperCase();
        const existing = this.data.devices[mac] || null;
        const now = new Date().toISOString();

        if (!existing) {
            this.data.devices[mac] = {
                mac,
                ip: deviceData.ip || '0.0.0.0',
                hostname: deviceData.hostname || '',
                customName: deviceData.customName || '',
                vendor: deviceData.vendor || 'Inconnu',
                deviceType: deviceData.deviceType || 'unknown',
                category: deviceData.category || defaultCategory(deviceData.deviceType),
                owner: deviceData.owner || '',
                department: deviceData.department || '',
                location: deviceData.location || '',
                authorized: deviceData.isTrusted || false,
                isCritical: deviceData.isCritical || false,
                model: deviceData.model || '',
                notes: '',
                isTrusted: deviceData.isTrusted ?? false,
                isBlocked: false,
                isOnline: true,
                latencyMs: deviceData.latencyMs || null,
                firstSeen: now,
                lastSeen: now,
                openPorts: deviceData.openPorts || []
            };
        } else {
            this.data.devices[mac] = {
                ...existing,
                ip: deviceData.ip || existing.ip,
                hostname: deviceData.hostname || existing.hostname,
                vendor: (existing.vendor && existing.vendor !== 'Inconnu') ? existing.vendor : (deviceData.vendor || existing.vendor),
                model: existing.model || deviceData.model || '',
                deviceType: (existing.deviceType && existing.deviceType !== 'unknown') ? existing.deviceType : (deviceData.deviceType || existing.deviceType),
                category: existing.category || defaultCategory(deviceData.deviceType),
                owner: existing.owner || '',
                department: existing.department || '',
                location: existing.location || '',
                authorized: existing.authorized ?? (existing.isTrusted || false),
                isCritical: existing.isCritical ?? false,
                isOnline: deviceData.isOnline ?? true,
                latencyMs: deviceData.latencyMs !== undefined ? deviceData.latencyMs : existing.latencyMs,
                openPorts: existing.openPorts || [],
                lastSeen: now
            };
        }

        this.save();
        return this.data.devices[mac];
    }

    setDevicePorts(mac, ports) {
        if (!mac) return null;
        const upper = mac.toUpperCase();
        if (!this.data.devices[upper]) return null;

        this.data.devices[upper].openPorts = Array.isArray(ports) ? ports : [];
        this.save();
        return this.data.devices[upper];
    }

    getCriticalDevices() {
        return Object.values(this.data.devices).filter(d => d.isCritical);
    }

    updateDevice(mac, patch) {
        if (!mac) return null;
        const upper = mac.toUpperCase();
        if (!this.data.devices[upper]) return null;

        this.data.devices[upper] = {
            ...this.data.devices[upper],
            ...patch,
            mac: upper // toujours conserver la clé
        };

        this.save();
        return this.data.devices[upper];
    }

    markAllOfflineExcept(onlineMacs) {
        const set = new Set((onlineMacs || []).map(m => m.toUpperCase()));
        let changed = false;

        for (const [mac, dev] of Object.entries(this.data.devices)) {
            if (!set.has(mac)) {
                if (dev.isOnline) {
                    dev.isOnline = false;
                    changed = true;
                }
            } else {
                if (!dev.isOnline) {
                    dev.isOnline = true;
                    changed = true;
                }
            }
        }

        if (changed) this.save();
    }

    deleteDevice(mac) {
        if (!mac) return false;
        const upper = mac.toUpperCase();
        if (this.data.devices[upper]) {
            delete this.data.devices[upper];
            this.save();
            return true;
        }
        return false;
    }

    // ─── Alertes (Alerts) ───────────────────────────────────────────────────

    getAlerts(limit = 100) {
        return this.data.alerts.slice(-limit).reverse();
    }

    addAlert(alertData) {
        const id = 'alt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const now = new Date();

        // Déduplication : si une alerte du même type sur la même MAC/IP existe depuis moins de 5 min
        const duplicate = this.data.alerts.find(a =>
            a.type === alertData.type &&
            a.deviceMac === alertData.deviceMac &&
            (now - new Date(a.timestamp)) < 5 * 60 * 1000
        );

        if (duplicate) return duplicate;

        const alert = {
            id,
            type: alertData.type || 'INFO',
            title: alertData.title || 'Notification réseau',
            description: alertData.description || '',
            severity: alertData.severity || 'info', // 'critical' | 'warning' | 'info'
            deviceMac: alertData.deviceMac ? alertData.deviceMac.toUpperCase() : null,
            ip: alertData.ip || null,
            timestamp: now.toISOString(),
            isRead: false,
            metadata: alertData.metadata || {}
        };

        this.data.alerts.push(alert);

        // Garder maximum 500 alertes en historique
        if (this.data.alerts.length > 500) {
            this.data.alerts = this.data.alerts.slice(-500);
        }

        this.save();
        return alert;
    }

    markAlertRead(id) {
        const alert = this.data.alerts.find(a => a.id === id);
        if (alert) {
            alert.isRead = true;
            this.save();
            return true;
        }
        return false;
    }

    markAllAlertsRead() {
        this.data.alerts.forEach(a => a.isRead = true);
        this.save();
        return true;
    }

    clearAlerts() {
        this.data.alerts = [];
        this.save();
        return true;
    }

    // ─── Historique Débit & Latence ─────────────────────────────────────────

    addBandwidthSample(sample) {
        const entry = {
            timestamp: new Date().toISOString(),
            rxMbps: Number(sample.rxMbps || 0),
            txMbps: Number(sample.txMbps || 0),
            pingGatewayMs: sample.pingGatewayMs !== undefined ? Number(sample.pingGatewayMs) : null,
            pingInternetMs: sample.pingInternetMs !== undefined ? Number(sample.pingInternetMs) : null
        };

        this.data.bandwidthHistory.push(entry);

        // Garder les 120 derniers échantillons (ex: 120 x 2 sec = 4 minutes de graphe fluide)
        if (this.data.bandwidthHistory.length > 120) {
            this.data.bandwidthHistory = this.data.bandwidthHistory.slice(-120);
        }

        this.save();
        return entry;
    }

    getBandwidthHistory() {
        return this.data.bandwidthHistory;
    }

    // ─── Paramètres (Settings) ──────────────────────────────────────────────

    getSettings() {
        return { ...this.data.settings };
    }

    updateSettings(patch) {
        this.data.settings = {
            ...this.data.settings,
            ...patch
        };
        this.save();
        return this.data.settings;
    }

    // ─── Statistiques globales ──────────────────────────────────────────────

    getStats() {
        const devices = Object.values(this.data.devices);
        const onlineCount = devices.filter(d => d.isOnline).length;
        const trustedCount = devices.filter(d => d.isTrusted).length;
        const blockedCount = devices.filter(d => d.isBlocked).length;
        const unknownCount = devices.filter(d => !d.isTrusted && !d.isBlocked).length;
        const unreadAlerts = this.data.alerts.filter(a => !a.isRead).length;
        const criticalAlerts = this.data.alerts.filter(a => a.severity === 'critical' && !a.isRead).length;

        return {
            totalDevices: devices.length,
            onlineDevices: onlineCount,
            offlineDevices: devices.length - onlineCount,
            trustedDevices: trustedCount,
            blockedDevices: blockedCount,
            unknownDevices: unknownCount,
            unreadAlerts,
            criticalAlerts
        };
    }

    // ─── Timeline & Présence (Contrôle Parental / Horaires) ─────────────────

    recordPresence(onlineDevices = []) {
        const now = new Date();
        const nowIso = now.toISOString();
        const onlineMacMap = new Map();

        onlineDevices.forEach(d => {
            if (d && d.mac) {
                onlineMacMap.set(d.mac.toUpperCase(), d);
            }
        });

        // 1. Mettre à jour ou démarrer les sessions des appareils en ligne
        onlineMacMap.forEach((dev, mac) => {
            let activeSession = this.data.sessions.find(s => s.mac === mac && !s.endedAt);

            if (!activeSession) {
                // Nouvelle session
                activeSession = {
                    id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                    mac,
                    ip: dev.ip || '',
                    hostname: dev.customName || dev.hostname || 'Appareil',
                    vendor: dev.vendor || 'Inconnu',
                    startedAt: nowIso,
                    lastSeenAt: nowIso,
                    endedAt: null,
                    durationMinutes: 1,
                    isNightSession: (now.getHours() >= 23 || now.getHours() < 6)
                };
                this.data.sessions.push(activeSession);
            } else {
                // Session active prolongée
                activeSession.lastSeenAt = nowIso;
                activeSession.ip = dev.ip || activeSession.ip;
                const startMs = new Date(activeSession.startedAt).getTime();
                activeSession.durationMinutes = Math.max(1, Math.round((now.getTime() - startMs) / 60000));
            }
        });

        // 2. Clôturer les sessions des appareils qui viennent de se déconnecter
        this.data.sessions.forEach(s => {
            if (!s.endedAt && !onlineMacMap.has(s.mac)) {
                s.endedAt = nowIso;
                const startMs = new Date(s.startedAt).getTime();
                s.durationMinutes = Math.max(1, Math.round((now.getTime() - startMs) / 60000));
            }
        });

        // Conserver les 600 dernières sessions au maximum
        if (this.data.sessions.length > 600) {
            this.data.sessions = this.data.sessions.slice(-600);
        }

        this.save();
    }

    getSessions(mac = null, limit = 100) {
        let list = this.data.sessions || [];
        if (mac) {
            const upper = mac.toUpperCase();
            list = list.filter(s => s.mac === upper);
        }
        return list.slice(-limit).reverse();
    }

    getTimelineStats(mac = null) {
        const list = this.getSessions(mac, 300);
        const todayStr = new Date().toISOString().slice(0, 10);

        const todaySessions = list.filter(s => (s.startedAt || '').startsWith(todayStr));
        const totalMinutesToday = todaySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
        const nightActivityCount = todaySessions.filter(s => s.isNightSession).length;

        return {
            totalSessionsToday: todaySessions.length,
            totalHoursToday: (totalMinutesToday / 60).toFixed(1),
            totalMinutesToday,
            hasNightActivity: nightActivityCount > 0,
            activeNowCount: (this.data.sessions || []).filter(s => !s.endedAt).length
        };
    }

    clearSessions(mac = null) {
        if (mac) {
            const upper = mac.toUpperCase();
            this.data.sessions = (this.data.sessions || []).filter(s => s.mac !== upper);
        } else {
            this.data.sessions = [];
        }
        this.save();
        return true;
    }
}

module.exports = Database;

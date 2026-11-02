const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Environnement & Réseau
    getEnvironment: () => ipcRenderer.invoke('network:get-environment'),
    startScan: () => ipcRenderer.invoke('network:start-scan'),
    scanPorts: (ip) => ipcRenderer.invoke('network:scan-ports', ip),

    // Nouvelles Fonctionnalités
    runSpeedTest: () => ipcRenderer.invoke('network:run-speedtest'),
    scanChannels: () => ipcRenderer.invoke('network:scan-channels'),
    wakeOnLan: (mac) => ipcRenderer.invoke('network:wake-on-lan', mac),
    getSecurityScore: () => ipcRenderer.invoke('audit:get-score'),
    generateAuditReport: () => ipcRenderer.invoke('audit:generate-report'),

    // Enterprise & Exports
    exportDevicesCsv: () => ipcRenderer.invoke('export:devices-csv'),
    exportDevicesJson: () => ipcRenderer.invoke('export:devices-json'),
    exportAlertsCsv: () => ipcRenderer.invoke('export:alerts-csv'),
    saveExportFile: (defaultFilename, content) => ipcRenderer.invoke('file:save-export', defaultFilename, content),
    auditDns: (customServers) => ipcRenderer.invoke('dns:audit', customServers),
    testWebhook: (config) => ipcRenderer.invoke('webhook:test', config),

    // Mises à jour
    getAppVersion: () => ipcRenderer.invoke('app:get-version'),
    checkUpdate: () => ipcRenderer.invoke('app:check-update'),
    openReleasePage: () => ipcRenderer.invoke('app:open-release-page'),
    onUpdateAvailable: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('update:available', handler);
        return () => ipcRenderer.removeListener('update:available', handler);
    },

    // Nouveaux Modules Cyber & Enterprise
    getHoneypotStatus: () => ipcRenderer.invoke('honeypot:status'),
    toggleHoneypot: (enabled, port, autoBlock) => ipcRenderer.invoke('honeypot:toggle', enabled, port, autoBlock),
    auditDhcp: () => ipcRenderer.invoke('dhcp:audit'),
    analyzeSpectrum: () => ipcRenderer.invoke('spectrum:analyze'),
    runBenchmark: (targetHost) => ipcRenderer.invoke('benchmark:run', targetHost),
    discoverZeroConf: () => ipcRenderer.invoke('zeroconf:discover'),
    scanDevicePortsDetailed: (ip, mac, customPorts) => ipcRenderer.invoke('device:scan-ports', ip, mac, customPorts),

    // IoT Spy Hunter
    huntSpyDevices: () => ipcRenderer.invoke('spy:hunt'),
    scanDeviceSpy: (device) => ipcRenderer.invoke('spy:scan-device', device),

    // Timeline & Présence (Contrôle Parental)
    getDeviceSessions: (mac, limit) => ipcRenderer.invoke('timeline:get-sessions', mac, limit),
    getTimelineStats: (mac) => ipcRenderer.invoke('timeline:get-stats', mac),
    clearSessions: (mac) => ipcRenderer.invoke('timeline:clear-sessions', mac),

    // Bouclier & Quarantaine Réseau (Isolation)
    isolateDevice: (ip, mac) => ipcRenderer.invoke('quarantine:isolate', ip, mac),
    unisolateDevice: (ip, mac) => ipcRenderer.invoke('quarantine:unisolate', ip, mac),
    checkQuarantineStatus: (ip) => ipcRenderer.invoke('quarantine:status', ip),

    // RuView (Spatial Sensing & WiFi DensePose - ruvnet/RuView)
    startRuView: () => ipcRenderer.invoke('ruview:start'),
    stopRuView: () => ipcRenderer.invoke('ruview:stop'),
    connectRuViewNode: (url) => ipcRenderer.invoke('ruview:connect-node', url),
    calibrateRuView: () => ipcRenderer.invoke('ruview:calibrate'),
    setRuViewActivity: (act) => ipcRenderer.invoke('ruview:set-activity', act),
    getRuViewStatus: () => ipcRenderer.invoke('ruview:get-status'),

    // Base de données : Appareils
    getDevices: () => ipcRenderer.invoke('db:get-devices'),
    updateDevice: (mac, patch) => ipcRenderer.invoke('db:update-device', mac, patch),
    deleteDevice: (mac) => ipcRenderer.invoke('db:delete-device', mac),

    // Base de données : Alertes
    getAlerts: () => ipcRenderer.invoke('db:get-alerts'),
    markAlertRead: (id) => ipcRenderer.invoke('db:mark-alert-read', id),
    markAllAlertsRead: () => ipcRenderer.invoke('db:mark-all-alerts-read'),
    clearAlerts: () => ipcRenderer.invoke('db:clear-alerts'),

    // Historique & Stats
    getStats: () => ipcRenderer.invoke('db:get-stats'),
    getBandwidthHistory: () => ipcRenderer.invoke('db:get-bandwidth-history'),
    getSettings: () => ipcRenderer.invoke('db:get-settings'),
    updateSettings: (patch) => ipcRenderer.invoke('db:update-settings', patch),

    // Événements temps réel
    onScanProgress: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('scan:progress', handler);
        return () => ipcRenderer.removeListener('scan:progress', handler);
    },
    onScanComplete: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('scan:complete', handler);
        return () => ipcRenderer.removeListener('scan:complete', handler);
    },
    onBandwidthUpdate: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('bandwidth:update', handler);
        return () => ipcRenderer.removeListener('bandwidth:update', handler);
    },
    onAlertAdded: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('alert:added', handler);
        return () => ipcRenderer.removeListener('alert:added', handler);
    },
    onSpeedTestProgress: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('speedtest:progress', handler);
        return () => ipcRenderer.removeListener('speedtest:progress', handler);
    },
    onSpyProgress: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('spy:progress', handler);
        return () => ipcRenderer.removeListener('spy:progress', handler);
    },
    onRuViewTelemetry: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('ruview:telemetry', handler);
        return () => ipcRenderer.removeListener('ruview:telemetry', handler);
    },
    onRuViewStatus: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('ruview:status', handler);
        return () => ipcRenderer.removeListener('ruview:status', handler);
    },
    onRuViewNodeDiscovered: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('ruview:node-discovered', handler);
        return () => ipcRenderer.removeListener('ruview:node-discovered', handler);
    },
    onCanaryProbe: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('canary:probe', handler);
        return () => ipcRenderer.removeListener('canary:probe', handler);
    },

    // Threat Intelligence & Public APIs (Shodan, IP-API, AbuseIPDB, ThreatFox, MACVendors)
    getWanInfo: () => ipcRenderer.invoke('threat:get-wan'),
    auditWanShodan: (ip) => ipcRenderer.invoke('threat:audit-wan', ip),
    checkIpReputation: (ip, apiKey) => ipcRenderer.invoke('threat:check-ip', ip, apiKey),
    checkThreatC2: (indicator) => ipcRenderer.invoke('threat:check-c2', indicator),
    lookupMacOnline: (mac) => ipcRenderer.invoke('threat:lookup-mac', mac),
    toggleFullScreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),

    // Contrôles de fenêtre
    minimizeWindow: () => ipcRenderer.send('window:minimize'),
    maximizeWindow: () => ipcRenderer.send('window:maximize'),
    closeWindow: () => ipcRenderer.send('window:close')
});

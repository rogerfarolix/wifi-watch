/**
 * Wifi-Watch - Security Sentinel
 * Détecte les anomalies, nouveaux appareils, intrusions et risques d'usurpation.
 */

class Sentinel {
    constructor(db) {
        this.db = db;
        this.lastGatewayMac = null;
    }

    /**
     * Analyse les résultats d'un scan pour lever des alertes de sécurité
     */
    analyzeScan(scannedDevices, networkEnv) {
        const generatedAlerts = [];
        const existingDevices = this.db.getDevices();
        const existingMap = new Map(existingDevices.map(d => [d.mac.toUpperCase(), d]));
        const gatewayIp = networkEnv.gatewayIp;

        for (const dev of scannedDevices) {
            const mac = dev.mac.toUpperCase();
            const existing = existingMap.get(mac);

            // 1. Détection de nouvel équipement non répertorié
            if (!existing) {
                // S'il ne s'agit pas de la passerelle ou du PC local
                if (!dev.isTrusted) {
                    const alert = this.db.addAlert({
                        type: 'NEW_DEVICE',
                        title: 'Nouvel appareil détecté sur le Wi-Fi',
                        description: `Un appareil inconnu (${dev.vendor || 'Inconnu'}) a rejoint le réseau avec l'IP ${dev.ip} et la MAC ${mac}.`,
                        severity: 'warning',
                        deviceMac: mac,
                        ip: dev.ip,
                        metadata: { vendor: dev.vendor, hostname: dev.hostname, deviceType: dev.deviceType }
                    });
                    if (alert) generatedAlerts.push(alert);
                }
            } else {
                // 2. Détection d'un appareil explicitement bloqué
                if (existing.isBlocked) {
                    const alert = this.db.addAlert({
                        type: 'BLOCKED_DEVICE_SEEN',
                        title: 'Appareil bloqué actif sur le réseau !',
                        description: `Attention : L'appareil bloqué «${existing.customName || existing.hostname || mac}» (${dev.ip}) est actuellement en ligne.`,
                        severity: 'critical',
                        deviceMac: mac,
                        ip: dev.ip,
                        metadata: { mac, ip: dev.ip }
                    });
                    if (alert) generatedAlerts.push(alert);
                }
            }

            // 3. Détection ARP Spoofing sur la passerelle
            if (dev.ip === gatewayIp) {
                if (this.lastGatewayMac && this.lastGatewayMac !== mac) {
                    const alert = this.db.addAlert({
                        type: 'ARP_SPOOF_RISK',
                        title: 'Risque d\'usurpation ARP (Passerelle modifiée)',
                        description: `L'adresse MAC de la box internet a changé de ${this.lastGatewayMac} à ${mac}. Risque d'attaque de type Man-in-the-Middle.`,
                        severity: 'critical',
                        deviceMac: mac,
                        ip: dev.ip,
                        metadata: { oldMac: this.lastGatewayMac, newMac: mac }
                    });
                    if (alert) generatedAlerts.push(alert);
                }
                this.lastGatewayMac = mac;
            }
        }

        // 4. Activité nocturne sur appareil inconnu
        const hour = new Date().getHours();
        if (hour >= 0 && hour < 5) {
            for (const dev of scannedDevices) {
                const existing = existingMap.get(dev.mac.toUpperCase());
                if (existing && !existing.isTrusted && !existing.isBlocked) {
                    const alert = this.db.addAlert({
                        type: 'NIGHT_ACTIVITY',
                        title: 'Activité Wi-Fi nocturne détectée',
                        description: `L'appareil non certifié «${existing.customName || dev.hostname || dev.mac}» (${dev.ip}) est actif en pleine nuit (${hour}h).`,
                        severity: 'info',
                        deviceMac: dev.mac,
                        ip: dev.ip,
                        metadata: { hour }
                    });
                    if (alert) generatedAlerts.push(alert);
                }
            }
        }

        return generatedAlerts;
    }
}

module.exports = Sentinel;

/**
 * Wifi-Watch — Enterprise Export Manager
 * Génère des exports d'inventaire réseau conformes aux standards d'entreprise
 * (CSV compatible Excel/CMDB, JSON structuré pour SIEM/ITSM).
 */

class ExportManager {
    /**
     * Génère un CSV complet de l'inventaire des équipements
     * @param {Object} devicesMap - Dictionnaire des appareils indexé par MAC
     * @returns {string} - Contenu CSV avec BOM UTF-8
     */
    static exportDevicesCsv(devicesMap) {
        const devices = Object.values(devicesMap || {});
        
        const headers = [
            'Adresse IP',
            'Adresse MAC',
            'Nom d\'Hôte (DNS/NetBIOS)',
            'Alias / Nom Entreprise',
            'Catégorie / Tag',
            'Responsable / Utilisateur',
            'Département / Service',
            'Constructeur (OUI)',
            'Statut Réseau',
            'Statut Autorisation',
            'En Quarantaine (Bloqué)',
            'Première Connexion',
            'Dernière Détection',
            'Ports Ouverts',
            'Score Sécurité (100)'
        ];

        const escapeCsv = (str) => {
            if (str === null || str === undefined) return '""';
            const s = String(str).replace(/"/g, '""');
            return `"${s}"`;
        };

        const rows = [headers.map(h => `"${h}"`).join(';')];

        for (const dev of devices) {
            const portsStr = Array.isArray(dev.openPorts) ? dev.openPorts.join(', ') : '';
            const row = [
                escapeCsv(dev.ip || ''),
                escapeCsv(dev.mac || ''),
                escapeCsv(dev.hostname || dev.netbiosName || ''),
                escapeCsv(dev.customName || ''),
                escapeCsv(dev.category || dev.tag || 'Non Classé'),
                escapeCsv(dev.owner || ''),
                escapeCsv(dev.department || ''),
                escapeCsv(dev.vendor || 'Inconnu'),
                escapeCsv(dev.status === 'online' ? 'En ligne' : 'Hors ligne'),
                escapeCsv(dev.authorized ? 'Autorisé' : 'Non validé'),
                escapeCsv(dev.quarantined ? 'OUI (ISOLÉ)' : 'Non'),
                escapeCsv(dev.firstSeen ? new Date(dev.firstSeen).toLocaleString('fr-FR') : ''),
                escapeCsv(dev.lastSeen ? new Date(dev.lastSeen).toLocaleString('fr-FR') : ''),
                escapeCsv(portsStr),
                escapeCsv(dev.securityScore ?? 100)
            ];
            rows.push(row.join(';'));
        }

        // Ajout du BOM UTF-8 (\uFEFF) pour ouverture directe et parfaite dans Microsoft Excel
        return '\uFEFF' + rows.join('\r\n');
    }

    /**
     * Génère un export JSON complet pour intégration SIEM/CMDB
     */
    static exportDevicesJson(devicesMap, metadata = {}) {
        return JSON.stringify({
            generator: 'Wifi-Watch Enterprise Sentinel v2.0',
            exportedAt: new Date().toISOString(),
            metadata,
            count: Object.keys(devicesMap || {}).length,
            devices: Object.values(devicesMap || {})
        }, null, 2);
    }

    /**
     * Génère un CSV de l'historique des alertes
     */
    static exportAlertsCsv(alertsList) {
        const headers = [
            'ID Alerte',
            'Date & Heure',
            'Niveau de Sévérité',
            'Type d\'Anomalie',
            'Titre',
            'Description',
            'Statut Lu'
        ];

        const escapeCsv = (str) => {
            if (str === null || str === undefined) return '""';
            const s = String(str).replace(/"/g, '""');
            return `"${s}"`;
        };

        const rows = [headers.map(h => `"${h}"`).join(';')];

        for (const alert of (alertsList || [])) {
            const row = [
                escapeCsv(alert.id || ''),
                escapeCsv(alert.timestamp ? new Date(alert.timestamp).toLocaleString('fr-FR') : ''),
                escapeCsv((alert.severity || 'info').toUpperCase()),
                escapeCsv(alert.type || ''),
                escapeCsv(alert.title || ''),
                escapeCsv(alert.description || ''),
                escapeCsv(alert.read ? 'Oui' : 'Non')
            ];
            rows.push(row.join(';'));
        }

        return '\uFEFF' + rows.join('\r\n');
    }
}

module.exports = ExportManager;

/**
 * Wifi-Watch — Internationalization (i18n) Engine
 * Dictionnaire bilingue Français / Anglais pour adoption internationale et entreprise.
 */

const translations = {
    fr: {
        // Navigation
        'nav.dashboard': 'Tableau de Bord',
        'nav.radar': 'Radar Spatial',
        'nav.devices': 'Inventaire Actifs',
        'nav.security': 'Bouclier Réseau',
        'nav.speedtest': 'Test Débit SLA',
        'nav.channels': 'Canaux & Voisins',
        'nav.audit': 'Audit & NIS2',
        'nav.dnsguard': 'DNS Guard & SLA',
        'nav.honeypot': 'Canari Cyber & Trap',
        'nav.timeline': 'Présence & Sessions',
        'nav.spyhunter': 'Chasseur IoT / Espion',
        'nav.guest': 'Wi-Fi Invité & Badge',
        'nav.ruview': 'RuView RF Sensing',
        'nav.settings': 'Paramètres',

        // Statuts & boutons
        'btn.scan': 'Scanner le Réseau',
        'btn.scanning': 'Analyse en cours...',
        'btn.export_csv': 'Exporter CSV',
        'btn.export_json': 'Exporter JSON',
        'btn.print_audit': 'Imprimer / Exporter PDF',
        'btn.save': 'Enregistrer',
        'btn.cancel': 'Annuler',
        'btn.test_webhook': 'Tester Webhook',
        'btn.quarantine': 'Isoler (Pare-feu)',
        'btn.unquarantine': 'Débloquer',
        'btn.approve': 'Approuver',
        'btn.view_details': 'Détails & Fiche',

        // Honeypot
        'honeypot.title': 'Canari Réseau // Piège Anti-Ransomware & Mouvement Latéral',
        'honeypot.subtitle': 'Écoute silencieuse sur port leurre pour capturer les vers et scans hostiles en 0,1s.',
        'honeypot.port': 'Port Leurre',
        'honeypot.autoblock': 'Quarantaine automatique pare-feu Windows',
        'honeypot.simulate': 'Tester le Piège (Simulation)',

        // Topologie & DHCP & Benchmark
        'topology.title': 'Topologie Interactive & Arborescence Réseau',
        'dhcp.title': 'Audit des Serveurs DHCP & Détection Rogue DHCP',
        'benchmark.title': 'Benchmark SLA & Performance Réseau',
        'benchmark.grade': 'Note SLA Globale',
        'benchmark.jitter': 'Gigue (Jitter)',

        // En-têtes & Cartes
        'header.title': 'Wifi-Watch // Cyber Sentinel Enterprise',
        'header.status_protected': 'RÉSEAU SÉCURISÉ',
        'header.status_warning': 'ANOMALIE DÉTECTÉE',
        'header.quick_scan': 'Scan Rapide',

        // Tableau de bord
        'dash.online_devices': 'Équipements en Ligne',
        'dash.security_score': 'Score Cyber-Santé',
        'dash.rx_throughput': 'Débit Réception',
        'dash.tx_throughput': 'Débit Émission',
        'dash.threats_active': 'Menaces Actives',
        'dash.gateway_latency': 'Latence Passerelle',

        // Inventaire
        'devices.title': 'Inventaire & Gestion des Actifs Réseau',
        'devices.search_placeholder': 'Filtrer par IP, MAC, nom, catégorie ou responsable...',
        'devices.col_device': 'Équipement / Constructeur',
        'devices.col_ip': 'Adresse IP',
        'devices.col_mac': 'Adresse MAC',
        'devices.col_category': 'Catégorie',
        'devices.col_owner': 'Responsable',
        'devices.col_department': 'Département',
        'devices.col_status': 'Statut',
        'devices.col_actions': 'Actions',

        // Catégories
        'cat.workstation': 'Poste de Travail',
        'cat.server': 'Serveur Critique',
        'cat.network': 'Équipement Réseau',
        'cat.printer': 'Imprimante',
        'cat.iot': 'IoT / Caméra',
        'cat.mobile': 'Mobile / Tablette',
        'cat.guest': 'Invité',
        'cat.unauthorized': 'Non Autorisé',

        // DNS Guard
        'dns.title': 'DNS Guard — Surveillance de Résolution & Intégrité',
        'dns.subtitle': 'Contrôle continu contre le DNS Hijacking, empoisonnement de cache et conformité SLA.',
        'dns.btn_audit': 'Tester l\'Infrastructure DNS',
        'dns.col_server': 'Serveur DNS',
        'dns.col_reachable': 'Disponibilité',
        'dns.col_latency': 'Latence Résolution',
        'dns.col_integrity': 'Intégrité Canaris',

        // Paramètres
        'settings.title': 'Configuration Enterprise & Préférences',
        'settings.tab_general': 'Général',
        'settings.tab_network': 'Plages Réseau & VLANs',
        'settings.tab_webhooks': 'Webhooks & Intégrations',
        'settings.tab_defense': 'Défense Active',
        'settings.webhook_label': 'URL du Webhook d\'Alerte (Slack / Discord / Teams)',
        'settings.webhook_type': 'Type de Service',
        'settings.webhook_severity': 'Seuil Minimum de Déclenchement',
        'settings.subnets_label': 'Plages IP personnalisées (CIDR séparés par des virgules)',
        'settings.language_label': 'Langue de l\'Interface'
    },
    en: {
        // Navigation
        'nav.dashboard': 'Dashboard',
        'nav.radar': 'Spatial Radar',
        'nav.devices': 'Asset Inventory',
        'nav.security': 'Network Shield',
        'nav.speedtest': 'SLA Speed Test',
        'nav.channels': 'Channels & Neighbors',
        'nav.audit': 'Audit & NIS2',
        'nav.dnsguard': 'DNS Guard & SLA',
        'nav.honeypot': 'Canary Cyber & Trap',
        'nav.timeline': 'Presence & Sessions',
        'nav.spyhunter': 'IoT Spy Hunter',
        'nav.guest': 'Guest Wi-Fi & Badge',
        'nav.ruview': 'RuView RF Sensing',
        'nav.settings': 'Settings',

        // Status & buttons
        'btn.scan': 'Scan Network',
        'btn.scanning': 'Scanning...',
        'btn.export_csv': 'Export CSV',
        'btn.export_json': 'Export JSON',
        'btn.print_audit': 'Print / Export PDF',
        'btn.save': 'Save',
        'btn.cancel': 'Cancel',
        'btn.test_webhook': 'Test Webhook',
        'btn.quarantine': 'Quarantine (Firewall)',
        'btn.unquarantine': 'Unblock',
        'btn.approve': 'Approve',
        'btn.view_details': 'Details & Sheet',

        // Honeypot
        'honeypot.title': 'Canary Trap // Anti-Ransomware & Lateral Movement Sensor',
        'honeypot.subtitle': 'Silent decoy port listener catching worms and hostile scans in 0.1s.',
        'honeypot.port': 'Decoy Port',
        'honeypot.autoblock': 'Automatic Windows Firewall Quarantine',
        'honeypot.simulate': 'Test Decoy Trap (Simulation)',

        // Topology & DHCP & Benchmark
        'topology.title': 'Interactive Topology & Network Tree',
        'dhcp.title': 'DHCP Server Audit & Rogue DHCP Detection',
        'benchmark.title': 'Network SLA & Performance Benchmark',
        'benchmark.grade': 'Global SLA Grade',
        'benchmark.jitter': 'Jitter',

        // Headers & Cards
        'header.title': 'Wifi-Watch // Cyber Sentinel Enterprise',
        'header.status_protected': 'NETWORK PROTECTED',
        'header.status_warning': 'ANOMALY DETECTED',
        'header.quick_scan': 'Quick Scan',

        // Dashboard
        'dash.online_devices': 'Online Devices',
        'dash.security_score': 'Cyber Health Score',
        'dash.rx_throughput': 'Download Speed',
        'dash.tx_throughput': 'Upload Speed',
        'dash.threats_active': 'Active Threats',
        'dash.gateway_latency': 'Gateway Latency',

        // Inventory
        'devices.title': 'Network Asset Inventory & Management',
        'devices.search_placeholder': 'Filter by IP, MAC, name, category, or owner...',
        'devices.col_device': 'Device / Vendor',
        'devices.col_ip': 'IP Address',
        'devices.col_mac': 'MAC Address',
        'devices.col_category': 'Category',
        'devices.col_owner': 'Owner',
        'devices.col_department': 'Department',
        'devices.col_status': 'Status',
        'devices.col_actions': 'Actions',

        // Categories
        'cat.workstation': 'Workstation',
        'cat.server': 'Critical Server',
        'cat.network': 'Network Device',
        'cat.printer': 'Printer / Peripheral',
        'cat.iot': 'IoT / Camera',
        'cat.mobile': 'Mobile / Tablet',
        'cat.guest': 'Guest',
        'cat.unauthorized': 'Unauthorized',

        // DNS Guard
        'dns.title': 'DNS Guard — Resolution SLA & Integrity Monitor',
        'dns.subtitle': 'Continuous monitoring against DNS Hijacking, cache poisoning, and SLA latency compliance.',
        'dns.btn_audit': 'Audit DNS Infrastructure',
        'dns.col_server': 'DNS Server',
        'dns.col_reachable': 'Reachability',
        'dns.col_latency': 'Resolution Latency',
        'dns.col_integrity': 'Canary Integrity',

        // Settings
        'settings.title': 'Enterprise Settings & Preferences',
        'settings.tab_general': 'General',
        'settings.tab_network': 'Subnets & VLANs',
        'settings.tab_webhooks': 'Webhooks & Integrations',
        'settings.tab_defense': 'Active Defense',
        'settings.webhook_label': 'Alert Webhook URL (Slack / Discord / Teams)',
        'settings.webhook_type': 'Service Type',
        'settings.webhook_severity': 'Minimum Severity Trigger',
        'settings.subnets_label': 'Custom IP Subnets (Comma-separated CIDRs)',
        'settings.language_label': 'Interface Language'
    }
};

let currentLanguage = 'fr';

const i18n = {
    setLanguage(lang) {
        if (translations[lang]) {
            currentLanguage = lang;
            this.applyToDom();
        }
    },

    getLanguage() {
        return currentLanguage;
    },

    t(key, fallback = '') {
        const dict = translations[currentLanguage] || translations.fr;
        return dict[key] || fallback || key;
    },

    applyToDom() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation) {
                el.textContent = translation;
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            if (translation) {
                el.setAttribute('placeholder', translation);
            }
        });

        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = this.t(key);
            if (translation) {
                el.setAttribute('title', translation);
            }
        });
    }
};

if (typeof window !== 'undefined') {
    window.i18n = i18n;
}

if (typeof module !== 'undefined') {
    module.exports = i18n;
}

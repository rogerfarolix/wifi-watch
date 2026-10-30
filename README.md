<div align="center">

# 🛡️ Wifi-Watch — Enterprise Cyber Sentinel & Autonomous Network Radar

**Next-Generation Zero-Driver WiFi & Local Network Defense Platform for Windows**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D6?logo=windows)](https://microsoft.com)
[![Architecture](https://img.shields.io/badge/Architecture-x64%20Portable-success)](https://github.com)
[![Drivers](https://img.shields.io/badge/Npcap%2FWinPcap-NOT%20REQUIRED-brightgreen)](https://github.com)
[![Compliance](https://img.shields.io/badge/Compliance-NIS2%20%7C%20ISO%2027001-blueviolet)](https://github.com)
[![Webhooks](https://img.shields.io/badge/Alerts-Slack%20%7C%20Teams%20%7C%20Discord-orange)](https://github.com)

<p align="center">
  <img src="assets/banner.jpg" alt="Wifi-Watch Banner" width="850" style="border-radius: 12px; box-shadow: 0 8px 32px rgba(0,255,204,0.2);">
</p>

*Wifi-Watch delivers high-precision, non-intrusive enterprise network surveillance, zero-driver ARP poison mitigation, physical RF spatial sensing (RuView engine), multi-subnet asset inventory, and continuous DNS integrity verification.*

[Français](#-version-française) • [English](#-english-overview) • [Key Features](#-key-features) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [Compliance](#-compliance-nis2--iso-27001)

---

</div>

## 🌐 English Overview

**Wifi-Watch** is an enterprise-grade autonomous cyber sentinel designed for CISOs, SOC teams, IT administrators, and security auditors. Operating natively on Windows 10 & 11 without requiring risky kernel drivers (like Npcap or WinPcap), it continuously scans, audits, and shields local corporate infrastructures and WiFi networks.

Integrating cutting-edge RF signal analysis inspired by [@ruvnet's RuView](https://github.com/ruvnet) research, Wifi-Watch converts raw 802.11 signal metrics into physical presence estimation and room-level device localization.

### ⚡ Why Wifi-Watch?

| Traditional Network Scanners | Wifi-Watch Enterprise Sentinel |
| :--- | :--- |
| ❌ Require kernel driver install (`Npcap`, `WinPcap`) | ✅ **100% Zero-Driver** (Native Windows API & ARP Mining) |
| ❌ Single subnet limitation (`192.168.1.0/24`) | ✅ **Multi-Subnet & Corporate CIDR** (`10.0.0.0/24`, VLANs) |
| ❌ Raw IP/MAC dumps without business context | ✅ **Full CMDB Asset Tagging** (Owner, Dept, Location, Status) |
| ❌ Manual alert monitoring | ✅ **Instant Webhooks** (Slack, Discord, Microsoft Teams, REST) |
| ❌ Passive observation only | ✅ **1-Click Active Firewall Quarantine** (Windows Defender Netsh) |
| ❌ No regulatory linkage | ✅ **Automated NIS2 & ISO 27001 Compliance Evaluation** |
| ❌ Blind to DNS cache tampering | ✅ **DNS Guard with canary resolver cross-verification** |
| ❌ No lateral movement traps | ✅ **Integrated Network Canary Honeypot & Auto-Quarantine** |
| ❌ Static device listings | ✅ **Interactive Dual-Mode Radar & Hierarchical Topology Tree** |
| ❌ Basic ping only | ✅ **Full SLA Benchmark Engine** (Jitter, Packet Loss, DNS, HTTP) |
| ❌ Unaware of rogue DHCP servers | ✅ **Rogue DHCP & Gateway Spoofing Auditor (Anti-MITM)** |

---

## 🇫🇷 Version Française

**Wifi-Watch** est une plateforme autonome de surveillance et de défense cyber pour réseaux locaux et WiFi d'entreprise. Conçue pour les DSI, RSSI, administrateurs réseau et auditeurs de sécurité, l'application fonctionne de manière 100% autonome sous Windows 10 et 11 sans nécessiter l'installation de pilotes réseau intrusifs (aucun Npcap ou WinPcap requis).

### 🚀 Points Forts & Nouveautés v2.0
- **Piège Canari Réseau (Honeypot Intégré)** : Serveur leurre simulé (ex: SMB/TCP) détectant toute tentative de scan furtif ou de déplacement latéral (ransomware), avec mise en quarantaine automatique optionnelle via le Pare-feu Windows.
- **Topologie & Radar Interactif 360°** : Basculez en un clic entre la vue Radar tactique circulaire et la vue Arbre Topologique d'entreprise (WAN → Passerelle → Postes / Serveurs / IoT) rendue en Canvas haute performance.
- **Audit de Ports TCP & Services Vulnérables** : Scanner ultra-rapide non-bloquant analysant 25 ports critiques d'entreprise (SSH, RDP, SMB, Telnet, HTTP, MySQL...) avec alertes de sévérité.
- **Découverte ZeroConf (mDNS / SSDP UPnP)** : Résolution autonome et sans pilote des modèles d'appareils et noms conviviaux (Apple, Smart TVs, imprimantes, NAS).
- **Détection de Rogue DHCP & Usurpation Passerelle** : Identification proactive des faux serveurs DHCP et des conflits de passerelle (attaques MITM).
- **Surveillance & Watchdog d'Actifs Critiques** : Alertes vocales et webhooks immédiats en cas de déconnexion d'un serveur ou équipement critique labellisé.
- **Benchmark SLA & Qualité de Service** : Évaluation globale de la stabilité réseau avec attribution d'une note SLA (A+ à F) combinant latence min/moy/max, gigue (jitter), perte de paquets, et vitesse de résolution DNS/HTTPS.
- **Analyseur Spectral Wi-Fi** : Cartographie des canaux 2.4 GHz et 5 GHz et calcul du score de congestion pour recommander les canaux optimaux.

---

## 🎯 Key Features

### 1. 📡 Dual-Mode Tactical Radar & Topology Tree
- Instant toggle between **360° Circular Tactical Radar** and **Interactive Hierarchical Network Tree** (Canvas 60 FPS).
- Real-time distance mapping based on signal RSSI and round-trip latency.
- Audio voice annunciator via Web Speech API announcing critical intrusions in French or English.

### 2. 🕳️ Network Canary & Decoy Honeypot Trap
- Lightweight decoy TCP service designed to catch ransomware probes, port scans, and lateral movement.
- Emits immediate high-priority alerts and can **automatically isolate offending IPs** via Windows Firewall rules.

### 3. 🔌 Fast TCP Port Scanner & Vulnerable Services Auditor
- Audits critical enterprise ports (21, 22, 23, 25, 80, 135, 139, 443, 445, 1433, 3306, 3389, 5432, 8080...) natively via Node.js sockets.
- Integrated directly into the Device Inspection Modal for rapid security assessments.

### 4. 🏷️ ZeroConf (mDNS & SSDP/UPnP) Autonomous Discovery
- Listens to multicast packets (`224.0.0.251:5353` and `239.255.255.250:1900`) to extract human-friendly device names and manufacturer models without active port spamming.

### 5. 🚨 Rogue DHCP & Gateway Spoofing Auditor
- Actively audits local DHCP configuration and multiple gateways to identify rogue DHCP servers and MITM poisoning.

### 6. ⏱️ Critical Asset Watchdog & SLA Heartbeat
- Mark infrastructure servers, NAS, and key routers as "Critical Infrastructure Assets".
- Receive immediate warnings if an essential node drops offline.

### 7. ⚡ Enterprise SLA Performance & Latency Benchmark Engine
- Measures minimum, average, and maximum ping, jitter (variance), packet loss percentage, DNS resolution speed, and HTTPS API round-trip.
- Computes an **SLA Quality Grade (A+ to F)** for VoIP, Video Conferencing, and Cloud readiness.

### 8. 📶 WiFi Spectrum & Channel Congestion Analyzer
- Scans all visible 802.11 Access Points across 2.4 GHz and 5 GHz bands.
- Calculates channel congestion histograms and recommends optimal collision-free channels.

### 9. 🧬 RuView RF Micro-Perturbation Engine
- Extracts real-time WiFi BSSID metadata, signal strength (dBm / percentage), radio band (2.4 GHz / 5 GHz / 6 GHz Wi-Fi 6E), and channel quality.
- Applies mathematical variance and path loss algorithms to estimate physical distance and detect human motion interference in the wireless medium (inspired by [@ruvnet's RuView](https://github.com/ruvnet)).

### 10. 🛡️ Active Threat Defense & Instant Netsh Quarantine
- **ARP Spoofing Detector**: Flags duplicate MAC addresses claiming multiple IPs on the gateway.
- **Spy Device & Camera Hunter**: Curated OUI fingerprint database targeting IP cameras and micro-bugs.
- **Instant Netsh Quarantine**: Quarantines rogue MAC/IP addresses directly at the Windows Advanced Firewall layer with zero latency.

### 11. 🔍 DNS Guard & SLA Integrity Monitor
- Audits system-configured DNS servers against canary domains (`cloudflare.com`, `google.com`, `one.one.one.one`).
- Performs parallel queries to Cloudflare (`1.1.1.1`) and Google DNS (`8.8.8.8`) to detect DNS hijacking and cache poisoning.

### 12. 🏷️ Enterprise Asset Management & CMDB Export
- Tag assets with standard categories: `Workstation`, `Server`, `Network Equipment`, `Printer`, `IoT Device`, `Mobile Device`, `Guest`, `Unauthorized`.
- Associate Department, Owner, Physical Room/Rack, and Authorized flag.
- Export clean UTF-8 BOM CSV files with 15 columns tailored for Microsoft Excel, GLPI, and CMDB import.
- Export full structured JSON snapshots for backup or external SOC analytics.

### 13. 📊 Automated NIS2 & ISO 27001 Audit Reports
- Assesses network hygiene across 8 enterprise checkpoints:
  - Encryption standard (WPA2/WPA3 vs legacy WEP/WPA).
  - Rogue and unauthorized equipment ratio.
  - Active ARP spoofing status.
  - Subnet segmentation and address space exposure.
  - DNS integrity & latency SLA.
- Generates a printable, executive-ready HTML cybersecurity audit report.

### 14. 🔔 SOC Incident Webhooks
- Out-of-the-box integration with:
  - **Slack**: Rich blocks with incident severity badges.
  - **Discord**: Color-coded embeds with threat telemetry.
  - **Microsoft Teams**: Adaptive Office 365 connector cards.
  - **Generic Webhook**: Clean JSON POST for SIEM ingestion (Splunk, Elastic, Wazuh).

### 15. 🎨 Corporate & Cyberpunk Themes + FR/EN Toggle
- Instant top-bar switcher between **Cyberpunk Dark** (high contrast neon for SOC consoles) and **Corporate Light** (clean executive dashboard).
- Complete bilingual localization with instant UI reactivity.

---

## 🏗️ Architecture

```
wifi-watch/
├── assets/                          # Official badges, icons, and banner
│   ├── banner.jpg
│   └── icon.jpg
├── desktop-app/
│   ├── dist/                        # Standalone portable Windows binary
│   │   └── Wifi-Watch-Portable.exe  # Double-click self-contained executable
│   ├── src/
│   │   ├── main.js                  # Electron main process & IPC coordinator
│   │   ├── preload.js               # Context-isolated secure bridge
│   │   ├── data/
│   │   │   └── database.js          # SQLite3 enterprise state store & CMDB
│   │   ├── network/
│   │   │   ├── scanner.js           # Multi-subnet scanner & ARP table reader
│   │   │   ├── threatIntel.js       # Threat rules, MAC OUI vendor signatures
│   │   │   ├── portScanner.js       # Fast non-blocking TCP port & service auditor
│   │   │   ├── zeroConfDiscovery.js # Autonomous mDNS & SSDP/UPnP model discovery
│   │   │   ├── honeypot.js          # Decoy TCP honeypot canary & probe sensor
│   │   │   ├── dhcpAuditor.js       # Rogue DHCP server & gateway MITM detector
│   │   │   ├── spectrumAnalyzer.js  # WiFi channel congestion & spectrum auditor
│   │   │   ├── speedBenchmark.js    # Enterprise SLA benchmark & quality grader
│   │   │   ├── ruviewEngine.js      # RF micro-perturbations & distance model
│   │   │   ├── dnsGuard.js          # DNS integrity auditor & canary checks
│   │   │   ├── webhookDispatcher.js # Slack/Teams/Discord/REST alert dispatcher
│   │   │   ├── exportManager.js     # UTF-8 BOM CSV & JSON CMDB generators
│   │   │   ├── firewall.js          # Windows Firewall netsh isolation engine
│   │   │   └── auditReport.js       # NIS2 Article 21 & ISO 27001 reporter
│   │   └── renderer/
│   │       ├── index.html           # Modern glassmorphism dashboard
│   │       ├── css/style.css        # Cyberpunk & Corporate theme definitions
│   │       └── js/
│   │           ├── app.js           # View state manager, filters & modals
│   │           ├── i18n.js          # French / English translation dictionary
│   │           ├── radar.js         # Canvas 60 FPS rotating radar scope
│   │           └── audioVoice.js    # Speech synthesis audio annunciator
│   └── package.json
├── Lancer-WifiWatch.bat             # Fast launch script
├── Wifi-Watch-Silencieux.vbs        # Background launch script
├── LICENSE                          # MIT License
├── SECURITY.md                      # Security vulnerability reporting protocol
└── CONTRIBUTING.md                  # Open-source contribution guidelines
```

---

## 🚀 Getting Started

### Option A: Portable Binary (No Installation)
1. Download `Wifi-Watch-Portable.exe` from the latest [Releases](https://github.com).
2. Double-click to launch. No administrator rights required for general scanning (Admin rights required only for active firewall quarantine).
3. The application runs self-contained with an embedded local SQLite database.

### Option B: Run from Source
**Prerequisites**:
- Windows 10 or 11 (64-bit)
- [Node.js](https://nodejs.org) (v18.x or v20.x recommended)
- Git

```bash
# 1. Clone the repository
git clone https://github.com/your-username/wifi-watch.git
cd wifi-watch/desktop-app

# 2. Install dependencies
npm install

# 3. Start the application in development mode
npm start

# 4. Compile into a standalone portable .exe
npm run dist
```

---

## 🔒 Compliance: NIS2 & ISO 27001

Wifi-Watch directly supports technical verification requirements of modern cybersecurity standards:

| Standard | Article / Control | How Wifi-Watch Addresses It |
| :--- | :--- | :--- |
| **NIS2 Directive** | **Article 21(2)(a)** — Policies on risk analysis & system security | Automated security audit reports scoring hygiene & encryption. |
| **NIS2 Directive** | **Article 21(2)(e)** — Network and information systems security | Continuous surveillance, rogue device alerts, and DNS verification. |
| **NIS2 Directive** | **Article 21(2)(b)** — Incident handling & response | 1-click active firewall isolation and real-time webhook broadcasts. |
| **ISO/IEC 27001:2022** | **A.8.1** — User endpoint devices | Complete asset tagging (Department, Owner, Authorized status). |
| **ISO/IEC 27001:2022** | **A.8.20** — Network security | Multi-subnet and VLAN scanning, ARP spoofing detection. |
| **ISO/IEC 27001:2022** | **A.8.8** — Management of technical vulnerabilities | Identification of unencrypted WEP/WPA and vulnerable IoT endpoints. |

---

## 🤝 Contributing

We welcome contributions from cybersecurity engineers, network administrators, and open-source enthusiasts. Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on code style, testing, and pull request workflows.

---

## 🛡️ Security & Responsible Disclosure

If you discover a vulnerability or security issue within Wifi-Watch, please refer to our [SECURITY.md](SECURITY.md) for our responsible disclosure procedure. **Do not create public GitHub issues for security vulnerabilities.**

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

*Disclaimer: Wifi-Watch is built strictly for defensive cybersecurity, authorized enterprise network administration, and educational auditing. Always obtain explicit permission before scanning networks you do not own or manage.*

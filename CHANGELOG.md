# 📜 Changelog — Wifi-Watch

Toutes les modifications notables apportées à ce projet sont documentées dans ce fichier.
Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/), et ce projet adhère à [Semantic Versioning](https://semver.org/lang/fr/).

---

## [2.0.0] — 2026-10-30

### 🚀 Nouveautés Majeures (Enterprise & Cyber Sentinel)
- **🕳️ Canari Réseau (Honeypot Intégré)** : Serveur leurre TCP (port 4455 configurable) pour intercepter les mouvements latéraux, scans de vulnérabilités et vers réseau en temps réel avec option d'isolation automatique par le Pare-feu Windows.
- **🕸️ Arbre Topologique & Radar Tactique 360°** : Rendu Canvas dynamique double-mode permettant d'alterner entre le Radar circulaire cyberpunk et l'Arbre hiérarchique réseau (`WAN` $\to$ `Passerelle` $\to$ `Branches Catégorielles` $\to$ `Équipements`).
- **🔌 Auditeur de Ports TCP & Services Vulnérables** : Moteur de scan natif non-bloquant interrogeant 25 ports critiques d'entreprise (SSH, Telnet, RDP, SMB, HTTP, MySQL, PostgreSQL, etc.) avec indicateur de criticité directement dans le modal de chaque appareil.
- **🏷️ Découverte ZeroConf Autonome (mDNS / SSDP UPnP)** : Résolution passive et sans pilote des modèles d'équipements et noms d'hôtes conviviaux (Apple, imprimantes, Smart TVs, NAS).
- **🚨 Détecteur Rogue DHCP & Anti-MITM** : Audit proactif des passerelles et serveurs DHCP multiples pour parer aux attaques d'usurpation et d'interception de trafic.
- **⏱️ Watchdog & SLA Heartbeat pour Actifs Critiques** : Étiquetage d'équipements clés (serveurs AD, passerelles, NAS) avec déclenchement d'alertes prioritaires vocales et webhooks en cas de rupture de disponibilité.
- **⚡ Moteur de Benchmark SLA & Stabilité** : Évaluation complète de la qualité de connexion (gigue, min/moy/max ping, perte de paquets, latence DNS et HTTPS) avec attribution d'une note SLA certifiée (`A+` à `F`).
- **📶 Analyseur de Spectre Wi-Fi & Congestion** : Cartographie des canaux 2.4 GHz et 5 GHz et calcul de l'indice de saturation pour recommander les canaux optimaux.
- **📺 Mur Vidéo SOC & Cyber War Room (Grand Écran Salle de Réunion)** : Mode plein écran immersif sans défilement (`F11` ou `[📺 Mur SOC]`) pour vidéoprojecteurs et écrans 4K de salle de crise, avec radar rotatif 360°, jauge de menace DEFCON 1-5 calculée en continu, double horloge militaire (Locale & ZULU UTC) et bandeau télétype temps réel.
- **🌐 Moteur Threat Intelligence & Intégration de 5 APIs Publiques** :
  - *Shodan InternetDB* : Audit d'exposition WAN 100% gratuit, détection des ports ouverts et failles CVEs publiques sans clé d'API.
  - *IP-API* : Détection de l'IP publique WAN, géolocalisation (ville/pays), FAI et ASN.
  - *AbuseIPDB* : Analyse de réputation et indice de malveillance d'IP.
  - *ThreatFox (Abuse.ch)* : Détection d'indicateurs botnet C2 et malwares en temps réel.
  - *MACVendors API* : Résolution OUI en ligne de secours pour les nouveaux fabricants de puces réseau.

### 🛡️ Sécurité & Conformité
- **Rapports d'Audit NIS2 & ISO 27001** : Évaluation automatisée sur l'Article 21 de la directive européenne NIS2 et l'ISO 27001:2022 (contrôles A.8.1, A.8.8, A.8.20).
- **DNS Guard Canari** : Détection des altérations de cache DNS et benchmarking multi-résolveurs (Cloudflare `1.1.1.1` vs Google `8.8.8.8`).
- **Webhooks d'Alerte SOC** : Intégration clé en main avec Slack, Discord, Microsoft Teams et API HTTP / SIEM.
- **Isolation Pare-Feu Netsh en 1 Clic** : Quarantaine instantanée au niveau du Pare-feu Windows Advanced Security.

### 📦 Déploiement
- **Binaire Autonome Portable (`Wifi-Watch-Portable.exe`)** : Zéro installation, zéro pilote kernel (aucun Npcap / WinPcap requis), base de données SQLite embarquée.
- **Script de Création de Raccourci Bureau** et lanceur silencieux en arrière-plan (`Wifi-Watch-Silencieux.vbs`).

---

## [1.0.0] — 2026-10-15

### Ajouté
- Détection d'appareils par balayage ARP local.
- Radar circulaire réactif avec vitesse de balayage configurable.
- Base de données OUI des constructeurs et détection des caméras espionnes / micro-modules IoT.
- Synthèse vocale tactique (Sentinel Voice) en français et anglais.
- Graphiques de débit et latence en direct via Chart.js.
- Export de l'inventaire au format CSV (compatible Microsoft Excel UTF-8 BOM) et JSON.

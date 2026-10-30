# 🗺️ Roadmap Produit — Wifi-Watch

Cette feuille de route présente les orientations stratégiques et les fonctionnalités planifiées pour les prochaines versions de **Wifi-Watch**, tant pour l'écosystème open-source que pour les déploiements en environnement d'entreprise.

---

## 📍 Q4 2026 — v2.1 (Ergonomie & Écosystème Open-Source)
- [x] **Piège Canari Réseau (Honeypot)** : Capture des sondes réseau et mouvements latéraux.
- [x] **Arbre Topologique Canvas 60 FPS** : Visualisation arborescente dynamique multi-niveaux.
- [x] **Benchmark de Performance SLA** : Notation A+ à F (Jitter, Packet Loss, DNS/HTTP).
- [x] **Auditeur de Ports TCP non-bloquant** : Détection des services vulnérables.
- [x] **Découverte mDNS / SSDP UPnP** : Résolution sans pilote des modèles d'équipements.
- [ ] **Palette de Commandes Rapides (Quick Command Bar `Ctrl + K`)** : Recherche globale instantanée, actions rapides d'isolation ou de scan sans quitter le clavier.
- [ ] **Centre de Notifications In-App (Toast)** : Système unifié de feedback discret et non-intrusif.
- [ ] **Regroupement Intelligent dans la Sidebar** : Organisation ergonomique par sections (`Surveillance`, `Sécurité Active`, `Performance`, `Administration`).

---

## 📍 Q1 2027 — v2.2 (Enterprise & SIEM Connector)
- [ ] **Agent Distribué Légitime Multi-Sites (Wifi-Watch Agent)** : Petit binaire léger transmettant les événements de sondes Wi-Fi locales vers une console centrale Wifi-Watch.
- [ ] **Connecteur SIEM Natif** : Export direct au format Syslog (RFC 5424) et CEF (Common Event Format) pour intégration transparente avec Splunk, Elastic Security, Wazuh et Microsoft Sentinel.
- [ ] **Support Multi-Interfaces Réseau Simultanées** : Possibilité de surveiller simultanément une carte Wi-Fi 6E et un adaptateur Ethernet Gigabit.
- [ ] **Détection d'Anomalies Comportementales par IA Locale (On-Device)** : Modèle léger ONNX détectant les variations anormales de bande passante par équipement en dehors des heures ouvrées.

---

## 📍 Q2 2027 — v3.0 (Cross-Platform & Cloud Hybrid)
- [ ] **Support Linux & macOS** : Adaptation native du scanner ARP et des captures de paquets pour Debian, Ubuntu, Fedora et macOS (Sonoma/Sequoia).
- [ ] **Portail Web d'Administration Multi-Locataire (Optionnel)** : Dashboard web sécurisé pour hébergement sur serveur interne d'entreprise.
- [ ] **Génération Automatique de Rapports PDF Exécutifs Signés** : Export PDF haute résolution prêt pour les audits externes de certification.

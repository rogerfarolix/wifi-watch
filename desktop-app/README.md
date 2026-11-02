# Wifi-Watch // Cyber Sentinel v2.0 (Logiciel Tout-en-Un)

Application de bureau native pour la surveillance en temps réel, l'inventaire cyber-sécurisé des équipements, la détection d'intrusions, la chasse aux caméras/micros espions et l'audit de performance sur votre réseau local.

---

### Suite Complète de Fonctionnalités

1. **100% Autonome & Zéro Dépendance Serveur** :
   * Ne nécessite ni XAMPP, ni Apache, ni PHP, ni PostgreSQL, ni Docker.
   * Base de données embarquée locale ultra-rapide avec reprise sur incident (`wifi_watch.db.json`).
   * Réseau opérationnel sans installation de driver tiers (Npcap non requis).

2. **Inventaire Réseau en Temps Réel** :
   * Détection automatique de la carte Wi-Fi active, SSID, BSSID, RSSI, canal et débits négociés.
   * Balayage ARP ultra-rapide (254 adresses analysées en ~3 secondes).
   * Résolution des noms d'hôtes par NetBIOS (UDP 137) et DNS inverse.
   * Base OUI intégrée avec détection des adresses MAC privées/aléatoires (iOS/Android).

3. **Radar & Topologie Interactive (HUD Cyber)** :
   * Visualisation canvas 360° avec balayage radar, portée concentrique, passerelle centrale et orbite des équipements avec infobulles interactives.

4. **IoT Spy Hunter (Chasseur de Caméras & Micros Espions)** :
   * Traque les caméras IP cachées, micros connectés et flux de surveillance non chiffrés.
   * Analyse des ports RTSP (554, 8554), ONVIF (8000, 8899), Dahua (37777, 37778), Tuya et signatures HTTP de caméras.
   * Détection des constructeurs spécialisés (Hikvision, Dahua, Reolink, Axis, Wyze, Foscam, VStarcam, Tapo, etc.).
   * Extraction des URLs de flux vidéo directs (`rtsp://<ip>:554/live/ch0`).

5. **Voice Sentinel (Assistant Vocal Tactique)** :
   * Moteur de synthèse vocale 100% hors-ligne (Web Speech API native).
   * Annonce vocalement en français l'apparition de nouveaux appareils, la détection de caméras espions, les alertes d'attaques et les résultats de scans.
   * Contrôle direct depuis la barre de titre (bouton ON/OFF).

6. **Bouclier & Quarantaine Réseau (Isolation Pare-feu)** :
   * Permet d'isoler un appareil intrus ou hostile en 1 clic.
   * Injecte des règles de blocage bidirectionnel dans le pare-feu avancé de Windows (`netsh advfirewall firewall`) et purge le cache ARP.

7. **Présence & Timeline (Contrôle Parental & Horaires)** :
   * Enregistre automatiquement chaque session de connexion et déconnexion avec calcul de durée.
   * Détecte les connexions nocturnes (entre 23h et 06h) et calcule le temps cumulé en ligne par jour.
   * Filtre par équipement et historique exportable.

8. **Portail Invité & Badge QR Code Wi-Fi** :
   * Générateur de QR Code 100% autonome sans connexion Internet.
   * Génération de la chaîne de connexion normalisée `WIFI:T:WPA;S:...;P:...;;`.
   * Badge invité cyber prêt à imprimer (`Ctrl+P` ou bouton Imprimer).

9. **Test de Débit Intégré (Speedtest Multi-Flux)** :
   * Mesure réelle de la bande passante descendante (Download), montante (Upload), latence et gigue (Jitter).
   * Compteur de vitesse en temps réel avec aiguille animée.

10. **Analyseur Wi-Fi Voisins & Détecteur Evil Twin** :
    * Analyse les réseaux Wi-Fi environnants et la congestion des canaux 2.4 GHz et 5 GHz.
    * Recommande automatiquement le meilleur canal Wi-Fi pour votre box.
    * Détecte les attaques Evil Twin (faux points d'accès usurpant votre SSID avec un BSSID pirate).

11. **Score de Santé Cyber (0-100) & Rapport d'Audit Imprimable** :
    * Calcul automatique d'un score de sécurité globale basé sur les ports ouverts, la sécurité Wi-Fi, les appareils inconnus et les alertes.
    * Générateur de rapport HTML complet avec mise en page moderne, printable ou exportable en PDF.

12. **Wake-on-LAN (WoL)** :
    * Envoi de paquets magiques standard UDP 9 pour réveiller et allumer vos PC et serveurs du réseau à distance.

13. **Plateau Système Windows (System Tray)** :
    * L'application tourne discrètement près de l'horloge Windows avec menu contextuel et notifications d'intrusion.

14. **RuView // Spatial Sensing & WiFi DensePose (ruvnet/RuView)** :
    * Intégration de la technologie open-source de **Reuven Cohen (ruvnet/RuView)**.
    * Détection de présence humaine physique sans caméra à travers les murs.
    * Reconstruction tridimensionnelle du squelette humain (17 articulations standard COCO).
    * Oscilloscope respiratoire (BPM) et surveillance des pulsations cardiaques RF.
    * Analyseur de spectre OFDM temps réel sur 56 canaux de sous-porteuses CSI.
    * Double mode : Moteur d'estimation RF autonome (RuSense) ou passerelle matérielle ESP32-S3 réelle via WebSocket/UDP.

---

### Lancement Rapide

Double-cliquez simplement sur **`Lancer-WifiWatch.bat`** à la racine du projet, ou exécutez dans un terminal :

```bash
cd desktop-app
npm start
```

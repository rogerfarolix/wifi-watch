/**
 * Wifi-Watch — Voice Sentinel (Synthèse Vocale Tactique & Alertes Cyber)
 * Moteur vocal cyber autonome basé sur l'API Web Speech native du navigateur.
 * Annonce vocalement les intrusions, nouveaux équipements, caméras espions
 * et résultats de scans sans aucun service tiers.
 */

class VoiceSentinel {
    constructor() {
        this.synth = window.speechSynthesis;
        this.enabled = true;
        this.volume = 0.9;
        this.rate = 1.0;
        this.pitch = 1.0;
        this.voice = null;
        this.queue = [];
        this.isSpeaking = false;

        this.init();
    }

    init() {
        if (!('speechSynthesis' in window)) {
            console.warn('[VOICE-SENTINEL] Synthèse vocale non supportée par cette plateforme.');
            this.enabled = false;
            return;
        }

        const pickVoice = () => {
            const voices = this.synth.getVoices();
            if (!voices || voices.length === 0) return;

            // Priorité aux voix françaises naturelles (Microsoft Paul/Hortense ou Google Français)
            const frVoices = voices.filter(v => v.lang && v.lang.startsWith('fr'));
            if (frVoices.length > 0) {
                // Préférer une voix masculine ou naturelle si disponible
                this.voice = frVoices.find(v => v.name.includes('Natural') || v.name.includes('Paul') || v.name.includes('Hortense')) || frVoices[0];
            } else {
                this.voice = voices[0];
            }
        };

        pickVoice();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = pickVoice;
        }
    }

    setEnabled(bool) {
        this.enabled = Boolean(bool);
        if (!this.enabled && this.synth) {
            this.synth.cancel();
            this.queue = [];
            this.isSpeaking = false;
        }
    }

    isEnabled() {
        return this.enabled;
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, Number(vol) || 0.9));
    }

    speak(text, priority = 'normal') {
        if (!this.enabled || !this.synth || !text) return;

        if (priority === 'critical') {
            // Interrompre la parole courante pour une urgence vitale
            this.synth.cancel();
            this.queue = [];
            this.isSpeaking = false;
        }

        this.queue.push(text);
        this.processQueue();
    }

    processQueue() {
        if (this.isSpeaking || this.queue.length === 0) return;

        const phrase = this.queue.shift();
        const utterance = new SpeechSynthesisUtterance(phrase);

        if (this.voice) {
            utterance.voice = this.voice;
        }
        utterance.lang = this.voice?.lang || 'fr-FR';
        utterance.volume = this.volume;
        utterance.rate = this.rate;
        utterance.pitch = this.pitch;

        utterance.onstart = () => {
            this.isSpeaking = true;
        };

        utterance.onend = () => {
            this.isSpeaking = false;
            setTimeout(() => this.processQueue(), 250);
        };

        utterance.onerror = (e) => {
            console.warn('[VOICE-SENTINEL] Erreur diction:', e);
            this.isSpeaking = false;
            setTimeout(() => this.processQueue(), 200);
        };

        this.synth.speak(utterance);
    }

    // ─── Annonces Prédéfinies Spécialisées ──────────────────────────────────

    announceNewDevice(vendor, ip) {
        const brand = vendor && vendor !== 'Inconnu' ? vendor : 'de constructeur indéterminé';
        this.speak(`Alerte sécurité : nouvel équipement détecté sur votre réseau. Fabricant : ${brand}. Adresse IP : ${ip}.`, 'critical');
    }

    announceSpyDevice(brand, ip) {
        const target = brand || 'Caméra ou micro espion';
        this.speak(`Avertissement intrusion : équipement de surveillance audio ou vidéo détecté. ${target} actif à l'adresse IP ${ip}.`, 'critical');
    }

    announceThreat(title) {
        this.speak(`Alerte critique Wifi-Watch : ${title}`, 'critical');
    }

    announceScanComplete(deviceCount) {
        const plural = deviceCount > 1 ? 'appareils connectés' : 'appareil connecté';
        this.speak(`Scan terminé. ${deviceCount} ${plural} sur le réseau.`);
    }

    announceSpeedTest(mbps) {
        this.speak(`Test de bande passante complété. Débit réel mesuré : ${Math.round(mbps)} mégabits par seconde.`);
    }

    testVoice() {
        this.speak(`Wifi-Watch Sentinel initialisé. Bouclier réseau actif et surveillance opérationnelle.`, 'critical');
    }
}

// Export global pour Electron renderer
window.VoiceSentinel = VoiceSentinel;

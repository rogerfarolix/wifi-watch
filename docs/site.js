(function () {
  'use strict';

  var REPO = 'rogerfarolix/wifi-watch';
  document.documentElement.classList.add('js');

  var FR = {
    'a11y.skip': 'Aller au contenu',
    'nav.preview': 'Aperçu', 'nav.features': 'Fonctions', 'nav.private': 'Confidentialité', 'nav.demo': 'Démo', 'nav.faq': 'FAQ', 'nav.download': 'Télécharger', 'nav.contact': 'Contact',
    'hero.pill': 'Gratuit et open source pour Windows 10 et 11',
    'hero.title': 'Voyez qui est sur votre <span class="nb">Wi-Fi</span>.',
    'hero.lead': 'Wifi-Watch liste chaque appareil de votre réseau et vous prévient en cas de faux point d\'accès, de faux serveur DHCP, d\'usurpation ARP ou de caméra cachée. Aucun driver, aucun compte, rien n\'est envoyé dans le cloud.',
    'hero.download': 'Télécharger pour Windows', 'hero.try': 'Essayer la démo',
    'tab.dashboard': 'Tableau de bord', 'tab.radar': 'Radar', 'tab.soc': 'Mur SOC', 'tab.audit': 'Audit NIS2', 'tab.spy': 'Chasseur d\'espions', 'tab.channels': 'Canaux',
    'shot.note': 'Les captures viennent du mode démo intégré : un réseau fictif, aucune donnée réelle.',
    'feat.title': 'Tout ce qu\'un contrôle réseau doit couvrir.',
    'feat.sub': 'Une application portable. Ouvrez-la, scannez, lisez le résultat.',
    'f1.t': 'Inventaire et radar', 'f1.p': 'Chaque appareil du réseau avec son fabricant, son statut de confiance et un responsable que vous désignez. Les appareils inconnus se repèrent tout de suite.',
    'f2.t': 'Détection d\'Evil Twin', 'f2.p': 'Repère un faux point d\'accès qui copie le nom de votre Wi-Fi, avec son canal et son signal.',
    'f3.t': 'Faux DHCP et usurpation ARP', 'f3.p': 'Vous prévient quand un second serveur DHCP répond ou quand l\'adresse MAC de votre routeur change brusquement.',
    'f4.t': 'Piège canari', 'f4.p': 'Un port leurre que personne ne devrait toucher. Si quelque chose le sonde, vous recevez une alerte critique.',
    'f5.t': 'Chasseur de caméras cachées', 'f5.p': 'Trouve les caméras IP et les flux vidéo ouverts (RTSP) sur votre réseau, et signale celles sans authentification.',
    'f6.t': 'Vue NIS2 et ISO 27001', 'f6.p': 'Un score de sécurité, un tableau de conformité et un rapport HTML à remettre à un responsable ou à un auditeur.',
    'f7.t': 'Mur SOC plein écran', 'f7.p': 'Un tableau de bord pour l\'écran d\'une salle de réunion : radar, alertes et santé du réseau en un coup d\'œil.',
    'f8.t': 'Canaux et débit', 'f8.p': 'Voyez quel canal Wi-Fi est saturé, obtenez une recommandation et mesurez latence, gigue et débit.',
    'f9.t': 'Isolement en un clic', 'f9.p': 'Bloquez un appareil suspect par une règle du pare-feu Windows de ce PC. Facile à annuler, sans accès au routeur.',
    'priv.title': 'Léger, local et discret.',
    'priv.sub': 'Wifi-Watch travaille sur votre PC et y garde ce qu\'il trouve.',
    'priv.1': 'Aucun driver à installer : il utilise ce que Windows fournit déjà.',
    'priv.2': 'Pas de compte, pas de serveur cloud, pas de télémétrie.',
    'priv.3': 'L\'URL de webhook et les clés d\'API sont chiffrées avec Windows DPAPI.',
    'priv.4': 'Les recherches optionnelles n\'envoient que l\'IP ou la MAC que vous vérifiez. La page de confidentialité liste chaque requête sortante.',
    'priv.5': 'Licence MIT. Lisez le code, compilez-le vous-même, modifiez-le.',
    'priv.link': 'Lire la politique de confidentialité',
    'fact.1': 'driver à installer', 'fact.2': 'compte ou télémétrie', 'fact.3': 'langues de l\'interface', 'fact.4': 'licence open source',
    'demo.title': 'Essayez en 30 secondes.',
    'demo.sub': 'Pas de réseau suspect sous la main ? Le mode démo charge un bureau fictif avec 14 appareils, un faux point d\'accès et des alertes en direct.',
    'demo.copy': 'Copier', 'demo.copied': 'Copié',
    'demo.note': 'Vous pouvez aussi le lancer depuis les Paramètres. Rien n\'est scanné, aucune règle de pare-feu n\'est créée et vos vraies données ne sont jamais touchées.',
    'hon.title': 'Honnête sur ses limites.',
    'hon.sub': 'Un outil gratuit doit dire ce qu\'il ne sait pas faire.',
    'hon.1': 'Il ne peut pas dire qui télécharge quoi. Un PC en Wi-Fi ne voit que son propre trafic, et la plupart du trafic est chiffré.',
    'hon.2': 'La quarantaine bloque un appareil dans le pare-feu de ce PC. Elle ne le coupe pas du routeur.',
    'hon.3': 'La vue radio RuView est une simulation tant que vous ne branchez pas de capteurs ESP32.',
    'hon.4': 'L\'exécutable n\'est pas encore signé : Windows SmartScreen peut afficher un avertissement la première fois.',
    'hon.5': 'À utiliser uniquement sur des réseaux que vous possédez ou que vous avez le droit d\'auditer.',
    'news.title': 'Nouveautés',
    'news.204': 'Mises à jour des dépendances et mode démo qui remplit l\'application avec un réseau fictif.',
    'news.203': 'Vérification des mises à jour intégrée : l\'application vous prévient quand une nouvelle version sort. Elle n\'installe jamais rien toute seule.',
    'news.202': 'Interface plus propre, meilleurs états vides et README plus clair avec un tableau de confidentialité.',
    'news.201': 'Durcissement de la sécurité, interface en français et en anglais, tests et intégration continue.',
    'news.all': 'Journal complet des modifications sur GitHub',
    'faq.title': 'Vos questions, nos réponses.',
    'q1': 'Wifi-Watch est-il vraiment gratuit ?', 'a1': 'Oui. Il est open source sous licence MIT : libre d\'utilisation, de lecture, de modification et de partage, sans compte et sans offre payante.',
    'q2': 'Fonctionne-t-il sur Mac, Linux ou téléphone ?', 'a2': 'Pas encore. Wifi-Watch est conçu pour Windows 10 et 11. Le multiplateforme figure sur la feuille de route.',
    'q3': 'Peut-il dire qui télécharge des films ou des jeux ?', 'a3': 'Non. Un PC en Wi-Fi ne voit que son propre trafic, et la plupart du trafic est chiffré. Pour connaître la consommation par appareil, il faut un routeur ou un pare-feu qui la fournit.',
    'q4': 'Envoie-t-il mes données quelque part ?', 'a4': 'Aucune télémétrie, aucun compte, aucun cloud. Vos données restent sur votre PC. Quelques recherches optionnelles n\'envoient que l\'IP ou la MAC que vous vérifiez, et la page de confidentialité les liste toutes.',
    'q5': 'Pourquoi Windows SmartScreen m\'avertit-il ?', 'a5': 'L\'exécutable n\'est pas encore signé, car un certificat de signature est payant. Cliquez sur Informations complémentaires, puis sur Exécuter quand même, ou compilez l\'application depuis les sources.',
    'q6': 'Faut-il des droits administrateur ?', 'a6': 'Pas pour scanner. Seul l\'isolement d\'un appareil par une règle de pare-feu demande une session administrateur.',
    'q7': 'Est-il légal de scanner un réseau ?', 'a7': 'Ne scannez que des réseaux que vous possédez ou que vous avez l\'autorisation écrite d\'auditer. Wifi-Watch est un outil défensif, pas un outil d\'attaque. Voir les conditions d\'utilisation.',
    'q8': 'Comment le mettre à jour ?', 'a8': 'L\'application vérifie la présence d\'une nouvelle version au démarrage et vous prévient. Téléchargez le nouveau fichier depuis la page des versions ; rien n\'est installé dans votre dos.',
    'dl.title': 'Prêt quand vous l\'êtes.',
    'dl.sub': 'Un seul fichier portable. Pas d\'installateur, pas de droits administrateur pour scanner.',
    'dl.src': 'Voir le code source',
    'dl.s1': 'Téléchargez <code>Wifi-Watch-Portable.exe</code> et lancez-le.',
    'dl.s2': 'Si SmartScreen vous prévient, cliquez sur <em>Informations complémentaires</em>, puis sur <em>Exécuter quand même</em>. Le fichier n\'est pas encore signé ; vous pouvez aussi le compiler depuis les sources.',
    'dl.s3': 'Cliquez sur <em>Scanner le réseau</em> et lisez votre score de sécurité.',
    'ct.title': 'Nous contacter.',
    'ct.sub': 'Wifi-Watch est un projet communautaire. Le plus rapide pour le joindre est GitHub.',
    'ct.1t': 'Signaler un bug ou proposer une idée', 'ct.1p': 'Ouvrez un ticket. Dites ce que vous avez fait, ce que vous attendiez et ce qui s\'est passé.',
    'ct.2t': 'Signaler une faille de sécurité', 'ct.2p': 'Utilisez le signalement privé de vulnérabilité, pour que le problème ne soit pas public avant d\'être corrigé.',
    'ct.3t': 'Contribuer', 'ct.3p': 'Code, traductions et documentation sont les bienvenus. Le guide explique comment commencer.',
    'ct.open': 'Ouvrir', 'ct.read': 'Lire le guide',
    'foot.line': 'Sécurité réseau open source pour Windows. Pour les réseaux que vous possédez ou que vous avez le droit d\'auditer.',
    'foot.rel': 'Versions', 'foot.priv': 'Confidentialité', 'foot.terms': 'Conditions d\'utilisation', 'foot.sec': 'Politique de sécurité', 'foot.lic': 'Licence MIT',
    'doc.back': 'Retour à l\'accueil',
    'lost.title': 'Cette page est introuvable.', 'lost.p': 'Le lien est peut-être erroné, ou la page a été déplacée.', 'lost.home': 'Retour à l\'accueil'
  };

  var ALT = {
    en: { dashboard: 'Wifi-Watch dashboard in demo mode', radar: 'Spatial radar of the network', 'soc-wallboard': 'Full-screen SOC wallboard', 'audit-nis2': 'NIS2 and ISO 27001 audit view', 'spy-hunter': 'IoT spy hunter listing two cameras', 'wifi-channels': 'Wi-Fi channel analysis with an Evil Twin alert' },
    fr: { dashboard: 'Tableau de bord Wifi-Watch en mode démo', radar: 'Radar spatial du réseau', 'soc-wallboard': 'Mur SOC plein écran', 'audit-nis2': 'Vue d\'audit NIS2 et ISO 27001', 'spy-hunter': 'Chasseur d\'espions IoT listant deux caméras', 'wifi-channels': 'Analyse des canaux Wi-Fi avec une alerte Evil Twin' }
  };
  var TITLE = {
    en: document.title,
    fr: (document.documentElement.getAttribute('data-title-fr')) || 'Wifi-Watch - Outil gratuit de sécurité Wi-Fi pour Windows'
  };

  var EN = {};
  var nodes = document.querySelectorAll('[data-i18n]');
  nodes.forEach(function (el) { EN[el.getAttribute('data-i18n')] = el.innerHTML; });

  var lang = 'en';
  var currentShot = 'dashboard';
  var $ = function (id) { return document.getElementById(id); };

  function setLang(next) {
    lang = next;
    document.documentElement.lang = next;
    nodes.forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var text = next === 'fr' && FR[key] ? FR[key] : EN[key];
      if (text != null) el.innerHTML = text;
    });
    document.querySelectorAll('.lang button').forEach(function (b) {
      var on = b.dataset.lang === next;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var shot = $('shot');
    if (shot) shot.alt = ALT[next][currentShot];
    document.title = TITLE[next];
    var descFr = document.documentElement.getAttribute('data-desc-fr');
    var meta = document.querySelector('meta[name="description"]');
    if (meta) {
      if (!meta.dataset.en) meta.dataset.en = meta.getAttribute('content');
      meta.setAttribute('content', next === 'fr' && descFr ? descFr : meta.dataset.en);
    }
    try { localStorage.setItem('ww-lang', next); } catch (e) { /* stockage indisponible */ }
    renderRelease();
  }

  document.querySelectorAll('.lang button').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.dataset.lang); });
  });

  // Menu mobile
  var menuBtn = $('menu-btn'), links = $('nav-links');
  function setMenu(open) {
    links.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
  }
  if (menuBtn && links) {
    menuBtn.addEventListener('click', function () { setMenu(!links.classList.contains('open')); });
    links.addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  // Aperçu : onglets
  var shotEl = $('shot');
  if (shotEl) {
    document.querySelectorAll('#shot-tabs button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentShot = btn.dataset.shot;
        shotEl.src = 'assets/' + currentShot + '.webp';
        shotEl.alt = ALT[lang][currentShot];
        document.querySelectorAll('#shot-tabs button').forEach(function (b) {
          b.classList.toggle('on', b === btn);
          b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });
      });
    });
  }

  // Copier la commande de démo
  var copyBtn = $('copy-cmd');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var done = function () {
        copyBtn.textContent = lang === 'fr' ? FR['demo.copied'] : 'Copied';
        setTimeout(function () { copyBtn.textContent = lang === 'fr' ? FR['demo.copy'] : EN['demo.copy']; }, 1600);
      };
      if (navigator.clipboard) navigator.clipboard.writeText($('demo-cmd').textContent).then(done, function () {});
    });
  }

  // Dernière release GitHub : version, taille et téléchargements
  var release = null, totalDownloads = 0;
  function renderRelease() {
    if (!release || !$('rel-version')) return;
    var asset = (release.assets || [])[0];
    var mb = asset ? Math.round(asset.size / 1048576) : 0;
    $('rel-version').textContent = 'Version ' + String(release.tag_name).replace(/^v/, '');
    $('rel-size').textContent = mb ? (lang === 'fr' ? 'environ ' + mb + ' Mo' : 'about ' + mb + ' MB') : '';
    $('rel-count').textContent = totalDownloads >= 50
      ? totalDownloads.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US') + (lang === 'fr' ? ' téléchargements' : ' downloads')
      : '';
  }
  if ($('rel-version')) {
    fetch('https://api.github.com/repos/' + REPO + '/releases?per_page=30', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (list) {
        if (!Array.isArray(list) || !list.length) return;
        release = list.filter(function (r) { return !r.draft && !r.prerelease; })[0] || list[0];
        totalDownloads = list.reduce(function (sum, r) {
          return sum + (r.assets || []).reduce(function (s, a) { return s + (a.download_count || 0); }, 0);
        }, 0);
        renderRelease();
      })
      .catch(function () { /* hors ligne ou limite d'API atteinte : les liens de téléchargement restent valables */ });
  }

  // Apparition douce des sections au défilement
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // Langue initiale : choix mémorisé, sinon langue du navigateur
  var saved = null;
  try { saved = localStorage.getItem('ww-lang'); } catch (e) { /* ignoré */ }
  var initial = saved || ((navigator.language || 'en').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en');
  if (initial !== 'en') setLang(initial);
  else document.querySelectorAll('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lang === 'en' ? 'true' : 'false'); });
})();

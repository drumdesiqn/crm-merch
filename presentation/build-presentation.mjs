import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const body = `
<!-- PAGE 1 : COVER -->
<div class="page cover">
  <span class="badge">PROPOSITION INTERNE — CPM</span>
  <h1>MERCH</h1>
  <p class="subtitle">Une application de terrain pour merchandisers.<br>Du planning à la note de frais — tout au même endroit.</p>
  <div class="stats">
    <div class="stat-item"><div class="val">10+</div><div class="lbl">Fonctionnalités</div></div>
    <div class="stat-item"><div class="val">100%</div><div class="lbl">Mobile first</div></div>
    <div class="stat-item"><div class="val">0</div><div class="lbl">Installation requise</div></div>
  </div>
  <p class="meta" style="margin-top: 32px;">Guillaume Dewez — Merchandiser CPM<br>Juillet 2026</p>
  <p class="foot">Document de présentation — usage interne</p>
</div>

<!-- PAGE 2 : CONTEXTE -->
<div class="page">
  <div class="section-tag">01 — Contexte</div>
  <h2>Le problème aujourd'hui</h2>
  <p class="lead">Le travail administratif d'un merchandiser est éparpillé entre plusieurs outils qui ne communiquent pas.</p>
  <div class="problem-box">
    <h3>Les points de douleur au quotidien</h3>
    <ul>
      <li>Planning reçu en Excel — pas d'accès mobile, pas de navigation intégrée</li>
      <li>Photos de visite stockées dans la galerie du téléphone — perdues, non catégorisées</li>
      <li>Rapports de visite rédigés à la main ou dans un Word, jamais retrouvés</li>
      <li>Notes de frais saisies manuellement dans Excel à la fin du mois — erreurs, oublis</li>
      <li>Pas de vue d'ensemble : kilométrage, taux de complétion, activité par magasin</li>
      <li>Contacts de responsables de rayon éparpillés entre téléphone, mail, papier</li>
      <li>Aucun lien entre une visite, ses photos, ses notes et sa note de frais</li>
    </ul>
  </div>
  <div class="solution-box">
    <h3>La solution : une seule application</h3>
    <ul>
      <li>Centraliser tout le flux de travail — du planning jusqu'à la note de frais</li>
      <li>Pensée mobile d'abord — utilisable en magasin, sur le terrain</li>
      <li>Exports dans les formats existants (Excel CPM, PDF, ZIP) — zéro friction côté destinataire</li>
      <li>Aucune installation — accessible via navigateur sur téléphone, tablette et ordinateur</li>
      <li>Données sécurisées dans le cloud — sauvegardes, accès par compte</li>
    </ul>
  </div>
  <div class="feat-section" style="margin-top: 14px;">
    <div class="feat-title">Le flux de travail couvert</div>
    <div class="flow">
      <span class="flow-step">Import Excel</span><span class="flow-arrow">\u2192</span>
      <span class="flow-step">Organisation tournée</span><span class="flow-arrow">\u2192</span>
      <span class="flow-step">Navigation Waze</span><span class="flow-arrow">\u2192</span>
      <span class="flow-step">Visite &amp; statut</span><span class="flow-arrow">\u2192</span>
      <span class="flow-step">Photos avant/après</span><span class="flow-arrow">\u2192</span>
      <span class="flow-step">Notes &amp; rapport</span><span class="flow-arrow">\u2192</span>
      <span class="flow-step">Note de frais</span><span class="flow-arrow">\u2192</span>
      <span class="flow-step">Export</span>
    </div>
  </div>
  <span class="pagenum">2</span>
</div>

<!-- PAGE 3 : FONCTIONNALITÉS TERRAIN -->
<div class="page">
  <div class="section-tag">02 — Solution</div>
  <h2>Fonctionnalités — Sur le terrain</h2>
  <p class="lead">Tout ce dont un merchandiser a besoin en tournée, optimisé pour le mobile.</p>
  <div class="feat-section">
    <div class="feat-title">Planning &amp; Tournées</div>
    <div class="feat-grid">
      <div class="feat-card"><div class="icon">\u{1F4C5}</div><h3>Planning hebdomadaire</h3><p>Import direct du fichier Excel CPM. Visites organisées par jour, réordonnancées par drag &amp; drop.</p></div>
      <div class="feat-card"><div class="icon">\u{1F5FA}</div><h3>Carte &amp; itinéraires</h3><p>Carte interactive Leaflet, calcul de trajet via OSRM, kilométrage et durée estimés, ordre optimisé.</p></div>
      <div class="feat-card"><div class="icon">\u{1F9ED}</div><h3>Navigation Waze</h3><p>Bouton direct vers Waze pour chaque visite. Départ configurable : magasin précédent ou domicile.</p></div>
      <div class="feat-card"><div class="icon">\u{1F4F6}</div><h3>Mode hors-ligne</h3><p>Changement de statut sans connexion. File d'attente locale, synchronisation auto au retour.</p></div>
    </div>
  </div>
  <div class="feat-section">
    <div class="feat-title">Magasins &amp; Visites</div>
    <div class="feat-grid">
      <div class="feat-card"><div class="icon">\u{1F3EA}</div><h3>Fiches magasins</h3><p>Coordonnées, assortment, type de visite, fréquence, responsable commercial. Recherche et tri.</p></div>
      <div class="feat-card"><div class="icon">\u{1F4DC}</div><h3>Historique par magasin</h3><p>Toutes les visites passées d'un point de vente : photos, notes, statuts — en un coup d'œil.</p></div>
      <div class="feat-card"><div class="icon">\u2705</div><h3>Suivi des visites</h3><p>Statuts : effectuée, en attente, reportée, annulée. Type de matériel posé, remarques par visite.</p></div>
      <div class="feat-card"><div class="icon">\u{1F4F7}</div><h3>Photos avant / après</h3><p>Catégorisation automatique, upload compressé, sélection multiple, partage et export PDF.</p></div>
      <div class="feat-card"><div class="icon">\u{1F4DD}</div><h3>Notes de visite</h3><p>Compte-rendu par visite, ajout rapide depuis le terrain, historique consultable.</p></div>
      <div class="feat-card"><div class="icon">\u{1F465}</div><h3>Contacts</h3><p>Répertoire des responsables de rayon — téléphone, email, organisé par équipe. Appel direct.</p></div>
    </div>
  </div>
  <span class="pagenum">3</span>
</div>

<!-- PAGE 4 : FONCTIONNALITÉS ADMIN -->
<div class="page">
  <div class="section-tag">02 — Solution (suite)</div>
  <h2>Fonctionnalités — Administratif &amp; Intelligence</h2>
  <p class="lead">La paperasse automatisée et un assistant IA — ce qui prend du temps devient un clic.</p>
  <div class="feat-section">
    <div class="feat-title">Notes de frais</div>
    <div class="feat-grid">
      <div class="feat-card"><div class="icon">\u{1F9FE}</div><h3>Saisie en tournée</h3><p>Photo du ticket, montant, date et description — enregistré en quelques secondes sur le terrain.</p></div>
      <div class="feat-card"><div class="icon">\u{1F4CA}</div><h3>Export Excel officiel</h3><p>Génération automatique dans le template Excel CPM (max. 12 notes par export), sans ressaisie.</p></div>
      <div class="feat-card"><div class="icon">\u{1F4E6}</div><h3>Export ZIP complet</h3><p>Excel + PDF + photos justificatives individuelles dans un seul fichier, prêt à envoyer.</p></div>
      <div class="feat-card"><div class="icon">\u2713</div><h3>Suivi des exports</h3><p>Marquage automatique des notes déjà exportées pour éviter les doublons.</p></div>
    </div>
  </div>
  <div class="feat-section">
    <div class="feat-title">Rapports &amp; Exports</div>
    <div class="feat-grid">
      <div class="feat-card"><div class="icon">\u{1F4C4}</div><h3>Rapport de visite PDF</h3><p>Photos catégorisées + notes + infos magasin, généré en un clic, format A4 imprimable.</p></div>
      <div class="feat-card"><div class="icon">\u{1F4DA}</div><h3>Export groupé par semaine</h3><p>Tous les rapports de visite d'une semaine en un seul document PDF.</p></div>
    </div>
  </div>
  <div class="feat-section">
    <div class="feat-title">Analytics &amp; Assistant IA</div>
    <div class="feat-grid">
      <div class="feat-card"><div class="icon">\u{1F4C8}</div><h3>Statistiques</h3><p>Taux de complétion, visites par semaine, kilomètres, photos avant/après, activité par jour.</p></div>
      <div class="feat-card"><div class="icon">\u{1F916}</div><h3>Assistant IA</h3><p>Chat avec GPT-4o, contexte Mars injecté : questions sur les visites, contacts, matériel.</p></div>
      <div class="feat-card"><div class="icon">\u{1F5BC}</div><h3>Médiathèque</h3><p>Toutes les photos regroupées par magasin, favoris, recherche et filtrage.</p></div>
      <div class="feat-card"><div class="icon">\u{1F4D6}</div><h3>Guide matériel</h3><p>Référence visuelle des types de matériel merchandising Mars.</p></div>
    </div>
  </div>
  <span class="pagenum">4</span>
</div>

<!-- PAGE 5 : CAPTURES 1/2 -->
<div class="page">
  <div class="section-tag">03 — Aperçu</div>
  <h2>Captures d'écran — 1/2</h2>
  <p class="lead">Interface mobile réelle — capturée sur l'application en production.</p>
  <div class="shots">
    <div class="shot"><img src="screenshots/dashboard.png" alt="Dashboard" /><div class="caption">Dashboard — prochaine visite, stats, kilométrage</div></div>
    <div class="shot"><img src="screenshots/planning.png" alt="Planning" /><div class="caption">Planning — visites par jour, import Excel</div></div>
  </div>
  <div class="shots" style="margin-top: 12px;">
    <div class="shot"><img src="screenshots/magasins.png" alt="Magasins" /><div class="caption">Fiches magasins — recherche et tri</div></div>
    <div class="shot"><img src="screenshots/notes-de-frais.png" alt="Notes de frais" /><div class="caption">Notes de frais — photo du ticket, export</div></div>
  </div>
  <div class="shots" style="margin-top: 12px;">
    <div class="shot"><img src="screenshots/export.png" alt="Export" /><div class="caption">Export — rapports PDF par visite</div></div>
    <div class="shot"><img src="screenshots/settings.png" alt="Paramètres" /><div class="caption">Paramètres — profil, thème, glossaire</div></div>
  </div>
  <span class="pagenum">5</span>
</div>

<!-- PAGE 6 : CAPTURES 2/2 -->
<div class="page">
  <div class="section-tag">03 — Aperçu (suite)</div>
  <h2>Captures d'écran — 2/2</h2>
  <p class="lead">Photos, statistiques, contacts et assistant IA.</p>
  <div class="shots">
    <div class="shot"><img src="screenshots/photos.png" alt="Photos" /><div class="caption">Médiathèque — photos par magasin, favoris</div></div>
    <div class="shot"><img src="screenshots/analytics.png" alt="Analytics" /><div class="caption">Analytics — graphiques et statistiques</div></div>
  </div>
  <div class="shots" style="margin-top: 12px;">
    <div class="shot"><img src="screenshots/contacts.png" alt="Contacts" /><div class="caption">Contacts — répertoire par équipe</div></div>
    <div class="shot"><img src="screenshots/assistant.png" alt="Assistant" /><div class="caption">Assistant IA — chat avec contexte Mars</div></div>
  </div>
  <span class="pagenum">6</span>
</div>

<!-- PAGE 7 : ARCHITECTURE -->
<div class="page">
  <div class="section-tag">04 — Architecture</div>
  <h2>Architecture technique</h2>
  <p class="lead">Stack moderne, hébergée dans le cloud, pensée pour évoluer.</p>
  <div class="arch-layer">
    <div class="arch-layer-title">Frontend</div>
    <div class="arch-items">
      <div class="arch-item"><span class="tech-name">Next.js 16</span><span class="tech-desc">Framework React — SSR &amp; API routes</span></div>
      <div class="arch-item"><span class="tech-name">TypeScript</span><span class="tech-desc">Typage strict, sécurité du code</span></div>
      <div class="arch-item"><span class="tech-name">Tailwind CSS</span><span class="tech-desc">Design responsive, thème sombre/clair</span></div>
      <div class="arch-item"><span class="tech-name">React Query</span><span class="tech-desc">Cache, synchronisation, optimistic updates</span></div>
    </div>
  </div>
  <div class="arch-layer">
    <div class="arch-layer-title">Backend &amp; API</div>
    <div class="arch-items">
      <div class="arch-item"><span class="tech-name">API Routes Next.js</span><span class="tech-desc">32 endpoints REST sécurisés</span></div>
      <div class="arch-item"><span class="tech-name">JWT</span><span class="tech-desc">Authentification par token</span></div>
      <div class="arch-item"><span class="tech-name">Prisma ORM 7</span><span class="tech-desc">Type-safe database access</span></div>
    </div>
  </div>
  <div class="arch-layer">
    <div class="arch-layer-title">Base de données &amp; Stockage</div>
    <div class="arch-items">
      <div class="arch-item"><span class="tech-name">Neon Postgres</span><span class="tech-desc">PostgreSQL serverless, scalable</span></div>
      <div class="arch-item"><span class="tech-name">Vercel Blob</span><span class="tech-desc">Stockage des photos et justificatifs</span></div>
    </div>
  </div>
  <div class="arch-layer">
    <div class="arch-layer-title">Services intégrés</div>
    <div class="arch-items">
      <div class="arch-item"><span class="tech-name">OpenAI GPT-4o</span><span class="tech-desc">Assistant IA avec contexte Mars</span></div>
      <div class="arch-item"><span class="tech-name">OSRM</span><span class="tech-desc">Calcul d'itinéraires et optimisation</span></div>
      <div class="arch-item"><span class="tech-name">Leaflet</span><span class="tech-desc">Cartes interactives</span></div>
      <div class="arch-item"><span class="tech-name">Waze</span><span class="tech-desc">Navigation en temps réel</span></div>
    </div>
  </div>
  <div class="arch-layer">
    <div class="arch-layer-title">Infrastructure &amp; Déploiement</div>
    <div class="arch-items">
      <div class="arch-item"><span class="tech-name">Vercel</span><span class="tech-desc">Hébergement, déploiement automatique, CDN global</span></div>
      <div class="arch-item"><span class="tech-name">GitHub</span><span class="tech-desc">Versioning, CI/CD</span></div>
      <div class="arch-item"><span class="tech-name">Playwright</span><span class="tech-desc">Tests E2E automatisés (12 scénarios)</span></div>
    </div>
  </div>
  <span class="pagenum">7</span>
</div>

<!-- PAGE 8 : SÉCURITÉ & CONFIGURATION -->
<div class="page">
  <div class="section-tag">05 — Sécurité &amp; Configuration</div>
  <h2>Sécurité et configuration</h2>
  <p class="lead">Données protégées, accès contrôlé, paramétrable par utilisateur.</p>
  <div class="sec-grid" style="margin-bottom: 14px;">
    <div class="sec-card"><div class="icon">\u{1F510}</div><h3>Authentification JWT</h3><p>Connexion par compte et mot de passe. Tokens JWT signés, expiration automatique. Chaque utilisateur ne voit que ses propres données.</p></div>
    <div class="sec-card"><div class="icon">\u{1F6E1}</div><h3>Isolation des données</h3><p>Toutes les requêtes API vérifient l'identité de l'utilisateur. Aucun accès cross-user possible. Mots de passe hachés (bcrypt).</p></div>
    <div class="sec-card"><div class="icon">\u{1F4BE}</div><h3>Sauvegardes</h3><p>Sauvegarde manuelle exportable (JSON). Base de données Neon avec réplication. Photos stockées sur Vercel Blob (CDN, redondance).</p></div>
    <div class="sec-card"><div class="icon">\u{1F310}</div><h3>Hébergement cloud</h3><p>Vercel : CDN global, HTTPS automatique, déploiement continu depuis GitHub. Pas de serveur à maintenir.</p></div>
  </div>
  <div class="feat-section">
    <div class="feat-title">Configuration par utilisateur</div>
    <table class="config-table">
      <tr><th>Paramètre</th><th>Description</th><th>Utilité</th></tr>
      <tr><td class="label">Profil</td><td>Nom, email, zone d'intervention</td><td>Personnalisation du dashboard</td></tr>
      <tr><td class="label">Adresse domicile</td><td>Point de départ des tournées</td><td>Calcul d'itinéraire optimisé</td></tr>
      <tr><td class="label">Adresse retour</td><td>Point d'arrivée optionnel</td><td>Distance totale de la journée</td></tr>
      <tr><td class="label">Thème</td><td>Sombre / clair</td><td>Confort visuel en magasin</td></tr>
      <tr><td class="label">Glossaire</td><td>Termes personnalisés (halfmoon, rack...)</td><td>Vocabulaire Mars pour l'assistant IA</td></tr>
      <tr><td class="label">Mot de passe</td><td>Changement sécurisé</td><td>Autonomie de l'utilisateur</td></tr>
    </table>
  </div>
  <span class="pagenum">8</span>
</div>

<!-- PAGE 9 : ROADMAP & AVENIR -->
<div class="page">
  <div class="section-tag">06 — Avenir</div>
  <h2>Roadmap &amp; évolutions</h2>
  <p class="lead">Ce qui existe déjà, ce qui est en cours et ce qui est envisagé.</p>
  <div class="roadmap-item">
    <div class="roadmap-phase"><span class="phase-tag">En place</span></div>
    <div class="roadmap-content">
      <h3>Application fully functional</h3>
      <p>Planning, magasins, visites, photos, notes de frais, exports Excel/PDF/ZIP, analytics, assistant IA, contacts, hors-ligne. Utilisée au quotidien depuis plusieurs mois.</p>
    </div>
  </div>
  <div class="roadmap-item">
    <div class="roadmap-phase"><span class="phase-tag">En place</span></div>
    <div class="roadmap-content">
      <h3>Multi-utilisateurs</h3>
      <p>Chaque merchandiser a son compte, ses données sont isolées. Prêt pour déploiement à l'équipe.</p>
    </div>
  </div>
  <div class="roadmap-item">
    <div class="roadmap-phase"><span class="phase-tag future">Court terme</span></div>
    <div class="roadmap-content">
      <h3>Vue manager / team lead</h3>
      <p>Vue agrégée pour un responsable d'équipe : suivi des visites de plusieurs merchandisers, statistiques groupées, exports consolidés.</p>
    </div>
  </div>
  <div class="roadmap-item">
    <div class="roadmap-phase"><span class="phase-tag future">Court terme</span></div>
    <div class="roadmap-content">
      <h3>Application mobile native (PWA)</h3>
      <p>Installation sur l'écran d'accueil, notifications push pour les visites du jour, synchronisation en arrière-plan.</p>
    </div>
  </div>
  <div class="roadmap-item">
    <div class="roadmap-phase"><span class="phase-tag idea">Moyen terme</span></div>
    <div class="roadmap-content">
      <h3>Intégration CRM CPM</h3>
      <p>Synchronisation bidirectionnelle avec le CRM existant : import automatique du planning, remontée des rapports de visite.</p>
    </div>
  </div>
  <div class="roadmap-item">
    <div class="roadmap-phase"><span class="phase-tag idea">Moyen terme</span></div>
    <div class="roadmap-content">
      <h3>Reconnaissance photo IA</h3>
      <p>Détection automatique du type de matériel en photo, comparaison avant/après, alertes si mise en place incomplète.</p>
    </div>
  </div>
  <div class="roadmap-item">
    <div class="roadmap-phase"><span class="phase-tag idea">Long terme</span></div>
    <div class="roadmap-content">
      <h3>Tableau de bord management</h3>
      <p>KPIs temps réel : taux de visite par zone, conformité merchandising, temps passé par magasin, heatmap d'activité.</p>
    </div>
  </div>
  <span class="pagenum">9</span>
</div>

<!-- PAGE 10 : BÉNÉFICES & CONCLUSION -->
<div class="page">
  <div class="section-tag">07 — Conclusion</div>
  <h2>Ce que ça apporte concrètement</h2>
  <p class="lead">Des gains simples et mesurables au quotidien.</p>
  <div class="benefit"><div class="num">1</div><div>
    <h3>Moins de temps administratif</h3>
    <p>La note de frais mensuelle passe de la saisie manuelle dans Excel à quelques clics. Les dépenses saisies au fil du mois génèrent automatiquement le document officiel rempli avec les photos justificatives.</p>
  </div></div>
  <div class="benefit"><div class="num">2</div><div>
    <h3>Tout au même endroit</h3>
    <p>Photos, rapports, contacts, planning et notes de frais liés entre eux. Plus de photos perdues dans la galerie du téléphone ni de notes éparpillées entre Excel, papier et mail.</p>
  </div></div>
  <div class="benefit"><div class="num">3</div><div>
    <h3>Utilisable partout, sans installation</h3>
    <p>Application web accessible sur téléphone, tablette et ordinateur. Interface pensée mobile d'abord. Fonctionne même hors connexion.</p>
  </div></div>
  <div class="benefit"><div class="num">4</div><div>
    <h3>Des exports prêts à l'emploi</h3>
    <p>Les destinataires reçoivent des fichiers standards (Excel CPM, PDF, ZIP avec photos). Aucun outil spécifique requis. Le format officiel est respecté.</p>
  </div></div>
  <div class="benefit"><div class="num">5</div><div>
    <h3>Un assistant IA intégré</h3>
    <p>Questions rapides sur la journée, les contacts ou le matériel. L'assistant connaît le contexte Mars et répond instantanément.</p>
  </div></div>
  <div class="benefit"><div class="num">6</div><div>
    <h3>Évolutif et maintenable</h3>
    <p>Stack moderne, code versionné, tests automatisés. L'application évolue selon les besoins réels du terrain — nouvelles fonctionnalités ajoutées rapidement.</p>
  </div></div>
  <div class="closing">
    <p>Je l'utilise tous les jours en tournée.<br><strong>Je serais ravi de vous la montrer en 15 minutes.</strong></p>
  </div>
  <span class="pagenum">10</span>
</div>
`;

const html = fs.readFileSync(path.join(__dirname, "presentation.html"), "utf8");
const updated = html.replace("<body>\n</body>", `<body>\n${body}\n</body>`);
fs.writeFileSync(path.join(__dirname, "presentation.html"), updated);
console.log("Body injected. Total length:", updated.length);

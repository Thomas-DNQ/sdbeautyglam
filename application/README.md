# SD Beauty Glam · Réservation en ligne

Site de réservation premium pour SD Beauty Glam (prothésiste ongulaire, Beauregard Rennes) + espace gérante complet.

## Côté clientes

- **Réservation en 6 étapes** avec prix en direct, transitions animées et confettis à la confirmation
- **Modèles signature** : la cliente touche un modèle (fiche en pop-up), la réservation se pré-remplit
- **Offres automatiques** : formule duo mains + pieds, créneaux flash, −10 % le mois d'anniversaire, codes promo, parrainage, récompenses fidélité (5e et 10e RDV)
- **Upsells** : soin cuticules, strass, chrome, fleur 3D, huile à emporter, dépose + pose, rebooking à 3 semaines
- **Boutique** : cartes cadeaux (30 à 300 €) et packs prépayés avec crédit bonus, solde vérifiable en ligne, utilisables à la réservation
- **Pop-up de bienvenue** avec code promo, **notification** de créneau flash, **bandeau défilant** des offres
- **Liste d'attente** quand aucun créneau ne convient
- **Page « Mon RDV »** : ajout au calendrier (Google / iPhone), annulation en ligne jusqu'à 24 h avant, avis après le RDV
- **Carte de fidélité** et cartes cadeaux consultables sur `/fidelite`
- **Avis clientes** affichés sur l'accueil après validation

## Côté gérante (`/admin`)

- **Aujourd'hui** : chiffres du mois, graphique du chiffre d'affaires, rappels WhatsApp du jour et du lendemain, tout ce qui est à traiter
- **Demandes / Planning** : photo d'inspiration, tarif final, WhatsApp pré-écrit (confirmation, rappel, demande d'avis), acompte, « Terminé » = tampon automatique
- **Dispos** : ouverture des créneaux en 2 clics, passage en flash (⚡), texte de story prêt à copier
- **Offres** : codes promo (%, €, dates, limite d'utilisations), bandeau défilant, pop-up de bienvenue
- **Boutique** : activer les cartes/packs à réception du paiement, envoyer le code par WhatsApp
- **Attente, Avis, Clientes, Réglages** (acompte, moyens de paiement, WhatsApp)

## Emails, factures, paiements

- **Email** demandé à la réservation et à l'achat d'une carte cadeau.
- **Emails automatiques** : demande reçue, confirmation, facture, carte cadeau activée, rappel J-1, demande d'avis, relance remplissage (après X jours), anniversaire. Relances lancées chaque matin par Vercel Cron (`vercel.json`), activables une par une dans l'onglet Emails.
- **Factures** numérotées (FA-2026-0001…) avec mentions micro-entreprise (SIRET, « TVA non applicable, art. 293 B du CGI »), créées dès qu'un RDV ou une carte est réglé, envoyées par email, imprimables en PDF.
- **Encaisser** depuis l'espace gérante : espèces, carte (TPE), Lydia/PayPal, virement, paiement en plusieurs fois, ou **QR code** que la cliente scanne pour payer par carte / Apple Pay / Google Pay.
- **Paiement en ligne** (Stripe) : acompte ou totalité depuis la page « Mon RDV », cartes cadeaux et packs payés et activés automatiquement.

## Module Comptabilité (option payante)

Livre des recettes (export CSV), montant à déclarer à l'URSSAF, cotisations estimées, alertes seuil de TVA et plafond micro-entreprise, dépenses et bénéfice réel.
**Verrouillé par défaut** : il s'active uniquement avec la variable `FEATURE_COMPTA=1` sur Vercel (c'est vous qui décidez). Sans elle, la gérante voit un encart « Option » qui donne envie.
Taux par défaut (modifiables dans Réglages) : 21,2 % de cotisations + 0,3 % CFP artisan. Seuils par défaut : 37 500 € (TVA, à confirmer selon la loi de finances 2026) et 77 700 € (plafond).

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Base Postgres (Neon via Vercel). Sans elle : mode démo |
| `ADMIN_PASSWORD` | Mot de passe de l'espace gérante |
| `RESEND_API_KEY`, `MAIL_FROM` | Envoi réel des emails (ex : `SD Beauty Glam <contact@sdbeautyglam.fr>`, domaine vérifié sur resend.com) |
| `NEXT_PUBLIC_SITE_URL` | Adresse du site, pour les liens dans les emails (ex : https://sdbeautyglam.fr) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Paiement par carte en ligne et QR. Webhook Stripe : `https://votre-site/api/stripe/webhook`, événement `checkout.session.completed` |
| `CRON_SECRET` | Protège la route des relances automatiques |
| `FEATURE_COMPTA` | `1` pour activer le module Comptabilité |

## Mettre en ligne sur Vercel (10 minutes)

1. Créez un dépôt GitHub et envoyez-y ce dossier.
2. vercel.com → **Add New → Project → Import** le dépôt → **Deploy**.
   Le site fonctionne déjà en **mode démo** (mot de passe gérante : `demo`, données d'exemple, rien n'est sauvegardé).
3. Pour passer en réel : projet Vercel → **Storage → Create Database → Neon (Postgres)** → Connect. `DATABASE_URL` est ajoutée automatiquement.
4. **Settings → Environment Variables** : ajoutez `ADMIN_PASSWORD`.
5. **Deployments → Redeploy**. La base se crée toute seule.
6. La gérante ouvre `/admin`, ajoute ses créneaux et ses codes promo, et met le lien du site dans sa bio Instagram.

Optionnel : `RESEND_API_KEY` + `NOTIFY_EMAIL` pour recevoir un email à chaque demande. Domaine perso : Settings → Domains.

## Modifier prix, options, modèles, packs

Tout est dans `lib/catalog.ts`.

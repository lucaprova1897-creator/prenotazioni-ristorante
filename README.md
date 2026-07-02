# Prenotazioni Ristorante — PWA

App per gestire le prenotazioni al telefono in meno di 10 secondi, con una mano. Funziona completamente offline, tutti i dati restano sul telefono.

## Come installarla

L'app va prima messa online su un hosting qualsiasi (anche gratuito), perché le PWA richiedono HTTPS per funzionare offline e per essere installabili.

**Opzioni semplici e gratuite per pubblicarla:**
- [Netlify Drop](https://app.netlify.com/drop) — trascina la cartella, ottieni un link in 10 secondi
- [GitHub Pages](https://pages.github.com/) — se hai familiarità con GitHub
- [Vercel](https://vercel.com/) — simile a Netlify

Una volta online:

**Su iPhone (Safari):**
1. Apri il link dell'app in Safari
2. Tocca l'icona di condivisione (il quadrato con la freccia in su)
3. Scorri e tocca "Aggiungi a Home"
4. L'app appare come icona sulla home, si apre a schermo intero

**Su Android (Chrome):**
1. Apri il link dell'app in Chrome
2. Tocca il menu (i tre puntini in alto a destra)
3. Tocca "Installa app" o "Aggiungi a schermata Home"

Dopo l'installazione l'app funziona offline al 100%, anche in aereo o senza campo.

## Struttura del progetto

```
index.html              Struttura di tutte le schermate
manifest.json            Configurazione PWA (nome, icone, colori)
service-worker.js        Cache offline degli asset
css/
  styles.css              Tutti gli stili (design tokens in cima al file)
js/
  storage.js              Wrapper su localStorage — unico punto di persistenza
  config.js               Parametri configurabili (tavoli, orari, limiti)
  slots.js                Motore di calcolo slot orari e doppio turno
  bookings.js             CRUD prenotazioni, ricerca, statistiche
  utils.js                Helper data/ora condivisi
  ui.js                   Rendering delle schermate
  app.js                  Bootstrap: collega eventi DOM, avvia l'app
icons/
  icon-192.png, icon-512.png   Icone per la home screen
```

## Come modificare i parametri

Tutto è già modificabile dalla schermata **Impostazioni** dentro l'app, senza toccare il codice:
- Numero di tavoli interni/esterni
- Orari di apertura di pranzo e cena
- Durata degli slot e limite massimo di prenotazioni per slot
- Giorni della settimana con doppio turno e durata di occupazione tavolo

## Backup dei dati

I dati vivono solo nel localStorage del browser/app installata su quel telefono. Non c'è sincronizzazione automatica con altri dispositivi o backup su cloud: se cambi telefono o disinstalli l'app, le prenotazioni si perdono.

Se in futuro vuoi un backup o la sincronizzazione tra più telefoni (es. reception + sala), è un'estensione che si può aggiungere — fammi sapere.

## Prossimi sviluppi possibili

Il codice è stato scritto in modo modulare apposta per poter aggiungere in futuro, senza riscrivere nulla:
- Gestione tavoli reale (occupazione per tavolo specifico, non solo conteggio)
- Liste d'attesa
- Esportazione/backup dati
- Sincronizzazione multi-dispositivo

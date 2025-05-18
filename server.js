const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// API-Endpunkt Ihrer bestehenden Slot-API
const SLOT_API_URL = 'https://twitch-slot-api.onrender.com/queue';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: '*' // Erlaubt Anfragen von allen Domains
}));

// Aktuelle Queue als Zwischenspeicher
let slotQueue = [];

// Queue initial laden
async function loadQueue() {
  try {
    const response = await fetch(SLOT_API_URL);
    if (!response.ok) throw new Error('API-Fehler');
    const data = await response.json();
    
    // Filtert leere oder ungültige Einträge
    slotQueue = data.filter(item => 
      item.name !== "$" && 
      item.request !== "Kein Wunsch angegeben" &&
      item.name && item.request
    );
    
    console.log('Queue geladen:', slotQueue);
  } catch (error) {
    console.error('Fehler beim Laden der Queue:', error);
  }
}

// Queue regelmäßig aktualisieren
loadQueue();
setInterval(loadQueue, 60000); // Jede Minute neu laden

// Endpunkt für !sr-Befehl
app.get('/add', async (req, res) => {
  const { name, request } = req.query;
  
  if (!name || !request) {
    return res.status(400).send('Name und Wunsch müssen angegeben werden');
  }
  
  try {
    // Hier würde normalerweise ein POST-Request an Ihre API gehen
    // Da wir aber nur Leserechte haben, simulieren wir das Hinzufügen
    
    // Neuen Eintrag zur lokalen Queue hinzufügen
    slotQueue.push({ name, request });
    
    // Antwort zurückgeben
    res.send(`${name} wurde mit dem Wunsch "${request}" zur Liste hinzugefügt!`);
  } catch (error) {
    console.error('Fehler beim Hinzufügen:', error);
    res.status(500).send('Fehler beim Hinzufügen zur Queue');
  }
});

// Endpunkt für !next-Befehl
app.get('/next', async (req, res) => {
  try {
    // Queue aktualisieren
    await loadQueue();
    
    if (slotQueue.length === 0) {
      return res.send('Die Liste ist leer!');
    }
    
    // Ersten Eintrag entfernen
    const nextItem = slotQueue.shift();
    
    // Antwort zurückgeben
    res.send(`Der nächste Slot wurde aufgerufen: ${nextItem.name} - ${nextItem.request}`);
  } catch (error) {
    console.error('Fehler beim Aufrufen des nächsten Slots:', error);
    res.status(500).send('Fehler beim Aufrufen des nächsten Slots');
  }
});

// Endpunkt für JSON-Daten (für Ihr Overlay)
app.get('/slots.json', (req, res) => {
  res.json(slotQueue);
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});

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
app.use(cors());
// Aktuelle Queue als Zwischenspeicher
let slotQueue = [];
let hasInitialLoad = false;
let isOpen = true; // Status-Variable für geöffnet/geschlossen
// Queue initial laden
async function loadQueue() {
  // Wenn die Queue bereits Einträge hat und nicht die erste Ladung ist, 
  // behalten wir die vorhandene Queue bei
  if (slotQueue.length > 0 && hasInitialLoad) {
    console.log('Queue beibehalten, enthält bereits Einträge:', slotQueue.length);
    return;
  }
  try {
    const response = await fetch(SLOT_API_URL);
    if (!response.ok) throw new Error('API-Fehler');
    const data = await response.json();
    
    // Filtert leere oder ungültige Einträge
    const filteredQueue = data.filter(item => 
      item.name !== "$" && 
      item.request !== "Kein Wunsch angegeben" &&
      item.name && item.request
    );
    
    // Nur ersetzen, wenn die Queue leer ist oder noch keine initiale Ladung erfolgt ist
    if (slotQueue.length === 0 || !hasInitialLoad) {
      slotQueue = filteredQueue;
      hasInitialLoad = true;
    }
    
    console.log('Queue Status:', slotQueue.length > 0 ? 'Enthält Einträge' : 'Leer');
  } catch (error) {
    console.error('Fehler beim Laden der Queue:', error);
  }
}
// Queue initial laden
loadQueue();
// Endpunkt für !sr-Befehl
app.get('/add', async (req, res) => {
  const { name, request } = req.query;
  
  if (!name || !request) {
    return res.status(400).send('Name und Wunsch müssen angegeben werden');
  }
  // Prüfen ob Anfragen geschlossen sind
  if (!isOpen) {
    return res.send('Anfragen sind derzeit geschlossen!');
  }
  
  try {
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
// Endpunkt für !clear-Befehl
app.get('/clear', (req, res) => {
  slotQueue = [];
  res.send('Slot-Liste wurde geleert!');
});
// Endpunkt für !open-Befehl  
app.get('/open', (req, res) => {
  isOpen = true;
  res.send('Anfragen sind jetzt geöffnet!');
});
// Endpunkt für !close-Befehl
app.get('/close', (req, res) => {
  isOpen = false;
  res.send('Anfragen sind jetzt geschlossen!');
});
// Endpunkt für JSON-Daten (für Ihr Overlay)
app.get('/slots.json', (req, res) => {
  res.json({
    slots: slotQueue,
    isOpen: isOpen
  });
});
// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});

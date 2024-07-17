const express = require('express'); // Importiert das Express-Framework
const router = express.Router(); // Erstellt eine neue Router-Instanz von Express
const User = require('../models/User'); // Importiert das User-Modell aus dem angegebenen Pfad
const path = require('path'); // Importiert das Path-Modul von Node.js, um Dateipfade zu handhaben

// Route zum Rendern der Verifizierungsseite
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'verify.html')); // Sendet die verify.html-Datei als Antwort
});

// Route zum Verifizieren der E-Mail
router.post('/', async (req, res) => {
    const { email, verificationKey } = req.body; // Extrahiert die E-Mail und den Verifizierungscode aus dem Request-Body

    console.log('Verifiziere E-Mail:', email);
    console.log('Verifizierungsschlüssel:', verificationKey);

    try {
        // Sucht nach einem Benutzer mit der angegebenen E-Mail und dem Verifizierungscode
        const user = await User.findOne({ email, verificationKey });
        if (!user) { // Wenn kein Benutzer gefunden wird
            console.log('Benutzer nicht gefunden oder ungültiger Verifizierungsschlüssel.');
            return res.status(400).send('Ungültiger Verifizierungscode oder E-Mail.'); 
        }

        user.isVerified = true; // Setzt den Benutzer als verifiziert
        user.verificationKey = null; //  Entfernt den Verifizierungscode
        await user.save(); // Speichert die Änderungen in der Datenbank

        console.log('Benutzer erfolgreich verifiziert:', user);
        // Meldet den Benutzer an, indem die Benutzer-ID in der Sitzung gespeichert wird
        req.session.userId = user._id;

        // Leitet nach erfolgreicher Verifizierung zum Dashboard um
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Fehler bei der Verifizierung:', error); // Fehlerprotokollierung
        res.status(500).send('Fehler bei der Verifizierung.'); // Gibt eine Fehlermeldung zurück
    }
});

module.exports = router; // Exportiert den Router, damit er in anderen Teilen der Anwendung verwendet werden kann

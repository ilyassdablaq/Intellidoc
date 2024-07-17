const express = require('express');
const router = express.Router();
//const bcrypt = require('bcrypt'); // Importiert bcrypt, ein Modul zur Passwort-Hashing
const User = require('../models/User'); // Importiert das User-Modell

router.post('/', async (req, res) => {
    const { email, password } = req.body; // Extrahiert die E-Mail und das Passwort aus dem Request-Body

    try {
        // �berpr�ft, ob der Benutzer existiert
        const user = await User.findOne({ email });
        if (!user) { // Wenn der Benutzer nicht gefunden wird
            return res.status(400).send('Benutzer nicht gefunden'); // Gibt eine Fehlermeldung zur�ck
        }

        // �berpr�ft, ob der Benutzer verifiziert ist
        if (!user.isVerified) { // Wenn der Benutzer nicht verifiziert ist
            return res.redirect('/verify'); // Leitet zur Verifizierungsseite um
        }
        // �berpr�ft das Passwort
        if (password !== user.password) {
            console.log('Passwort stimmt nicht �berein');
            return res.status(400).send('Ung�ltiges Passwort');
        }
        // �berpr�ft das Passwort
        // bcrypt.compare(password, user.password, (err, isMatch) => {
        //  if (err) { 
        //     console.error('Fehler beim Passwortvergleich:', err); 
        //     return res.status(500).send('Fehler beim Login'); 
        //  }

        // Falls das Passwort nicht �bereinstimmt
        //  if (!isMatch) {
        //    console.log('Passwort stimmt nicht �berein');
        //     return res.status(400).send('Ung�ltiges Passwort');
        // }

        // F�gt den Benutzer zur Sitzung hinzu
        req.session.userId = user._id;

        // Leitet zum Dashboard um
        res.redirect('/dashboard');
    }
    catch (error) {
        console.error('Fehler bei der Benutzerauthentifizierung:', error);
        res.status(500).send('Interner Serverfehler');
    }
    
      });

module.exports = router;

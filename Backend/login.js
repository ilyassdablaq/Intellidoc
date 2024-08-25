const express = require('express');
const router = express.Router();
const User = require('../Backend/User'); 


// Author: ilyassdablaq
router.post('/', async (req, res) => {
    const { email, password } = req.body; 

    try {
        // �berpr�ft, ob der Benutzer existiert
        const user = await User.findOne({ email });
        if (!user) { // Wenn der Benutzer nicht gefunden wird
            return res.status(400).send('Benutzer nicht gefunden'); 
        }

        // �berpr�ft, ob der Benutzer verifiziert ist
        if (!user.isVerified) { 
            return res.redirect('/verify'); 
        }
        // �berpr�ft das Passwort
        if (password !== user.password) {
            console.log('Passwort stimmt nicht �berein');
            return res.status(400).send('Ung�ltiges Passwort');
        }

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

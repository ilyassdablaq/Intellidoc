// verifizierung seite beim Registrierung
const express = require('express'); 
const router = express.Router(); 
const User = require('../Backend/User'); 
const path = require('path'); 

// Route zum Rendern der Verifizierungsseite
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'verify.html')); 
});

// Route zum Verifizieren der E-Mail
router.post('/', async (req, res) => {
    const { email, verificationKey } = req.body; 

    console.log('Verifiziere E-Mail:', email);
    console.log('Verifizierungsschlüssel:', verificationKey);

    try {
        // Sucht nach einem Benutzer mit der angegebenen E-Mail und dem Verifizierungscode
        const user = await User.findOne({ email, verificationKey });
        if (!user) {
            console.log('Benutzer nicht gefunden oder ungültiger Verifizierungsschlüssel.');
            return res.status(400).send('Ungültiger Verifizierungscode oder E-Mail.'); 
        }

        user.isVerified = true; 
        user.verificationKey = null; 
        await user.save(); 

        console.log('Benutzer erfolgreich verifiziert:', user);
        // Meldet den Benutzer an, indem die Benutzer-ID in der Sitzung gespeichert wird
        req.session.userId = user._id;

        
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Fehler bei der Verifizierung:', error); 
        res.status(500).send('Fehler bei der Verifizierung.'); 
    }
});

module.exports = router; 
//Ilyass.D

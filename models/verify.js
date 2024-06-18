const express = require('express');
const router = express.Router();
const User = require('../models/User');
const path = require('path');

// Route zum Rendern der Verifizierungsseite
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'verify.html'));
});

// Route zum Verifizieren der E-Mail
router.post('/', async (req, res) => {
    const { email, verificationKey } = req.body;

    console.log('Verifying email:', email);
    console.log('Verification key:', verificationKey);

    try {
        const user = await User.findOne({ email, verificationKey });
        if (!user) {
            console.log('User not found or invalid verification key.');
            return res.status(400).send('Ungültiger Verifizierungscode oder E-Mail.');
        }

        user.isVerified = true;
        user.verificationKey = null; // Optional: Entfernen Sie den Verifizierungscode
        await user.save();

        console.log('User verified successfully:', user);
        // Log the user in by setting the session
        req.session.userId = user._id;

        // Redirect to dashboard after successful verification
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error during verification:', error); // Fehlerprotokollierung
        res.status(500).send('Fehler bei der Verifizierung.');
    }
});

module.exports = router;

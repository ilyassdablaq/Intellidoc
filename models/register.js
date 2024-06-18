const express = require('express');
const router = express.Router();
const User = require('../models/User');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'dalton37@ethereal.email',
        pass: 'aU9wDGmYc6fKxZsQ7T'
    }
});

router.post('/', async (req, res) => {
    const { Name, email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationKey = crypto.randomBytes(16).toString('hex');
        const user = new User({ Name, email, password: hashedPassword, verificationKey, isVerified: false });
        await user.save();

        // E-Mail-Nachricht konfigurieren
        const mailOptions = {
            from: 'dalton37@ethereal.email', // Absenderadresse
            to: email, // Empfängeradresse
            subject: 'Ihr Bestätigungscode für die Registrierung', // Betreffzeile
            text: `Willkommen zu Inttelidoc!\n\nIhr Bestätigungscode lautet: ${verificationKey}` // E-Mail-Text
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Verification email sent: ' + info.response);
        });

        // Weiterleitung zur Verifizierungsseite
        res.redirect('/verify');
    } catch (error) {
        console.error(error); // Fehlerprotokollierung
        res.status(500).send('Error registering user.');
    }
});

module.exports = router;

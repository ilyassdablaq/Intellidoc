const express = require('express');
const router = express.Router();
const User = require('../models/User');
const crypto = require('crypto');
const transporter = require('../models/mailer');


//Passwort voraussetzung
function isPasswordValid(password) {
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    return regex.test(password);
}

router.post('/', async (req, res) => {
    const { Name, email, password } = req.body;

    if (!isPasswordValid(password)) {
        return res.status(400).send('Password must be at least 6 characters long and include both letters and numbers.');
    }

    try {
        const verificationKey = Math.floor(10000 + Math.random() * 90000).toString();
        const user = new User({ Name, email, password, verificationKey, isVerified: false });
        await user.save();

        // E-Mail-Nachricht konfigurieren
        const mailOptions = {
            from: 'dev.intellidoc@gmail.com', // Absenderadresse
            to: email, // Empf�ngeradresse (vom User eingegeben)
            subject: 'Ihr Bestaetigungscode f�r die Registrierung', // Betreffzeile
            html: `<html>
                <head>
                    <meta charset="UTF-8">
                        <title>Best�tigungscode</title>
                </head>
                <body>
                    <h2>Willkommen bei Intellidoc, ${Name}!</h2>
                    <p>Vielen Dank, dass Sie sich bei Intellidoc registriert haben.</p>
                    <p>Um Ihre E-Mail-Adresse zu best�tigen, geben Sie bitte den folgenden Best�tigungscode ein:</p>
                    <h3 style="color: blue;">${verificationKey}</h3>
                    <p>Wenn Sie sich nicht f�r Intellidoc registriert haben, ignorieren Sie bitte diese E-Mail.</p>
                    <br>
                        <p>Mit freundlichen Gr��en,<br>Das Intellidoc-Team</p>
                </body>
            </html>
        `
          
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


        //Ayoub.B
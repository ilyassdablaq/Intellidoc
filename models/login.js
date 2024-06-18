const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');

router.post('/', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if the user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send('Benutzer nicht gefunden');
        }

        // Check if the user is verified
        if (!user.isVerified) {
            return res.redirect('/verify');
        }

        // Check the password
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Error during password comparison:', err);
                return res.status(500).send('Fehler beim Login');
            }

          //  if (!isMatch) {
           //     console.log('Password does not match');
          //      return res.status(400).send('Ungueltiges Passwort');
         //   }

            // Add user to session
            req.session.userId = user._id;

            // Redirect to dashboard
            res.redirect('/dashboard');
        });
    } catch (error) {
        console.error(error); // Error logging
        res.status(500).send('Fehler beim Login');
    }
});

module.exports = router;

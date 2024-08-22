const express = require('express'); 
const router = express.Router();
const User = require('../models/User');
const transporter = require('../models/mailer');
const path = require('path'); // Pfad-Modul hinzugefügt, da es verwendet wird

router.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, '../public/reset.html'));
});

router.post('/request-verification', async (req, res) => {
	const { email } = req.body;
	console.log('Passwort zurücksetzen für E-Mail:', email);
	try {
		const user = await User.findOne({ email });
		if (!user) {
			console.log('Benutzer nicht gefunden');
			return res.status(400).send('Benutzer nicht gefunden');
		}

		const VerificationKey = Math.floor(10000 + Math.random() * 90000).toString();
		user.verificationKey = VerificationKey;
		await user.save();
   
		const mailOptions = {
			from: 'dev.intellidoc@gmail.com',
			to: email,
			subject: 'Passwort zurücksetzen',
			text: `Ihr Verifizierungsschlüssel lautet: ${VerificationKey}`
		};

		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				return console.log(error);
			}
			console.log('Verification email sent: ' + info.response);
			res.redirect('/passwordReset/newPassword');
		});
	} catch (error) {
		console.error('Fehler beim Zurücksetzen des Passworts:', error);
		res.status(500).send('Fehler beim Zurücksetzen des Passworts');
	}
});

router.get('/newPassword', (req, res) => {
	res.sendFile(path.join(__dirname, '../public/newPassword.html'));
});

router.post('/newPassword', async (req, res) => {
	try {
		const { email, verificationKey, newPassword } = req.body;
		const user = await User.findOne({ email });
		if (!user) {
			console.log('Benutzer nicht gefunden');
			return res.status(400).send('Benutzer nicht gefunden');
		}
		if (verificationKey !== user.verificationKey) {
			console.log('Ungültiger Verifizierungsschlüssel');
			return res.status(400).send('Ungültiger Verifizierungsschlüssel');
		}
		user.password = newPassword;
		user.verificationKey = null;
		await user.save();
		res.status(200).send('Passwort erfolgreich zurückgesetzt. Sie werden zur Login-Seite weitergeleitet.');
	} catch (error) {
		console.error('Fehler beim Zurücksetzen des Passworts:', error);
		res.status(500).send('Fehler beim Zurücksetzen des Passworts');
	}
});

module.exports = router;

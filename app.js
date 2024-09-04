const express = require('express');
const app = express();
const { connectDB } = require('./Datenbank/MongoDB');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const PORT = process.env.PORT || 3000;
const registerUserRouter = require('./Backend/register');
const loginRouter = require('./Backend/login');
const verifyRoute = require('./Backend/verify');
const dashboardRoute = require('./Backend/dashboard');
const passwordResetRoute = require('./Backend/passwordReset');


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'Frontend')));

// MongoDB-Verbindung herstellen
connectDB();
// Sitzung konfigurieren
app.use(session({
    secret: 'your_secret_key', // Ändere das zu einem sicheren Schlüssel
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Setze auf true, wenn du HTTPS verwendest
}));

// Route für die Startseite
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Frontend', 'Html', 'landingPage.html'));
});
// Route for the login und register page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'Frontend', 'Html', 'login.html'));
});
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'Frontend', 'Html', 'register.html'));
});


// Route für die Registrierungsformularübermittlung
app.use('/register', registerUserRouter);
app.use('/login', loginRouter);
app.use('/verify', verifyRoute);
app.use('/dashboard', dashboardRoute);
app.use('/passwordReset', passwordResetRoute);
// Route zum Ausloggen
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Unable to logout');
        }
        res.redirect('/');
    });
});

app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});

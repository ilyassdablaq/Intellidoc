const express = require('express');
const app = express();
const { connectDB } = require('./MongoDB');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const PORT = process.env.PORT || 3000;
const registerUserRouter = require('./models/register');
const loginRouter = require('./models/login');
const verifyRoute = require('./models/verify');
const dashboardRoute = require('./models/dashboard');


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB-Verbindung herstellen
connectDB();
// Sitzung konfigurieren
app.use(session({
    secret: 'your_secret_key', // �ndere das zu einem sicheren Schl�ssel
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Setze auf true, wenn du HTTPS verwendest
}));

// Route f�r die Startseite
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'landingPage.html'));
});
// Route for the login und register page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/register.html'));
});

// Route f�r die Registrierungsformular�bermittlung
app.use('/register', registerUserRouter);
app.use('/login', loginRouter);
app.use('/verify', verifyRoute);
app.use('/dashboard', dashboardRoute);
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
    console.log(`Server l�uft auf Port ${PORT}`);
});

const mongoose = require('mongoose');

//Passwort und Datenbankname sind in der URI enthalten
const MONGO_URI = 'mongodb+srv://ayoub1:8WPMMNrdmWHPPwW7@cluster1.iiijeao.mongodb.net/test?retryWrites=true&w=majority'

// MongoDB-Verbindung herstellen
const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
           
        });
        console.log('MongoDB verbunden...');
        // Beenden Sie den Prozess mit Fehlercode 
    } catch (err) {
        console.error('Fehler bei der MongoDB-Verbindung:', err.message);
        
    } 
    
};

module.exports = { connectDB };
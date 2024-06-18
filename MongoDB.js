const mongoose = require('mongoose');

//Passwort und Datenbankname sind in der URI enthalten
const MONGO_URI = 'mongodb+srv://ilyassdablaq:5tqSPqaaw5Vowv6x@cluster0.zv9mntu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

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
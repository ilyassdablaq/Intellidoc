const express = require('express'); // Importiert das Express-Framework
const router = express.Router(); // Erstellt eine neue Router-Instanz von Express
const multer = require('multer'); // Importiert Multer, ein Middleware-Tool für das Hochladen von Dateien
const fs = require('fs'); // Importiert das Dateisystemmodul von Node.js, um mit dem Dateisystem zu arbeiten
const path = require('path'); // Importiert das Path-Modul von Node.js, um Dateipfade zu handhaben
const tesseract = require('tesseract.js'); // Importiert Tesseract.js, eine OCR-Bibliothek, um Text aus Bildern zu extrahieren
const User = require('../models/User'); // Importiert das User-Modell aus dem angegebenen Pfad
const { PDFDocument, rgb } = require('pdf-lib'); // Importiert PDF-lib, um PDF-Dokumente zu erstellen und zu bearbeiten, sowie die rgb-Funktion für Farbangaben

// Middleware, um zu überprüfen, ob der Benutzer authentifiziert ist
async function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) { // Überprüft, ob eine Sitzung existiert und ob die userId in der Sitzung gespeichert ist
        try {
            const user = await User.findById(req.session.userId); // Versucht, den Benutzer mit der gespeicherten userId aus der Datenbank zu finden
            if (!user) { // Wenn kein Benutzer gefunden wird
                return res.redirect('/login'); // Leitet zur Login-Seite um
            }
            req.user = user; // Setzt das Benutzerobjekt auf die req (Request) für den weiteren Gebrauch
            return next(); // Fährt mit der nächsten Middleware oder Route fort
        } catch (error) {
            console.error('Fehler beim Abrufen des Benutzers:', error); // Loggt einen Fehler, wenn einer auftritt
            return res.redirect('/login'); // Leitet zur Login-Seite um
        }
    } else {
        return res.redirect('/login'); // Leitet zur Login-Seite um, wenn keine Sitzung oder userId vorhanden ist
    }
}
// Sicherstellen, dass das Upload-Verzeichnis existiert
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer für Datei-Uploads einrichten
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Verwendet das gesicherte Upload-Verzeichnis
    },
    filename: function (req, file, cb) {
        // Verwendet den ursprünglichen Dateinamen
        cb(null, req.user._id + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });
// Route für die Startseite des Dashboards
router.get('/', isAuthenticated, (req, res) => {
    res.sendFile('dashboard.html', { root: './public' });
});

// Route zum Hochladen von Dokumenten
//router.post('/upload', isAuthenticated, upload.single('file'), (req, res) => {
 //   console.log(`Datei hochgeladen nach: ${req.file.path}`);
 //   res.send('Datei erfolgreich hochgeladen');
//});
router.post('/upload', isAuthenticated, upload.single('file'), async (req, res) => {
    console.log(`Datei hochgeladen nach: ${req.file.path}`);

    try {
        res.send('Datei erfolgreich hochgeladen ');
    } catch (error) {
        console.error(`Fehler beim Hochladen der Datei: ${error}`);
        res.status(500).send('Fehler beim Hochladen der Datei');
    }
});

// Route zum Herunterladen von Dokumenten
router.get('/download/:filename', isAuthenticated, (req, res) => {
    const file = path.join(uploadDir, req.params.filename);
    res.download(file, (err) => {
        if (err) {
            console.error(`Fehler beim Herunterladen der Datei: ${err}`);
            res.status(500).send('Fehler beim Herunterladen der Datei');
        }
    });
});

// Route zum Auflisten hochgeladener Dokumente
router.get('/files', isAuthenticated, (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error(`Fehler beim Lesen der Dateien: ${err}`);
            return res.status(500).send('Fehler beim Scannen der Dateien');
        }
        // vllt hier gibt es ein Problem warum nach dem umbenenen datei verschwindet
        const userFiles = files.filter(file => file.startsWith(req.user._id + '-'));
        res.json(userFiles);
    });
});



// Route zum Durchführen von OCR auf Bildern und Speichern als PDF
router.post('/ocr', isAuthenticated, upload.single('image'), (req, res) => {
    const filePath = req.file.path;
    tesseract.recognize(filePath, 'eng', {
        logger: m => console.log(m),
    }).then(async ({ data: { text } }) => {
        try {
            // Erstellt ein neues PDF-Dokument
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage();

            // Setzt die Schriftart und Größe des Textes
            const fontSize = 12;
            const textWidth = page.getWidth() - 2 * 20;
            const textHeight = page.getHeight() - 2 * 20;

            // Teilt den Text in Zeilen, die in die Seitenbreite passen
            const lines = text.split('\n');
            let y = textHeight + 20;
            const lineHeight = fontSize * 1.2;

            lines.forEach((line) => {
                y -= lineHeight;
                page.drawText(line, {
                    x: 20,
                    y: y,
                    size: fontSize,
                    color: rgb(0, 0, 0),
                });
            });

            // Serialisiert das PDF-Dokument zu Bytes (ein Uint8Array)
            const pdfBytes = await pdfDoc.save();

            // Speichert das PDF in einer Datei
            const pdfFilePath = path.join(uploadDir, `${req.user._id}-${Date.now()}-ocr.pdf`);
            fs.writeFileSync(pdfFilePath, pdfBytes);

            // Löscht die hochgeladene Bilddatei
           // fs.unlinkSync(filePath);

            // Antwortet mit dem Pfad zur gespeicherten PDF
            res.download(pdfFilePath, 'ocr-result.pdf', (err) => {
                if (err) {
                    console.error(`Fehler beim Senden der PDF: ${err}`);
                    res.status(500).send('Fehler beim Senden der PDF');
                }
            });
        } catch (err) {
            console.error(`Fehler beim Erstellen der PDF: ${err}`);
            res.status(500).send('Fehler beim Erstellen der PDF');
        }
    }).catch(err => {
        console.error(`Fehler bei der Bildverarbeitung: ${err}`);
        res.status(500).send('Fehler bei der Bildverarbeitung');
    });
});
// Route zum Löschen eines Dokuments
router.delete('/delete/:filename', isAuthenticated, (req, res) => {
    const file = path.join(uploadDir, req.params.filename);
    fs.unlink(file, (err) => {
        if (err) {
            console.error(`Fehler beim Löschen der Datei: ${err}`);
            return res.status(500).send('Fehler beim Löschen der Datei');
        }
        res.send('Datei erfolgreich gelöscht');
    });
});
// Route zum Umbenennen eines Dokuments
router.post('/rename', isAuthenticated, (req, res) => {
    const { oldFilename, newFilename } = req.body;
    const oldFilePath = path.join(uploadDir, oldFilename);
    const newFilePath = path.join(uploadDir, req.user._id + '-' + newFilename);

    fs.rename(oldFilePath, newFilePath, (err) => {
        if (err) {
            console.error(`Fehler beim Umbenennen der Datei: ${err}`);
            return res.status(500).send('Fehler beim Umbenennen der Datei');
        }
        res.send('Datei erfolgreich umbenannt');
    });
});
// Route zum Ausloggen
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error(`Fehler beim Ausloggen: ${err}`);
            return res.status(500).send('Abmelden nicht möglich');
        }
        res.redirect('/');
    });
});



module.exports = router;

const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('../Backend/User');
const Document = require('../Backend/Document');
const tesseract = require('tesseract.js'); 
const { PDFDocument, rgb } = require('pdf-lib');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Middleware, um zu überprüfen, ob der Benutzer authentifiziert ist
async function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        try {
            const user = await User.findById(req.session.userId);
            if (!user) {
                return res.redirect('/login');
            }
            req.user = user;
            return next();
        } catch (error) {
            console.error('Fehler beim Abrufen des Benutzers:', error);
            return res.redirect('/login');
        }
    } else {
        return res.redirect('/login');
    }
}

// Author: ilyassdablaq
// Sicherstellen, dass das Upload-Verzeichnis existiert
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer für Datei-Uploads einrichten (im Arbeitsspeicher speichern)
const storage = multer.memoryStorage();  // Nutze memoryStorage statt diskStorage
const upload = multer({ storage: storage });

// Route für die Startseite des Dashboards
router.get('/', isAuthenticated, (req, res) => {
    res.sendFile('dashboard.html', { root: './Frontend/Html' });
});

// Route zum Hochladen von Dokumenten
router.post('/upload', isAuthenticated, upload.single('file'), async (req, res) => {
    try {
        const { originalname, mimetype, buffer } = req.file;

        // Dokument in MongoDB speichern
        const document = new Document({
            userId: req.user._id,
            filename: originalname,
            contentType: mimetype,
            fileData: buffer
        });
        await document.save();

        res.json({ message: 'Datei erfolgreich hochgeladen' });
    } catch (error) {
        console.error(`Fehler beim Hochladen der Datei: ${error}`);
        res.status(500).send('Fehler beim Hochladen der Datei');
    }
});

// Route zum Herunterladen von Dokumenten
router.get('/download/:filename', isAuthenticated, async (req, res) => {
    try {
        const document = await Document.findOne({ userId: req.user._id, filename: req.params.filename });

        if (!document) {
            return res.status(404).send('Datei nicht gefunden');
        }

        res.set({
            'Content-Type': document.contentType,
            'Content-Disposition': `attachment; filename="${document.filename}"`
        });

        res.send(document.fileData);
    } catch (error) {
        console.error(`Fehler beim Herunterladen der Datei: ${error}`);
        res.status(500).send('Fehler beim Herunterladen der Datei');
    }
});

// Route zum Auflisten hochgeladener Dokumente
router.get('/files', isAuthenticated, async (req, res) => {
    try {
        const documents = await Document.find({ userId: req.user._id });
        res.json(documents.map(doc => doc.filename));
    } catch (error) {
        console.error(`Fehler beim Auflisten der Dateien: ${error}`);
        res.status(500).send('Fehler beim Auflisten der Dateien');
    }
});


// Author: ilyassdablaq
// Route zum Löschen eines Dokuments
router.delete('/delete/:filename', isAuthenticated, async (req, res) => {
    try {
        const document = await Document.findOneAndDelete({ userId: req.user._id, filename: req.params.filename });

        if (!document) {
            return res.status(404).send('Datei nicht gefunden');
        }

        res.send('Datei erfolgreich gelöscht');
    } catch (error) {
        console.error(`Fehler beim Löschen der Datei: ${error}`);
        res.status(500).send('Fehler beim Löschen der Datei');
    }
});


// Author: ilyassdablaq
// Route zum Umbenennen eines Dokuments
router.post('/rename', isAuthenticated, async (req, res) => {
    const { oldFilename, newFilename } = req.body;

    try {
        const document = await Document.findOne({ userId: req.user._id, filename: oldFilename });

        if (!document) {
            return res.status(404).send('Datei nicht gefunden');
        }

        document.filename = newFilename;
        await document.save();

        res.send('Datei erfolgreich umbenannt');
    } catch (error) {
        console.error(`Fehler beim Umbenennen der Datei: ${error}`);
        res.status(500).send('Fehler beim Umbenennen der Datei');
    }
});
// Author: ilyassdablaq
// Route zum Vorschau Fenster
router.get('/preview/:filename', isAuthenticated, async (req, res) => {
    try {
        const document = await Document.findOne({ userId: req.user._id, filename: req.params.filename });

        if (!document) {
            return res.status(404).send('Datei nicht gefunden');
        }

        res.set({
            'Content-Type': document.contentType,
            'Content-Disposition': `inline; filename="${document.filename}"`
        });

        res.send(document.fileData);
    } catch (error) {
        console.error(`Fehler beim Laden der Vorschau: ${error}`);
        res.status(500).send('Fehler beim Laden der Vorschau');
    }
});


// Author: ilyassdablaq
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
// Author: ilyassdablaq
// Route zum Durchführen von OCR auf Bildern und Speichern als PDF und PNG
router.post('/ocr', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        const originalNameWithoutExt = path.parse(req.file.originalname).name; // Originalname ohne Erweiterung
        const buffer = req.file.buffer;

        // OCR-Prozess
        const { data: { text } } = await tesseract.recognize(buffer, 'eng', {
            logger: m => console.log(m),
        });

        // PDF-Dokument erstellen
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();

        const fontSize = 12;
        const textWidth = page.getWidth() - 2 * 20;
        const textHeight = page.getHeight() - 2 * 20;

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

        // PDF-Datei speichern
        const pdfBytes = await pdfDoc.save();

        // PNG-Version des Originalbilds erstellen
        const pngBuffer = await sharp(buffer).png().toBuffer();

        // PDF-Datei in MongoDB speichern
        const pdfDocument = new Document({
            userId: req.user._id,
            filename: `${originalNameWithoutExt}.pdf`,
            contentType: 'application/pdf',
            fileData: Buffer.from(pdfBytes)
        });
        await pdfDocument.save();

        // PNG-Datei in MongoDB speichern
        const pngDocument = new Document({
            userId: req.user._id,
            filename: `${originalNameWithoutExt}.png`,
            contentType: 'image/png',
            fileData: pngBuffer
        });
        await pngDocument.save();

        // Antwort an den Benutzer zurückgeben
        res.json({ message: 'OCR erfolgreich durchgeführt und Dateien gespeichert' });
    } catch (err) {
        console.error(`Fehler bei der Bildverarbeitung: ${err}`);
        res.status(500).send('Fehler bei der Bildverarbeitung');
    }
});

module.exports = router;

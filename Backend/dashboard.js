const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const tesseract = require('tesseract.js');
const User = require('../Backend/User');
const { PDFDocument, rgb } = require('pdf-lib');

// Author: ilyassdablaq
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

// Author: ilyassdablaq
// Multer für Datei-Uploads einrichten
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, req.user._id + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Author: ilyassdablaq
// Route für die Startseite des Dashboards
router.get('/', isAuthenticated, (req, res) => {
    res.sendFile('dashboard.html', { root: './Frontend' });
});

// Author: ilyassdablaq
// Route zum Hochladen von Dokumenten
router.post('/upload', isAuthenticated, upload.single('file'), async (req, res) => {
    console.log(`Datei hochgeladen nach: ${req.file.path}`);

    try {
        res.send('Datei erfolgreich hochgeladen');
    } catch (error) {
        console.error(`Fehler beim Hochladen der Datei: ${error}`);
        res.status(500).send('Fehler beim Hochladen der Datei');
    }
});


// Author: ilyassdablaq
// Route zum Herunterladen von Dokumenten
router.get('/download/:filename', isAuthenticated, (req, res) => {
    const decodedFilename = decodeURIComponent(req.params.filename);
    const fileWithId = `${req.user._id}-${decodedFilename}`;
    const filePath = path.join(uploadDir, fileWithId);

    console.log(`Decoded filename: ${decodedFilename}`);
    console.log(`Final file path for download: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error('Datei nicht gefunden:', filePath);
        return res.status(404).send('Datei nicht gefunden');
    }

    res.download(filePath, (err) => {
        if (err) {
            console.error(`Fehler beim Herunterladen der Datei: ${err}`);
            res.status(500).send('Fehler beim Herunterladen der Datei');
        }
    });
});

// Author: ilyassdablaq
// Route zum Auflisten hochgeladener Dokumente
router.get('/files', isAuthenticated, (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error(`Fehler beim Lesen der Dateien: ${err}`);
            return res.status(500).send('Fehler beim Scannen der Dateien');
        }
        // Entfernen der Benutzer-ID aus den Dateinamen
        const userFiles = files.filter(file => file.startsWith(req.user._id + '-'))
            .map(file => file.replace(req.user._id + '-', ''));
        res.json(userFiles);
    });
});



// Author: ilyassdablaq
// Route zum Löschen eines Dokuments
router.delete('/delete/:filename', isAuthenticated, (req, res) => {
    // Benutzer-ID hinzufügen, um den vollständigen Dateinamen zu erhalten
    const filenameWithId = `${req.user._id}-${req.params.filename}`;
    const file = path.join(uploadDir, filenameWithId);

    fs.unlink(file, (err) => {
        if (err) {
            console.error(`Fehler beim Löschen der Datei: ${err}`);
            return res.status(500).send('Fehler beim Löschen der Datei');
        }
        res.send('Datei erfolgreich gelöscht');
    });
});

// Author: ilyassdablaq
// Route zum Umbenennen eines Dokuments
router.post('/rename', isAuthenticated, (req, res) => {
    const { oldFilename, newFilename } = req.body;
    const oldFilePath = path.join(uploadDir, `${req.user._id}-${oldFilename}`);
    const newFilePath = path.join(uploadDir, `${req.user._id}-${newFilename}`);

    fs.rename(oldFilePath, newFilePath, (err) => {
        if (err) {
            console.error(`Fehler beim Umbenennen der Datei: ${err}`);
            return res.status(500).send('Fehler beim Umbenennen der Datei');
        }

        // Verzögerung von 100 ms
        setTimeout(() => {
            res.send('Datei erfolgreich umbenannt');
        }, 100);
    });
});


// Author: ilyassdablaq
// Route zum Vorschau Fenster
router.get('/preview/:filePath', (req, res) => {
    const filePath = decodeURIComponent(req.params.filePath);
    const absolutePath = path.join(uploadDir, filePath);

    console.log(`Preview requested for: ${absolutePath}`); // Debugging line

    if (fs.existsSync(absolutePath)) {
        res.sendFile(absolutePath);
    } else {
        console.error(`File not found: ${absolutePath}`);
        res.status(404).send('Datei nicht gefunden');
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
module.exports = router;

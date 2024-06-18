const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const tesseract = require('tesseract.js');
const User = require('../models/User'); 
const { PDFDocument, rgb } = require('pdf-lib'); //ocr zu pdf umwandeln 

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Use the ensured upload directory
    },
    filename: function (req, file, cb) {
        // Use user ID in the filename
        cb(null, req.user._id + '-' + Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Middleware to check if user is authenticated
async function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        try {
            const user = await User.findById(req.session.userId);
            if (!user) {
                return res.redirect('/login');
            }
            req.user = user; // Set the user object on the req
            return next();
        } catch (error) {
            console.error('Error fetching user:', error);
            return res.redirect('/login');
        }
    } else {
        return res.redirect('/login');
    }
}

// Route for dashboard home page
router.get('/', isAuthenticated, (req, res) => {
    res.sendFile('dashboard.html', { root: './public' });
});

// Route for uploading documents
router.post('/upload', isAuthenticated, upload.single('file'), (req, res) => {
    console.log(`File uploaded to: ${req.file.path}`);
    res.send('File uploaded successfully');
});

// Route for downloading documents
router.get('/download/:filename', isAuthenticated, (req, res) => {
    const file = path.join(uploadDir, req.params.filename);
    res.download(file, (err) => {
        if (err) {
            console.error(`Error downloading file: ${err}`);
            res.status(500).send('Error downloading file');
        }
    });
});

// Route for listing uploaded documents
router.get('/files', isAuthenticated, (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error(`Error reading files: ${err}`);
            return res.status(500).send('Unable to scan files');
        }
        const userFiles = files.filter(file => file.startsWith(req.user._id + '-'));
        res.json(userFiles);
    });
});


// Route for performing OCR on images and saving as PDF
router.post('/ocr', isAuthenticated, upload.single('image'), (req, res) => {
    const filePath = req.file.path;
    tesseract.recognize(filePath, 'eng', {
        logger: m => console.log(m),
    }).then(async ({ data: { text } }) => {
        try {
            // Create a new PDFDocument
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage();

            // Set the text font and size
            const fontSize = 12;
            const textWidth = page.getWidth() - 2 * 20;
            const textHeight = page.getHeight() - 2 * 20;

            // Split the text into lines that fit the page width
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

            // Serialize the PDFDocument to bytes (a Uint8Array)
            const pdfBytes = await pdfDoc.save();

            // Save the PDF to a file
            const pdfFilePath = path.join(uploadDir, `${req.user._id}-${Date.now()}-ocr.pdf`);
            fs.writeFileSync(pdfFilePath, pdfBytes);

            // Delete the uploaded image file
            fs.unlinkSync(filePath);

            // Respond with the path to the saved PDF
            res.download(pdfFilePath, 'ocr-result.pdf', (err) => {
                if (err) {
                    console.error(`Error sending PDF: ${err}`);
                    res.status(500).send('Error sending PDF');
                }
            });
        } catch (err) {
            console.error(`Error creating PDF: ${err}`);
            res.status(500).send('Error creating PDF');
        }
    }).catch(err => {
        console.error(`Error processing image: ${err}`);
        res.status(500).send('Error processing image');
    });
});

// Route for logging out
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error(`Error logging out: ${err}`);
            return res.status(500).send('Unable to logout');
        }
        res.redirect('/');
    });
});

module.exports = router;

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'dev.intellidoc@gmail.com', //dalton37@ethereal.email
        pass: 'rdqs tfnt idfq unbr '
    }
    });
 module.exports = transporter;
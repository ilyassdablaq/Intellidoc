const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
    Name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    verificationKey: {
        type: String,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
});


const User = mongoose.model('User', userSchema);

module.exports = User;

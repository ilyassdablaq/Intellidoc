const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    filename: { type: String, required: true },
    text: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', CommentSchema);

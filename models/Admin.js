const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    chatId : {
        type: Number,
        required: true,
        unique: true
    }
});

module.exports = mongoose.model("Admin", AdminSchema);
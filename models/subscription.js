// Import Mongoose
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define a schema for the subscription object
const subscriptionSchema = new Schema({
    userID: String,
    endpoint: String,
    expirationTime:String,
    keys: {
        auth:String,
        p256dh:String
    }
});

// Create a Mongoose model for the subscription object
const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;

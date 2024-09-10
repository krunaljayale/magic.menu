const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const HistorySchema = new Schema({
    customername:String,
    mob_number:Number,
    name : String,
    price:Number,
    qty:Number,
    owner:String,
    tableno:Number,
    created_at:String,
    confirmed_at :String,
    customerId:String,
    status:String,
    paid_at:String,
});

const History = mongoose.model("History", HistorySchema);
module.exports = History;
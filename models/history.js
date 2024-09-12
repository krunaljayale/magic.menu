const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const HistorySchema = new Schema({
    customername:String,
    mob_number:Number,
    invoice:Number,
    name : String,
    price:Number,
    qty:Number,
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    tableno:Number,
    created_at:String,
    confirmed_at :String,
    customerId:String,
    status:String,
    paid_date:String,
    paid_time:String,
});

const History = mongoose.model("History", HistorySchema);
module.exports = History;
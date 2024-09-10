const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CurrentOrdersSchema = new Schema({
    customername:String,
    mob_number:Number,
    name : String,
    image :{
        url:String,
        filename:String,
    },
    price:Number,
    qty:Number,
    owner:String,
    tableno:Number,
    created_at :String,
    confirmed_at :String,
    customerId:String,
    status:String
});

const CurrentOrders = mongoose.model("CurrentOrders", CurrentOrdersSchema);
module.exports = CurrentOrders;
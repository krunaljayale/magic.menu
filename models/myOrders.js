const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const myOrdersSchema = new Schema({
    personName:String,
    name : String,
    image :{
        url:String,
        filename:String,
    },
    price:Number,
    qty:Number,
    created_at :Date,
    customerId:String,
});

const myOrders = mongoose.model("myOrders", myOrdersSchema);
module.exports = myOrders;
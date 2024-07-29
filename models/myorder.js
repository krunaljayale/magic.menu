const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MyOrdersSchema = new Schema({
    customername:String,
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
    customerId:String,
    status:String
});

const MyOrders = mongoose.model("MyOrders", MyOrdersSchema);
module.exports = MyOrders;
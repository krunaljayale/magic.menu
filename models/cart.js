const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cartSchema = new Schema({
    name : String,
    info : String,
    image : {
        url:String,
        filename:String,
    },
    price:Number,
    customerId:String,
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User"
    }
});

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
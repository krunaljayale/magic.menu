const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const listingSchema = new Schema({
    name : String,
    info : String,
    image :{
        url:String,
        filename:String,
    },
    price:Number,
    category:String,
    subcategory:String,
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    promote:String,
});



listingSchema.index({ name: 'text' });
listingSchema.index({ category: 1, subcategory: 1 });
listingSchema.index({ owner: 1 });


const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tableSchema = new Schema({
    status:String,
    substatus:String,
    number:Number,
    owner:String,
    user:String, 
    customername:String, 
    mob_number:Number
});

const Table = mongoose.model("Table", tableSchema);
module.exports = Table;
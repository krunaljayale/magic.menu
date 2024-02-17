const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require ("../models/listing.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/cafe";

async function main(){
    await mongoose.connect(MONGO_URL);
};

main().then(()=>{
    console.log("connected to DB");
}).catch((err)=>{
    console.log("Some error in DB");
})

const initDB = async ()=>{
    await Listing.deleteMany({});
    initData.data = initData.data.map((obj) =>(
        {...obj, owner:"65c39ef26627765c3f780418"}
    ));
    await Listing.insertMany(initData.data);
    console.log("Data was initialised");
};

initDB();
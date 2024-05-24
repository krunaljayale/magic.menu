const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require ("../models/listing.js");
const User = require("../models/user.js");

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
        {...obj, owner:"66030c1767710fa99b3ef911",promote:"No"}
    ));
    await Listing.insertMany(initData.data);


    
    // let newUser = await User.find({username:"Krunal Jayale"});
    // newUser.hotelname = "Inspire Foods"
    console.log("Data was initialised");
};

initDB();
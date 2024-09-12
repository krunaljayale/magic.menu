const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require ("../models/listing.js");
const User = require("../models/user.js");
const History = require("../models/history.js");
const Cart = require("../models/cart.js");

const MONGO_URL = "mongodb+srv://magicmenuin:a2axeqa7px@magicmenu.lc8zcpg.mongodb.net/?retryWrites=true&w=majority&appName=MagicMenu";
// const dbUrl = "mongodb+srv://buisnessteamtop5:a2axeqa7px@magicmenu.iatnpxk.mongodb.net/?retryWrites=true&w=majority&appName=Magicmenu";

async function main(){
    await mongoose.connect(MONGO_URL);
};

main().then(()=>{
    console.log("connected to DB");
}).catch((err)=>{
    console.log("Some error in DB");
    console.log(err)
});

const initDB = async ()=>{
    // await Listing.deleteMany({});
    // initData.data = initData.data.map((obj) =>(
    //     {...obj, owner:"66aa63b4742a4c5aedded9b3",promote:"No",category:"Veg"}
    // ));
    // await Listing.insertMany(initData.data);


    
    // // let newUser = await User.find({username:"Krunal Jayale"});
    // // newUser.hotelname = "Inspire Foods"
    // console.log("Data was initialised");

    const order = await History.findById('66e176eeeaffd2b0b179a650');
    console.log(order.paid_date);
    
};


initDB();
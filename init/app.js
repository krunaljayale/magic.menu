const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require ("../models/listing.js");
const User = require("../models/user.js");
const History = require("../models/history.js");
const Cart = require("../models/cart.js");
const CurrentOrders = require("../models/currentorders.js");

// const MONGO_URL = "mongodb+srv://magicmenuin:a2axeqa7px@magicmenu.lc8zcpg.mongodb.net/?retryWrites=true&w=majority&appName=MagicMenu";
const testingServer = "mongodb+srv://buisnessteamtop5:a2axeqa7px@magicmenu.iatnpxk.mongodb.net/?retryWrites=true&w=majority&appName=Magicmenu";

async function main(){
    await mongoose.connect(testingServer);
};

main().then(()=>{
    console.log("connected to DB");
}).catch((err)=>{
    console.log("Some error in DB");
    console.log(err)
});

const initDB = async ()=>{
    const orders = await Listing.find();
    // initData.data = orders.data.map((obj) =>(
    //     {...obj, promote:"No"}
    // ));
    for(let order of orders){
        order.promote = 'No';
        await order.save();
    }
    // await Listing.updateMany(initData.data);

    // const orders = await CurrentOrders.deleteMany({owner:'66aa63b4742a4c5aedded9b3'});
    // const orders = await CurrentOrders.deleteMany({ owner: new ObjectId('66aa63b4742a4c5aedded9b3') });
    console.log("Done");
    
};


initDB();
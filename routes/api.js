const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Cart = require("../models/cart.js");
const MyOrders = require("../models/myorder.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");
const Subscription = require("../models/subscription.js");
const webPush = require("web-push");



// Push Notification //

const publicVapidKey = 'BMZCa-abHsQbxoO6k8M1hucKVk4vTU3UzOHJBh34gABfKjpvay3j2_xhxADWUZiNHH3YTfvBtDLJn64yGYbLAA4';
const privateVapidKey = process.env.PRIVATE_VAPID_KEY;

webPush.setVapidDetails("mailto:krunaljayale5@gmail.com", publicVapidKey, privateVapidKey);



router.post("/service",async (req,res)=>{
    let subscription = req.body;
    let newSubscription = new Subscription(subscription);
    newSubscription.userID = req.user._id;
    await newSubscription.save();
    res.json({status: "Success", message:""})
});

// Policy Route //
router.get("/policy", (req,res)=>{
    res.render("listings/policy.ejs");
})
// Root Route //
router.get("/", (req,res)=>{
    res.render("listings/root.ejs");
})

// Home Route //

    router.get("/home", wrapAsync(
    async (req,res)=>{
        let {hotelID} = req.query;
        const banner = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTP2qETnf11rg8zD1GeMbyugTUR4UqgIku15WjWOP4mjA&s";
        const hotel = await User.findById(hotelID);
        const recommendItems = await Listing.find({owner:hotelID}).limit(2);
        res.cookie("hotelID", hotelID);

        const specialItems = await Listing.find({owner:hotelID , promote:"Yes"}).limit(3);
        if(!specialItems.length){
            const specialItems = await Listing.find({owner:hotelID}).limit(3);
            res.render("listings/home.ejs", {specialItems, hotel, hotelID, banner,recommendItems})
        }else{
            res.render("listings/home.ejs", {specialItems, hotel, hotelID, banner,recommendItems});
        }
    }));

// Menu Route //
    router.get("/menu",async (req,res)=>{
        let hotelID = req.cookies.hotelID;
        const items = await Listing.find({owner:hotelID});
        const hotel = await User.findById(hotelID);
        res.render("listings/menu.ejs", {items, hotel,hotelID});
    });
    
    
    // Order Route //
    router.get("/orders/:id", wrapAsync(
    async(req,res)=>{
        let { id } = req.params;
        const hotelID = req.cookies.hotelID;
        const item = await Listing.findById(id);
        if(req.cookies.customerName){
            let customerName = req.cookies.customerName;
            res.render("listings/order.ejs",{item, customerName,hotelID});
        }else{
           res.render("listings/order.ejs",{item,hotelID}); 
        }
        
    }));
    router.post("/orders/:id",
    wrapAsync(
    async (req,res)=>{
        let { id } = req.params;
        let {name, price,image,owner} = await Listing.findById(id);
        let { customername,qty,created_at} = req.body;
        res.cookie("customerName", customername);
        let newMyOrders = new MyOrders({customername,name,image,price,qty,owner,created_at});
        newMyOrders.customerId = res.locals.sessionId;
        newMyOrders.status ="Waiting";
        await newMyOrders.save();
        let endPoint = await Subscription.find({userID:owner});
        webPush.sendNotification(endPoint[0], `${customername} ordered ${qty} ${name} just now` )
        req.flash("flashSuccess", "Order Placed");
        res.redirect(`/home?hotelID=${owner}`);
    }));
    
    // My Orders //
    router.get("/myorders",
    wrapAsync(
    async(req,res)=>{
        const hotelID = req.cookies.hotelID;
        const items  = (await MyOrders.find({customerId:res.locals.sessionId})).reverse();
        res.render("listings/myorders.ejs",{items,hotelID}) ;
    }));
    
    
    router.delete("/myorders/:id/cancel",wrapAsync(
    async(req,res)=>{
        let { id } = req.params;
        let order =  await MyOrders.findById(id);
        let owner = order.owner;
        let customername = order.customername;
        let name = order.name;
        let qty = order.qty;

        if(order.status === "Confirmed"){
            req.flash("flashError", "Sorry order is confirmed can not be cancelled");
            res.redirect("/myorders")
        }else{
            await MyOrders.findByIdAndDelete(id);
            let endPoint = await Subscription.find({userID:owner});
            await webPush.sendNotification(endPoint[0], `${customername} has cancelled order of ${qty} ${name} just now` )
            req.flash("flashSuccess", "Order Cancelled");
            res.redirect("/myorders");
        };
    }));
    
    //Cart Route //
    
    router.post("/cart/:id", wrapAsync(
    async (req,res)=>{
        let { id } = req.params;
        let {name,info,image,price,owner} = await Listing.findById(id);
        const newCart = new Cart({name,info,image,price,owner});
        newCart.customerId = res.locals.sessionId;
        await newCart.save();
        req.flash("flashSuccess", "Item added to Cart");
        res.redirect("/menu");
    }));
    
    router.get("/cart", wrapAsync(
    async(req,res)=>{
        // For testing purpose //
        let listings = await Cart.find();
        for(listing of listings){
            if(listing.created_at != new Date().toString().split(" ").slice(2,3).join(" ")){
                await Cart.findByIdAndDelete(listing._id);
            }
        }
        const hotelID = req.cookies.hotelID;
        const items = await Cart.find({customerId:res.locals.sessionId});
        if(req.cookies.customerName){
            let customerName = req.cookies.customerName;
            res.render("listings/cart.ejs" ,{items,hotelID,customerName});
        }else{
        res.render("listings/cart.ejs" ,{items,hotelID});
        }
    }));
    
    
    router.get("/cart/:id/remove", wrapAsync(
    async(req,res)=>{
        let { id } = req.params;
        await Cart.findByIdAndDelete(id);
        req.flash("flashSuccess", "Item Removed");
        res.redirect("/cart");
    }));

    router.post("/cart", async (req,res)=> {
    const items = await Cart.find({customerId:res.locals.sessionId});
    let { customername,created_at} = req.body;
    for (let item of items){
        let name = item.name;
        image = item.image;
        price = item.price;
        owner = item.owner;
        qty = 1;
        const newMyOrders = new MyOrders({customername,name,image,qty,owner,price,created_at});
        newMyOrders.customerId = res.locals.sessionId;
        newMyOrders.status ="Waiting";
        await newMyOrders.save();
    }
    let endPoint = await Subscription.find({userID:owner});

    if (items.length === 1){
        for(let item of items){
            webPush.sendNotification(endPoint[0], `${customername} ordered 1 ${item.name} on ${created_at}` );
        }
    }else{
        webPush.sendNotification(endPoint[0], `${customername} ordered bulk order on ${created_at}` );
    }
    res.cookie("customerName", customername);
    await Cart.deleteMany({customerId:res.locals.sessionId});
    res.redirect("/cart");
});
        

module.exports = router;
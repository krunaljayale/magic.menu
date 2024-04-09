const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Cart = require("../models/cart.js");
const MyOrders = require("../models/myOrders.js");
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


// Root Route //
// Home Route //
    router.get("/home", wrapAsync(
    async (req,res)=>{
        let {hotelID} = req.query;
        const items = await Listing.find({owner:hotelID});
        const hotel = await User.findById(hotelID);
        res.cookie("hotelID", hotelID);
        res.render("listings/home.ejs", {items, hotel});
    }));
    
    // Order Route //
    router.get("/orders/:id", wrapAsync(
    async(req,res)=>{
        let { id } = req.params;
        const item = await Listing.findById(id);
        if(req.cookies.customerName){
            let customerName = req.cookies.customerName;
            res.render("listings/order.ejs",{item, customerName});
        }else{
           res.render("listings/order.ejs",{item}); 
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
        const items  = (await MyOrders.find({customerId:res.locals.sessionId})).reverse();
        res.render("listings/myorders.ejs",{items}) ;
    }));
    
    
    router.delete("/myorders/:id/cancel",wrapAsync(
    async(req,res)=>{
        let { id } = req.params;
        let {created_at, owner,customername,qty,name} =  await MyOrders.findById(id);

        let orderTimeHr = created_at.toString().split(" ").slice(3,4).join(" ").slice(0,2);
        let currTimeHr = Date().split(" ").slice(4,5).join(" ").slice(0,2);
        let orderTimeMin = created_at.toString().split(" ").slice(3,4).join(" ").slice(3,5);
        let currTimeMin = Date().split(" ").slice(4,5).join(" ").slice(3,5);

            if((currTimeHr === orderTimeHr && currTimeMin-orderTimeMin >= 2) || (currTimeHr != orderTimeHr)){
                req.flash("flashError", "Sorry orders can not be cancelled after 2 minutes of placing");
                res.redirect("/myorders")
            }else{
                await MyOrders.findByIdAndDelete(id);
                let endPoint = await Subscription.find({userID:owner});
                webPush.sendNotification(endPoint[0], `${customername} has cancelled order of ${qty} ${name} just now` )
                req.flash("flashSuccess", "Order Cancelled");
                res.redirect("/myorders");
            };
    }));
    
    //Cart Route //
    
    router.post("/cart/:id", wrapAsync(
    async (req,res)=>{
        let { id } = req.params;
        let {name,info,image,price} = await Listing.findById(id);
        const newCart = new Cart({name,info,image,price});
        newCart.customerId = res.locals.sessionId;
        await newCart.save();
        req.flash("flashSuccess", "Item added to Cart");
        let hotelID = req.cookies.hotelID;
        res.redirect(`/home?hotelID=${hotelID}`);
    }));
    
    router.get("/cart", wrapAsync(
    async(req,res)=>{
        const items =await Cart.find({customerId:res.locals.sessionId});
        res.render("listings/cart.ejs" ,{items});
    }));
    
    
    router.get("/cart/:id/remove", wrapAsync(
    async(req,res)=>{
        let { id } = req.params;
        await Cart.findByIdAndDelete(id);
        req.flash("flashSuccess", "Item Removed");
        res.redirect("/cart");
    }));

        //     app.post("/cartOrder", async (req,res)=> {
        //     let { personName,name,img,price, qty,created_at} = req.body;
        //     let newMyOrders = new MyOrders({personName,name,img,price,qty,created_at});
        //     await newMyOrders.save();
        //     console.log( `${personName} ordered ${qty} ${name} on ${created_at}`);
        //     await Cart.deleteMany({});
        //     res.redirect("/");
        // });
        

    module.exports = router;
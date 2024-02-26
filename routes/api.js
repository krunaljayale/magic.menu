const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Cart = require("../models/cart.js");
const MyOrders = require("../models/myOrders.js");
const Listing = require("../models/listing.js");

// Root Route //
// Home Route //
    router.get("/home", wrapAsync(
    async (req,res)=>{
        const items = await Listing.find({});
        res.render("listings/home.ejs", {items});
    }));
    
    // Order Route //
    router.get("/orders/:id", wrapAsync(
    async(req,res)=>{
        let { id } = req.params;
        const item = await Listing.findById(id);
        res.render("listings/order.ejs",{item});
    }));
    
    router.post("/orders/:id",
    wrapAsync(
    async (req,res)=>{
        let { id } = req.params;
        let {name, price,image} = await Listing.findById(id);
        let { personName,qty,created_at} = req.body;
        console.log( `${personName} ordered ${qty} ${name} on ${created_at}`);
        let newMyOrders = new MyOrders({personName,name,image,price,qty,created_at});
        newMyOrders.customerId = res.locals.sessionId;
        await newMyOrders.save();
        req.flash("flashSuccess", "Order Placed");
        res.redirect("/home");
    }));
    
    // My Orders //
    router.get("/myorders",
    wrapAsync(
    async(req,res)=>{
        const items  = await MyOrders.find({});
        res.render("listings/myorders.ejs",{items}) ;
    }));
    
    
    router.get("/myorders/:id/cancel",wrapAsync(
    async(req,res)=>{
        let { id } = req.params;
        let { created_at } = new Date().toString().split(" ").slice(1,5).join(" ");
        let  { personName,name,qty}  = await MyOrders.findById(id);
        console.log( `Order of ${qty} ${name} from ${personName} is cancelled on ${created_at}` );
        await MyOrders.findByIdAndDelete(id);
        req.flash("flashSuccess", "Order Cancelled");
        res.redirect("/myorders");
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
        res.redirect("/home");
    }));
    
    router.get("/cart", wrapAsync(
    async(req,res)=>{
        const items = await Cart.find({});
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
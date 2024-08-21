const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Cart = require("../models/cart.js");
const MyOrders = require("../models/myorder.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");
const Subscription = require("../models/subscription.js");
const webPush = require("web-push");
const Mixpanel = require('mixpanel');


// Mixpanel Setup //   

// const mixpanel = "";

const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN);



// Push Notification //

const publicVapidKey = 'BHq_8RoraWdxr9KCj1h_b2fN-FiTOBQ5fCQqupnmA7Y1H07qybrjLYEAfPyHW5xs1ZIQ1aL5XPRClxVtlLWTcdI';
const privateVapidKey = process.env.PRIVATE_VAPID_KEY;

webPush.setVapidDetails("mailto:krunaljayale5@gmail.com", publicVapidKey, privateVapidKey);



router.post("/subscribe",async (req,res)=>{
    let subscription = req.body;
    const user = await Subscription.findOne({userID:req.user._id});
    if(user){
        await Subscription.deleteOne({userID:req.user._id});

        let newSubscription = new Subscription(subscription);
        newSubscription.userID = req.user._id;
        await newSubscription.save();  
        // console.log("User resaved");
        res.json({status: "Success", message:""});

    }else{
    let newSubscription = new Subscription(subscription);
    newSubscription.userID = req.user._id;
    await newSubscription.save();  
    // console.log("User saved");
    res.json({status: "Success", message:""});
    }
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
        let {hotelID,tableNO} = req.query;
        const banner = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTP2qETnf11rg8zD1GeMbyugTUR4UqgIku15WjWOP4mjA&s";
        const hotel = await User.findById(hotelID);
        res.cookie("hotelID", hotelID);
        if(tableNO){
            res.cookie("tableNO", tableNO);
        }

        // MIXPANEL SETUP //
        if(mixpanel){
        mixpanel.track("User Onboard", {
            distinct_id:res.locals.sessionId ,
            hotel_name:hotel.hotelname,
            address:hotel.location,
          });  
        }
        

        const specialItems = await Listing.find({owner:hotelID , promote:"Yes"}).limit(3);
        if(!specialItems.length){
            const specialItems = await Listing.find({owner:hotelID}).limit(3);
            res.render("listings/home.ejs", {specialItems, hotel, hotelID, banner})
        }else{
            res.render("listings/home.ejs", {specialItems, hotel, hotelID, banner});
        }
    }));

// Menu Route //
    router.get("/menu",async (req,res)=>{
        let hotelID = req.cookies.hotelID;
        const vegItems = await Listing.find({owner:hotelID, category:"Veg"});
        const nonvegItems = await Listing.find({owner:hotelID, category:"Non-Veg"});
        const beverage = "";
        const hotel = await User.findById(hotelID);
        res.render("listings/menu.ejs", {vegItems,nonvegItems,beverage, hotel,hotelID});
    });
    
// Beverage Route //
    router.get("/beverage",async (req,res)=>{
        let hotelID = req.cookies.hotelID;
        const beverage = await Listing.find({owner:hotelID,category:"Beverage"});
        const vegItems = "";
        const nonvegItems = "";
        const hotel = await User.findById(hotelID);
        res.render("listings/menu.ejs", {vegItems,nonvegItems,beverage, hotel,hotelID});
    });
    

    // Order Route //
    router.get("/orders/:id", wrapAsync(
    async(req,res)=>{
        let { id } = req.params;
        const hotelID = req.cookies.hotelID;
        const item = await Listing.findById(id);
        const hotel = await User.findById(hotelID);
        let tableNO = req.cookies.tableNO;

        // MIXPANEL SETUP //
        if(mixpanel){
          mixpanel.track("Order Initiated", {
            distinct_id:res.locals.sessionId ,
            // time:new Date().toString().split(" ").slice(0,5).join(" "),
            hotel_name:hotel.hotelname,
            address:hotel.location,
            item_id:item._id,
            item_name:item.name,
          });  
        }
        

        if(req.cookies.customerName){
            let customerName = req.cookies.customerName;
            res.render("listings/order.ejs",{item, customerName,tableNO});
        }else{
           res.render("listings/order.ejs",{item,tableNO});
        }
    }));
    
    router.post("/orders/:id",
    wrapAsync(
    async (req,res)=>{
        let { id } = req.params;
        let {name, price,image,owner} = await Listing.findById(id);
        let { customername,qty,created_at} = req.body;
        res.cookie("customerName", customername);
        let tableno = req.cookies.tableNO;
        let newMyOrders = new MyOrders({customername,name,image,price,qty,owner,created_at,tableno});
        newMyOrders.customerId = res.locals.sessionId;
        newMyOrders.status ="Waiting";
        await newMyOrders.save();

        const hotel = await User.findById(owner);


        // MIXPANEL SETUP //
        if(mixpanel){
        mixpanel.track("Order Placed", {
            distinct_id:res.locals.sessionId ,
            // time:new Date().toString().split(" ").slice(0,5).join(" "),
            hotel_name:hotel.hotelname,
            address:hotel.location,
            item_id:id,
            item_name:name,
            item_price:price,
            item_quantity:qty,
            customer_name:customername,
            order_id:newMyOrders._id,
          });   
        };

        let endPoint = await Subscription.find({userID:owner});
        if(endPoint.length && tableno){
           webPush.sendNotification(endPoint[0], `${customername} from table number ${tableno} ordered ${qty} ${name} just now` ) 
        }else if(endPoint.length){
            webPush.sendNotification(endPoint[0], `${customername} ordered ${qty} ${name} just now` ) 
        }
        req.flash("flashSuccess", "Order Placed");
        res.redirect(`/orders/${id}`);
        // res.redirect(`/home?hotelID=${owner}`);
    }));
    
    // My Orders //
    router.get("/myorders",
    wrapAsync(
    async(req,res)=>{
        const hotelID = req.cookies.hotelID;
        const items  = (await MyOrders.find({customerId:res.locals.sessionId})).reverse();
        res.render("listings/myorders.ejs",{items,hotelID}) ;
    }));
    
    // Order Cancel //
    router.delete("/myorders/:id/cancel",wrapAsync(
    async(req,res)=>{
        let { id } = req.params;
        let order =  await MyOrders.findById(id);
        let owner = order.owner;
        let customername = order.customername;
        let name = order.name;
        let qty = order.qty;
        let price= order.price;
        let tableno = req.cookies.tableNO;
        const hotel = await User.findById(owner);
       
        if(order.status === "Confirmed"){
            req.flash("flashError", "Sorry order is confirmed can not be cancelled");
            res.redirect("/myorders")
        }else{

            // // MIXPANEL SETUP //
            if(mixpanel){
                mixpanel.track("Order Cancelled", {
                distinct_id:res.locals.sessionId ,
                hotel_name:hotel.hotelname,
                address:hotel.location,
                item_name:name,
                item_price:price,
                item_quantity:qty,
                customer_name:customername,
                order_id:id,
                });
            };
            

            await MyOrders.findByIdAndDelete(id);
            let endPoint = await Subscription.find({userID:owner});
            if(endPoint.length && tableno){
                await webPush.sendNotification(endPoint[0], `${customername} from table number ${tableno} has cancelled order of ${qty} ${name} just now` );
            }else if(endPoint.length){
                await webPush.sendNotification(endPoint[0], `${customername} has cancelled order of ${qty} ${name} just now` );
            }
            
            req.flash("flashSuccess", "Order Cancelled");
            res.redirect("/myorders");
        };
    }));
    
    //Cart Adding Route //
    
    router.post("/cart/:id", wrapAsync(
    async (req,res)=>{
        let { id } = req.params;
        let {name,info,image,price,owner} = await Listing.findById(id);
        const newCart = new Cart({name,info,image,price,owner});
        newCart.customerId = res.locals.sessionId;
        await newCart.save();

        const hotel = await User.findById(owner);

        // // MIXPANEL SETUP //
        if(mixpanel){
          mixpanel.track("Cart Added", {
            distinct_id:res.locals.sessionId ,
            hotel_name:hotel.hotelname,
            address:hotel.location,
            item_name:name,
            item_price:price,
            cart_id:newCart._id,
            });  
        };
        

        req.flash("flashSuccess", "Item added to Cart");
        res.redirect("/menu");
    }));
    
    // Cart GET Route
    router.get("/cart", wrapAsync(
    async(req,res)=>{
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
        let {name,price,owner} = await Cart.findById(id);
        await Cart.findByIdAndDelete(id);

        const hotel = await User.findById(owner);

        // // MIXPANEL SETUP //
        if(mixpanel){
          mixpanel.track("Cart Removed", {
            distinct_id:res.locals.sessionId ,
            hotel_name:hotel.hotelname,
            address:hotel.location,
            item_name:name,
            item_price:price,
            cart_id:id,
            });  
        };
        

        req.flash("flashSuccess", "Item Removed");
        res.redirect("/cart");
    }));

    router.post("/cart", async (req,res)=> {

        // For testing purpose //
        let listings = await Cart.find();
        if (listings){
           for(let listing of listings){
            if(listing.created_at != new Date().toString().split(" ").slice(2,3).join(" ")){
                await Cart.findByIdAndDelete(listing._id);
            }
        } }
        // For testing purpose //


        const items = await Cart.find({customerId:res.locals.sessionId});
        let { customername,created_at} = req.body;
        for (let item of items){
            let name = item.name;
            let id = item._id;
            image = item.image;
            price = item.price;
            owner = item.owner;
            qty = 1;
            const newMyOrders = new MyOrders({customername,name,image,qty,owner,price,created_at});
            newMyOrders.customerId = res.locals.sessionId;
            newMyOrders.status ="Waiting";
            await newMyOrders.save();

            const hotel = await User.findById(owner);

            // MIXPANEL SETUP //
            if(mixpanel){
                mixpanel.track("Order Placed", {
                distinct_id:res.locals.sessionId ,
                hotel_name:hotel.hotelname,
                address:hotel.location,
                item_id:id,
                item_name:name,
                item_price:price,
                item_quantity:qty,
                customer_name:customername,
                order_id:newMyOrders._id,
            });
            };
        }
        let endPoint = await Subscription.find({userID:owner});
        let tableno = req.cookies.tableNO;


        if (items.length === 1){
            for(let item of items){
                if(tableno){
                    webPush.sendNotification(endPoint[0], `${customername} from table number ${tableno} ordered 1 ${item.name} on ${created_at}` );
                }else{
                    webPush.sendNotification(endPoint[0], `${customername} ordered 1 ${item.name} on ${created_at}`);
                }
            }
        }else{
            if(tableno){
                webPush.sendNotification(endPoint[0], `${customername} from table number ${tableno} created a bulk order on ${created_at}` );
            }else{
                webPush.sendNotification(endPoint[0], `${customername} created a bulk order on ${created_at}` );
            }
            
        }
        res.cookie("customerName", customername);
        await Cart.deleteMany({customerId:res.locals.sessionId});
        res.redirect("/cart");
    });
        

module.exports = router;
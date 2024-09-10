const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Cart = require("../models/cart.js");
const MyOrders = require("../models/myorder.js");
const CurrentOrders = require("../models/currentorders.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");
const Table = require("../models/table.js");
const Subscription = require("../models/subscription.js");
const webPush = require("web-push");
const Mixpanel = require('mixpanel');
const { HttpStatusCode } = require("axios");


// Mixpanel Setup //   

// const mixpanel = "";

const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN);



// Push Notification //

const publicVapidKey = 'BHq_8RoraWdxr9KCj1h_b2fN-FiTOBQ5fCQqupnmA7Y1H07qybrjLYEAfPyHW5xs1ZIQ1aL5XPRClxVtlLWTcdI';
const privateVapidKey = process.env.PRIVATE_VAPID_KEY;

webPush.setVapidDetails("mailto:krunaljayale5@gmail.com", publicVapidKey, privateVapidKey);



router.post("/subscribe",wrapAsync(async (req,res)=>{
    let subscription = req.body;
    const user = await Subscription.findOne({userID:req.user._id});
    if(user){
        await Subscription.deleteOne({userID:req.user._id});

        let newSubscription = new Subscription(subscription);
        newSubscription.userID = req.user._id;
        await newSubscription.save();  
        // console.log("User resaved");
        res.json({status: "Success", message:"User Saved"});

    }else{
    let newSubscription = new Subscription(subscription);
    newSubscription.userID = req.user._id;
    await newSubscription.save();  
    // console.log("User saved");
    res.json({status: "Success", message:"User Resaved"});
    }
}));


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
            res.render("listings/home.ejs", {specialItems, hotel,tableNO, hotelID, banner})
        }else{
            res.render("listings/home.ejs", {specialItems, hotel,tableNO, hotelID, banner});
        }
        return
    }));

// Menu Food Route //
    router.get("/menu/food",async (req,res)=>{
        let hotelID = res.locals.hotelID;
        const vegItems = await Listing.find({owner:hotelID, category:"Veg", subcategory: { $in: ["Other", "Default", null] } });
        const nonvegItems = await Listing.find({owner:hotelID, category:"Non-Veg", subcategory: { $in: ["Other", "Default", null] } });
        const allItems = await Listing.find({owner:hotelID, category: { $in: ["Veg", "Non-Veg"] }, subcategory: { $nin: ["Default", "Other",null] } });
        const uniqueItems = [...new Set(allItems.map(item => item.subcategory))];
        const hotel = await User.findById(hotelID);
        return res.render("listings/menu.ejs", {vegItems,uniqueItems,nonvegItems, hotelID, hotel});
    });


    // Menu Beverage Route //
    router.get("/menu/beverage",async (req,res)=>{
        let hotelID = res.locals.hotelID;
        const beverageItems = await Listing.find({owner:hotelID, category:"Beverage", subcategory: { $in: ["Other", "Default", null] } });
        const allItems = await Listing.find({owner:hotelID, subcategory: { $nin: ["Default", "Other",null] } });
        const uniqueItems = [...new Set(allItems.map(item => item.subcategory))];
        const hotel = await User.findById(hotelID);
        return res.render("listings/beverage.ejs", {beverageItems,uniqueItems, hotelID, hotel});
    });

// Category Items Route //
    router.get("/items/:name",async (req,res)=>{
        let hotelID = res.locals.hotelID;
        let {name} = req.params;
        const allItems = await Listing.find({owner:hotelID,subcategory:name});
        const hotel = await User.findById(hotelID);
        
        res.render("listings/items.ejs", {allItems, hotel,hotelID});
        return
    });
    

    // Order Route //
    router.get("/orders/:id", wrapAsync(
    async(req,res)=>{
        let { id } = req.params;
        const hotelID = res.locals.hotelID;
        const item = await Listing.findById(id);
        const hotel = await User.findById(hotelID);
        let tableNO = await req.cookies.tableNO;
        let customerName = req.cookies.customerName;
        // MIXPANEL SETUP //
        if(mixpanel){
          mixpanel.track("Order Initiated", {
            distinct_id:res.locals.sessionId ,
            // time:new Date().toString().split(" ").slice(0,5).join(" "),
            hotel_name:hotel.hotelname,
            address:hotel.location,
            item_id:item._id,
            item_name:item.name,
            customer_name:customerName,
            table_no:tableNO,
            customer_id:res.locals.sessionId
          });  
        }
        if(customerName){
            res.render("listings/order.ejs",{item, customerName,tableNO, hotelID});
        }else{
           res.render("listings/order.ejs",{item,tableNO, hotelID});
        }
        return
    }));
    
    router.post("/orders/:id",
    wrapAsync(
    async (req,res)=>{
        let { id } = req.params;
        let {name, price,image,owner} = await Listing.findById(id);
        let { customername,qty,mob_number} = req.body;
        // + (5.5 * 60 * 60 * 1000)  To be plused after date.now() function to get indian time//
        let date = new Date(Date.now() ).toString().split(" ").slice(1,4).join("-");
        let time =  new Date(Date.now() + (5.5 * 60 * 60 * 1000)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        let current_Date = `${date} ${time}`;
        const created_at = current_Date;
        res.cookie("customerName", customername);
        res.cookie("mob_number", mob_number);
        let tableno = await req.cookies.tableNO;
        if(!tableno || tableno === "0"){
            res.json({status: "Error", message:"Please rescan the QR"});
            return
        }
        
        
        const newTable = await Table.findOne({owner : owner, status : "Active", number : tableno });
        if(newTable){
            if(newTable.user === res.locals.sessionId){
                newTable.substatus = "Active";
                newTable.save();  
            }else{
                res.json({status: "Error", message:"Table is already booked"});
                return
            }
            
        }else if(!newTable){
            let table = new Table();
            table.number = tableno;
            table.owner = owner;
            table.user = res.locals.sessionId;
            table.status = "Active";
            table.substatus = "Active";
            await table.save(); 
        }
        
        let newMyOrders = new CurrentOrders({customername,name,image,price,qty,owner,created_at,tableno,mob_number});
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
            table_no:tableno,
            customer_id:res.locals.sessionId
          });   
        };

        let endPoint = await Subscription.find({userID:owner});
        if(endPoint.length && tableno){
           webPush.sendNotification(endPoint[0], `${customername} from table number ${tableno} ordered ${qty} ${name} just now` ) 
        }else if(endPoint.length){
            webPush.sendNotification(endPoint[0], `${customername} ordered ${qty} ${name} just now` ) 
        }
        // req.flash("flashSuccess", "Order Placed");
        // res.redirect(`/orders/${id}`);
        res.json({status: "Success", message:"Order Placed"});
        return
    }));
    
    // My Orders //
    router.get("/myorders",
    wrapAsync(
    async(req,res)=>{
        const hotelID = res.locals.hotelID;
        let tableNO = await req.cookies.tableNO;
        const items  = (await CurrentOrders.find({customerId:res.locals.sessionId})).reverse();
        if(!items.length ){
            const newTable = await Table.findOneAndDelete({owner : hotelID, status : "Active", number : tableNO, user:res.locals.sessionId});
        }
        res.render("listings/myorders.ejs",{items,hotelID,tableNO}) ;
        return
    }));
    
    // Order Cancel //
    router.delete("/myorders/:id/cancel",wrapAsync(
    async(req,res)=>{
        let { id } = req.params;
        let order =  await CurrentOrders.findById(id);
        let owner = order.owner;
        let customername = order.customername;
        let name = order.name;
        let qty = order.qty;
        let price= order.price;
        let tableno = await req.cookies.tableNO;
        if(!tableno || tableno === "0"){
            req.flash("flashError" ,"Please rescan the QR");
            res.redirect("/myorders");
            return
        }
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
                table_no:tableno,
                });
            };
        
            await CurrentOrders.findByIdAndDelete(id);
            let endPoint = await Subscription.find({userID:owner});
            if(endPoint.length && tableno){
                await webPush.sendNotification(endPoint[0], `${customername} from table number ${tableno} has cancelled order of ${qty} ${name} just now` );
            }else if(endPoint.length){
                await webPush.sendNotification(endPoint[0], `${customername} has cancelled order of ${qty} ${name} just now` );
            }
            
            req.flash("flashSuccess", "Order Cancelled");
            res.redirect("/myorders");
            return
        };
    }));

    //Cart Adding Route //
    router.post("/cart", wrapAsync(
        async(req,res)=>{
            let id = req.body.itemId;
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

            res.json({status: "Success", message:"Item added to Cart"});
            return
        }

    ));
    
    // Cart GET Route
    router.get("/cart", wrapAsync(
    async(req,res)=>{
        const hotelID = res.locals.hotelID;
        let tableNO = await req.cookies.tableNO;
        const items = await Cart.find({customerId:res.locals.sessionId});
        let customerName = req.cookies.customerName;
        if(customerName){    
            res.render("listings/cart.ejs" ,{items,hotelID,customerName, tableNO});
        }else{
        res.render("listings/cart.ejs" ,{items,hotelID,tableNO});
        }
        return
    }));
    
    // Cart Item Remove 
    router.post("/cart/:id/remove", wrapAsync(
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
        return
    }));

    // Cart Order Route
    router.post("/cart/order", async (req,res)=> {

        // For testing purpose //
        let listings = await Cart.find();
        if (listings){
           for(let listing of listings){
            if(listing.created_at != new Date().toString().split(" ").slice(2,3).join(" ")){
                await Cart.findByIdAndDelete(listing._id);
            }
        } }
        // For testing purpose //

        const hotelID = res.locals.hotelID;
        const items = await Cart.find({customerId:res.locals.sessionId});
        const specialItem = await Cart.findOne({customerId:res.locals.sessionId});
        let { customername , mob_number} = req.body;
        let date = new Date(Date.now() ).toString().split(" ").slice(1,4).join("-");
        let time =  new Date(Date.now() + (5.5 * 60 * 60 * 1000)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        let current_Date = `${date} ${time}`;
        const created_at = current_Date;
        res.cookie("customerName", customername);
        res.cookie("mob_number", mob_number);
        let tableno = await req.cookies.tableNO;
        if(!tableno || tableno === "0"){
            req.flash("flashError" ,"Please rescan the QR");
            res.redirect("/cart");
            return
        }

        const newTable = await Table.findOne({owner :hotelID, status : "Active", number : tableno});
        if(newTable){
            if(newTable.user === res.locals.sessionId){
                newTable.substatus = "Active";
                newTable.save();  
            }else{
                req.flash("flashError" ,"Table is already booked");
                res.redirect("/cart");
                return
            }
        }else if(!newTable){
            let table = new Table();
            table.number = tableno;
            table.owner = specialItem.owner;
            table.user = res.locals.sessionId;
            table.status = "Active";
            table.substatus = "Active";
            await table.save(); 
        }

        for (let item of items){
            let name = item.name;
            let id = item._id;
            let image = item.image;
            let price = item.price;
            let owner = item.owner;
            let qty = 1;
            const newMyOrders = new CurrentOrders({customername,name,image,qty,owner,price,created_at,tableno,mob_number});
            newMyOrders.customerId = res.locals.sessionId;
            newMyOrders.status ="Waiting";
            await newMyOrders.save();

            
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

        const hotel = await User.findById(specialItem.owner);
        
        
        


        let endPoint = await Subscription.find({userID:{ $in: [specialItem.owner , hotelID] }});
        
        if (items.length === 1){
            for(let item of items){
                if(endPoint.length && tableno){
                    webPush.sendNotification(endPoint[0], `${customername} from table number ${tableno} ordered 1 ${item.name} on ${created_at}` );
                }else if(endPoint.length){
                    webPush.sendNotification(endPoint[0], `${customername} ordered 1 ${item.name} on ${created_at}`);
                }
            }
        }else{
            if(endPoint.length && tableno){
                webPush.sendNotification(endPoint[0], `${customername} from table number ${tableno} created a bulk order on ${created_at}` );
            }else if(endPoint.length){
                webPush.sendNotification(endPoint[0], `${customername} created a bulk order on ${created_at}` );
            }
        }
        
        await Cart.deleteMany({customerId:res.locals.sessionId});
        req.flash("flashSuccess" ,"Orders Placed");
        res.redirect("/myorders");
        return
    });
        

module.exports = router;
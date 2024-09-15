const express = require("express");
const Listing = require("../models/listing.js");
const MyOrder = require("../models/myorder.js");
const User = require("../models/user.js");
const Table = require("../models/table.js");
const History = require("../models/history.js");
const CurrentOrders = require("../models/currentorders.js");
const Subscription = require("../models/subscription.js");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const {isLoggedIn} = require("../middleware.js");
const multer  = require('multer');
const {storage} = require("../cloudConfig.js");
const upload = multer({ storage });
const Mixpanel = require('mixpanel');
const { exist } = require("joi");
const jsPDF = require('jspdf'); // For Node.js backend

// Mixpanel Setup //
const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN);
// const mixpanel = "";


// Admin Dashboard Route //
router.get("/",isLoggedIn,wrapAsync(
    async (req,res)=>{
        let owner = res.locals.currUser;
        const items = await Listing.find({owner:owner});
        const hotel = await User.findById(owner);
        res.render("listings/admin.ejs",{ items,hotel });
}));

// USER Route //
router.get("/profile",isLoggedIn,
 async(req,res)=>{
    let id = res.locals.currUser._id;
    let user = await User.findById(id);
    const subscription = await Subscription.findOne({userID:req.user._id});
    res.render("listings/profile.ejs",{user, subscription})
})
// Profile Edit //
router.put("/profile/edit",isLoggedIn,
 async(req,res)=>{
    let id = res.locals.currUser._id;
    let user = await User.findByIdAndUpdate(id, {...req.body.user});
    await user.save();
    res.redirect("/admin/profile")
});



// Admin Show Route //
router.get("/:id/show",isLoggedIn,wrapAsync(
    async (req,res)=>{
        const { id } = req.params;
        const item = await Listing.findById(id).populate("owner");
        res.render("listings/show.ejs",{item});
}));



// Admin Edit Route //
router.get("/:id/edit",isLoggedIn,
    wrapAsync(
        async (req,res)=>{
            const { id } = req.params;
            const item = await Listing.findById(id);
            res.render("listings/edit.ejs",{item});
}));


// Update Route //
router.put("/:id/edit" ,isLoggedIn, upload.single('listing[image]')
, wrapAsync(
async (req,res)=>{
    const { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, {...req.body.listing});


    if(typeof req.file != "undefined"){
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename};
        await listing.save();
    }
    req.flash("flashSuccess", "Item Updated Successfully.");
    res.redirect("/admin");
}));

// Admin Delete Route //
router.get("/:id/delete",isLoggedIn,
    wrapAsync(
        async (req,res)=>{
            let { id } = req.params;
            await Listing.findByIdAndDelete(id);
            req.flash("flashSuccess", "Item Deleted Successfully.");
            res.redirect("/admin");
}));

// Admin Promote Route //
router.get("/:id/promote", isLoggedIn,
    wrapAsync(
        async(req,res)=>{
            let {id} = req.params;
            let owner = res.locals.currUser._id;
            let items = await Listing.find({owner:owner,promote:"Yes"});
            if(items.length >=3){
                req.flash("flashError", "Upto 3 items can be promoted.");
                res.redirect(`/admin/${id}/show`);
            }else{
                let listing = await Listing.findById(id);
                if(listing.promote === "No"){
                    listing.promote="Yes";
                    await listing.save();
                    req.flash("flashSuccess", "Item Promoted Successfully.");  
                }else{
                    req.flash("flashError", "Item was already promoted.");
                }
                res.redirect(`/admin/${id}/show`);  
            };
            
        }
    )
)

// Admin Demote Route // 
router.get("/:id/demote", isLoggedIn,
    wrapAsync(
        async(req,res)=>{
            let {id} = req.params;
            let listing = await Listing.findById(id);
            
            if(listing.promote === "Yes"){
                listing.promote="No";
                await listing.save();
                req.flash("flashSuccess", "Item removed from promotion successfully.");  
            }else{
                req.flash("flashError", "Item was already demoted.");
            }
            res.redirect(`/admin/${id}/show`);
        }
    )
);

// Admin New Route //
router.get("/new",isLoggedIn,
    (req,res)=>{
        res.render("listings/new.ejs");
});

router.post("/new",isLoggedIn,upload.single('image')
,wrapAsync(
async (req,res,next)=>{
    let { name,info,price,category,subcategory } = req.body;
    let url = req.file.path;
    let filename = req.file.filename;
    const newListing = new Listing ({name,info,price,category,subcategory});
    newListing.owner = req.user._id;
    newListing.promote = "No";
    newListing.image = { url, filename};
    await newListing.save();
    req.flash("flashSuccess", "Item Added Successfully.");
    res.redirect("/admin");
}));


// Active Tables dashboard for Admin //
router.get("/tables",isLoggedIn,
    wrapAsync(
        async(req,res)=> {
        let owner = res.locals.currUser._id;
        const activeTables = (await Table.find({owner : owner, status : "Active", substatus : "Inactive" , number: { $nin: [ 0 , null] }})).sort((a, b) => a.number - b.number);
        const waitingTables = await Table.find({owner : owner,status : "Active", substatus : "Active" , number: { $nin: [ 0 , null] }});
        // history.replaceState(null, null, '/tables');
        res.render("listings/tables.ejs", {owner,activeTables, waitingTables});
}));
       

// All orders dashboard for Admin // :)
router.get("/tables/orders/:number",isLoggedIn,
    wrapAsync(
        async(req,res)=> {
        let {number} = req.params;
        let owner = await res.locals.currUser._id;
        const waitingOrders = await CurrentOrders.find({owner:owner, status:"Waiting",tableno:number});
        
        if(!waitingOrders.length){
            const activeTable = await Table.findOne({owner : owner, number:number, status:"Active", substatus:"Active"});
            if(activeTable){
                activeTable.substatus = "Inactive";
                await activeTable.save();
            }  
        }
        const confirmedOrders = (await CurrentOrders.find({owner:owner, status:"Confirmed",tableno:number })).reverse();
        
        if(waitingOrders.length === 0 && confirmedOrders.length === 0 ){
            await Table.findOneAndDelete({owner : owner, number:number});
            res.redirect("/admin/tables");
            return
        }
        // const item = await CurrentOrders.findOne({owner:owner,tableno:number,mob_number:{ $exists:true } });
        const item = await CurrentOrders.findOne({owner:owner,tableno:number, status: { $in: ["Confirmed", "Waiting"] },mob_number: { $ne: null, $ne: "" }
          }).then(result => {
            if (!result) {
              return CurrentOrders.findOne({owner:owner,tableno:number, status: { $in: ["Confirmed", "Waiting"] }, mob_number: { $exists: true } });
            }
            return result;
          });
        const mobNumber = item.mob_number;
        const customername = item.customername;
        

        let date = new Date(Date.now()+ (5.5 * 60 * 60 * 1000) ).toString().split(" ").slice(1,4).join("-");
        let time =  new Date(Date.now() + (5.5 * 60 * 60 * 1000)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        res.render("listings/adminBill.ejs", {waitingOrders,confirmedOrders,owner, number,customername, mobNumber,date,time});
}));

// Order Confirm Route
router.get("/:id/confirm",isLoggedIn,
    wrapAsync( 
        async(req,res)=>{
        let {id}= req.params;
        const order = await CurrentOrders.findById(id);
        order.confirmed_at = new Date(Date.now()+ (5.5 * 60 * 60 * 1000)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        order.status ="Confirmed";
        await order.save();

        // // MIXPANEL SETUP //
        if(mixpanel){
           mixpanel.track("Order Confirmed", {
            distinct_id: req.user._id ,
            hotel_name:req.user.hotelname,
            address:req.user.location,
            item_name:order.name,
            item_price:order.price,
            item_quantity:order.qty,
            table_no:order.tableno,
            customer_name:order.customername,
            order_id:id,
            }); 
        };

        req.flash("flashSuccess", "Order confirmed");
        setTimeout(()=>{
         res.redirect(`/admin/tables/orders/${order.tableno}`);   
        }, 1000)
        return
}));

router.get("/:id/reject",isLoggedIn,
    wrapAsync( 
        async(req,res)=>{
        let {id}= req.params;
        const order = await CurrentOrders.findById(id);
        order.status ="Rejected";
        await order.save();
        
        
            // // MIXPANEL SETUP //
            if(mixpanel){
                mixpanel.track("Order Rejected", {
                distinct_id: req.user._id ,
                hotel_name:req.user.hotelname,
                address:req.user.location,
                item_name:order.name,
                item_price:order.price,
                item_quantity:order.qty,
                table_no:order.tableno,
                customer_name:order.customername,
                order_id:id,
                });
            };
        

        req.flash("flashSuccess", "Order rejected");
        setTimeout(()=>{
            res.redirect(`/admin/tables/orders/${order.tableno}`);   
           }, 1500)
        return
}));

// Confirm All Route
router.get("/:number/confirmAll",isLoggedIn,
    wrapAsync( 
        async(req,res)=>{
        let {number}= req.params;
        let owner = res.locals.currUser._id;
        const orders = await CurrentOrders.find({owner:owner,tableno:number,status:"Waiting"});
        for(let order of orders){
            order.confirmed_at = new Date(Date.now()+ (5.5 * 60 * 60 * 1000)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            order.status ="Confirmed";
            await order.save();

           // // MIXPANEL SETUP //
        if(mixpanel){
           mixpanel.track("Order Confirmed", {
            distinct_id: req.user._id ,
            hotel_name:req.user.hotelname,
            address:req.user.location,
            item_name:order.name,
            item_price:order.price,
            item_quantity:order.qty,
            table_no:order.tableno,
            customer_name:order.customername,
            order_id:order._id,
            }); 
        }; 
        }

        req.flash("flashSuccess", "Order confirmed");
        setTimeout(()=>{
         res.redirect(`/admin/tables/orders/${number}`);   
        }, 1500)
        return
}));

// Bill generation page for Admin // :)
router.get("/tables/bill/:number",isLoggedIn,
    wrapAsync(
        async(req,res)=> {
        let {number} = req.params;
        let owner = res.locals.currUser._id;
        let hotel = await User.findById(owner);
        const confirmedOrders = (await CurrentOrders.find({owner:owner, status:"Confirmed",tableno:number })).reverse();
        const item = await CurrentOrders.findOne({owner:owner,tableno:number,status:"Confirmed",mob_number: { $ne: null, $ne: "" }
        }).then(result => {
          if (!result) {
            return CurrentOrders.findOne({owner:owner,tableno:number,status:"Confirmed" ,mob_number: { $exists: true } });
          }
          return result;
        });
        if(confirmedOrders.length === 0 ){
            await Table.findOneAndDelete({owner : owner, number:number});
            const orders = await CurrentOrders.find({owner:owner, status:"Waiting",tableno:number });
            for(let order of orders){
                order.status = "Rejected";
                await order.save();
            }
            res.redirect("/admin/tables");
            return
        }
        const customername = item.customername;
        const mobNumber = item.mob_number;
        function generateInvoiceNumber() {
            return Math.floor(100000 + Math.random() * 900000).toString();
        };
        const invoice = generateInvoiceNumber();
        
        let date = new Date(Date.now()+ (5.5 * 60 * 60 * 1000) ).toString().split(" ").slice(1,4).join("-");
        let time =  new Date(Date.now() + (5.5 * 60 * 60 * 1000)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        res.render("listings/billPage.ejs", {confirmedOrders,invoice,mobNumber,hotel,owner, number,customername,mobNumber, date,time});
}));


router.post("/tables/bill/:number",isLoggedIn,
    wrapAsync(
        async(req,res)=> {
            let {number} = req.params;
            let {invoice} = req.body;
            let owner = res.locals.currUser._id;
            let paid_date = new Date(Date.now()+ (5.5 * 60 * 60 * 1000) ).toString().split(" ").slice(1,4).join("-");
            let paid_time =  new Date(Date.now() + (5.5 * 60 * 60 * 1000)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            let orders = await CurrentOrders.find({owner:owner,tableno:number,status:"Confirmed"});
            
            for (let order of orders){
                let customername = order.customername;
                let mob_number = order.mob_number;
                let name = order.name;
                let price = order.price;
                let qty = order.qty;
                let owner = order.owner;
                let tableno = order.tableno;
                let created_at = order.created_at;
                let confirmed_at = order.confirmed_at;
                let customerId = order.customerId;
                let status = "Delivered";

                const newHistory = new History({customername,mob_number,invoice,name,price,qty,owner,tableno,created_at,confirmed_at,customerId,status,paid_date,paid_time});
                await newHistory.save();
                // console.log(newHistory._id);
                
            }

            await CurrentOrders.deleteMany({owner:owner,tableno:number });            
            await Table.findOneAndDelete({owner:owner, number:number});
            res.redirect(302,"/admin/tables");
            return
    }));


router.get("/history",isLoggedIn,
    wrapAsync(
        async(req,res)=> {
            let owner = res.locals.currUser._id;
            const orders =  await History.find({owner:owner});

            if(orders.length === 0 ){
                req.flash("flashError", "No history")
                res.redirect("/admin/tables");
                return
            }
            const uniqueDates = [...new Set(orders.map(order => order.paid_date))].reverse();
            
            const tables =  await History.find({owner:owner});
            const uniqueTables = [...new Set(tables.map(table => JSON.stringify({ paid_date: table.paid_date, tableno: table.tableno })))];
            
            // uniqueTables.forEach((table) => { 
            //     const parsedTable = JSON.parse(table);
            //     console.log(parsedTable.tableno);
            // })
            // console.log(uniqueDates, uniqueTables);
            const parsedTables = uniqueTables.map((table) => JSON.parse(table));
            
            res.render("listings/adminHistory.ejs",{uniqueDates,parsedTables}); 
    }));


    router.get("/:date/history/:number",isLoggedIn,
        wrapAsync(
            async(req,res)=> {
                const {date , number} = req.params;
                let owner = res.locals.currUser._id;

                const bills =  await History.find({owner:owner, tableno:number, paid_date:date,});

                if(bills.length === 0 ){
                    req.flash("flashError", "No history")
                    res.redirect("/admin/tables");
                    return
                }

                const uniqueBills = [...new Set(bills.map(bill => JSON.stringify({ customerId:bill.customerId, customername:bill.customername,invoice:bill.invoice, paid_date:bill.paid_date, paid_time:bill.paid_time, tableno:bill.tableno,mob_number:bill.mob_number})))];
                
                
                const parsedBills = (uniqueBills.map((bill) => JSON.parse(bill))).reverse();

                const orders =  await History.find({owner:owner, tableno:number, paid_date:date});
                
                res.render("listings/adminInvoice.ejs",{parsedBills,orders});
                // res.send("DOne")
                return
            }
        ));
module.exports = router;

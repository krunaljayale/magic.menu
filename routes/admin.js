const express = require("express");
const Listing = require("../models/listing.js");
const MyOrder = require("../models/myorder.js");
const User = require("../models/user.js");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const {isLoggedIn} = require("../middleware.js");
const multer  = require('multer');
const {storage} = require("../cloudConfig.js");
const upload = multer({ storage });

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
    res.render("listings/profile.ejs",{user})
})
// Profile Edit //
router.put("/profile/edit",isLoggedIn,
 async(req,res)=>{
    let id = res.locals.currUser._id;
    let user = await User.findByIdAndUpdate(id, {...req.body.user});
    await user.save();
    res.redirect("/admin")
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
router.put("/:id/edit" ,isLoggedIn
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
            let items = await Listing.find({promote:"Yes"});
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
)

// Admin New Route //
router.get("/new",isLoggedIn,
    (req,res)=>{
        res.render("listings/new.ejs");
});

router.post("/new",isLoggedIn,upload.single('image')
,wrapAsync(
async (req,res,next)=>{
    let { name,info,price } = req.body;
    let url = req.file.path;
    let filename = req.file.filename;
    const newListing = new Listing ({name,info,price});
    newListing.owner = req.user._id;
    newListing.image = { url, filename};
    await newListing.save();
    req.flash("flashSuccess", "Item Added Successfully.");
    res.redirect("/admin");
}));

router.get("/orders", async(req,res)=> {
    let owner = res.locals.currUser._id;
    const allOrders = (await MyOrder.find({owner:owner, status:"Confirmed"})).reverse();
    const confirmOrders = await MyOrder.find({owner:owner, status:"Waiting"});
    res.render("listings/allOrders.ejs", {allOrders,confirmOrders});
});

router.get("/:id/confirm", async(req,res)=>{
    let {id}= req.params;
    const order = await MyOrder.findById(id);
    order.status ="Confirmed";
    order.save();
    req.flash("flashSuccess", "Order confirmed successfully.");
    res.redirect("/admin/orders");
});



module.exports = router;
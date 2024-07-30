const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const User = require("../models/user.js");
const passport = require("passport");
const { isLoggedIn} = require("../middleware.js");
const {saveRedirectUrl } = require("../middleware.js");


router.get("/signup", ( req ,res) => {
    res.render("./users/signup.ejs");
})

router.post("/signup",wrapAsync(async (req, res) => {
    try{
        let { username,hotelname,location, email, password, masterkey, number } = req.body;
        if(masterkey != "5264284"){
            req.flash("flashError", "Sorry Please Enter Valid Master Key");
            res.redirect("/signup");
        }else{
           const newUser = new User({username,hotelname,location,email,number});
            const registeredUser =  await User.register(newUser, password);
            req.login(registeredUser, (err)=>{
                if(err){
                    return next(err);
                }
            req.flash("flashSuccess", `Welcome ${username}`);
            res.redirect("/admin");
        }); 
        }
    }catch(e){
        req.flash("error", e.message);
        res.redirect("/signup");
    }
}));


router.get("/login", (req,res) => {
    res.render("./users/login.ejs");
});

router.post("/login",saveRedirectUrl,
passport.authenticate("local", {failureRedirect: "/login", failureFlash:true}),
    wrapAsync(async(req,res) => {
        let { username} = req.body;
        req.flash("flashSuccess" , `Welcome back to Cafe, ${username}`);
        let redirectUrl = res.locals.redirectUrl || "admin"; 
        res.redirect(redirectUrl);
}));

router.get("/logout",isLoggedIn,
 (req,res,next) => {
    req.logout((err) => {
        if(err){
           return next(err);
        }
        req.flash("flashSuccess", "Logged Out Successfully");
        res.redirect("/admin");
    })
})

module.exports = router;
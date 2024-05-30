if(process.env.NODE_ENV != "production"){
    require('dotenv').config()
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const admin = require("./routes/admin.js");
const api = require("./routes/api.js");
const user = require("./routes/user.js");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");




const dbUrl = process.env.ATLASDB_URL;
// const MONGO_URL = "mongodb://127.0.0.1:27017/cafe";

async function main(){
    mongoose.connect(dbUrl);
}


// Required Stuff
app.set("view engine", "ejs");
app.set("views", path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true})); 
app.use(express.json());
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.use(cors());



const store = MongoStore.create({
    mongoUrl:dbUrl,
    crypto: {
        secret: process.env.SECRET,
      },
    touchAfter: 24 * 3600
});

store.on("error" ,()=>{
    console.log("ERROR in Mongo Session Store", err)
});


const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { 
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true
     }
  };



app.use(session(sessionOptions));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req,res,next)=>{
    res.locals.flashSuccess = req.flash("flashSuccess");
    res.locals.flashError = req.flash("flashError");
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    
    res.locals.currUser = req.user;
    res.locals.sessionId = req.sessionID;
    res.locals.hotelID = req.hotelID;
    res.locals.customerName = req.customerName;
    next();
})

// Connection to Data-Base //
main().then(()=>{
    console.log("connected to DB")
}).catch((err)=>{
    console.log("Some Error In DB")
});


app.use("/admin", admin);
app.use("/", api);
app.use("/", user);


// Middlewares
// Error handling middleware
app.all("*",(req,res,next)=>{
    next(new ExpressError(404, " Sorry, Page does not exist"));  
});

app.use((err,req,res,next)=> {
    let { statusCode = 500, message = "Something went wrong" } = err;
    res.status(statusCode).render("error.ejs", {err});
});



// Server //]
const PORT = 3000;
app.listen(PORT || 3000,()=>{
    console.log(`SERVER is ON to PORT ${PORT}`);
});

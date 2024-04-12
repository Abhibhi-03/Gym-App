const express = require("express");
const app = express();
const HTTP_PORT = process.env.PORT || 8080;

// use a static resources folder
app.use(express.static('assets'))

// configure express to receive form field data
app.use(express.urlencoded({ extended: true }))

// setup handlebars
const exphbs = require("express-handlebars");
app.engine(".hbs", exphbs.engine({
    extname: ".hbs",
    helpers: {
        json: (context) => { return JSON.stringify(context) }
    }
}));
app.set("view engine", ".hbs");

// setup sessions
const session = require('express-session')
app.use(session({
    secret: "the quick brown fox jumped over the lazy dog 1234567890",  // random string, used for configuring the session
    resave: "my-layout-template",
    saveUninitialized: true
}))
//MOngoose
const mongoose = require('mongoose');
mongoose.connect("mongodb+srv://abhibhi:abhibhi@cluster0.wqc5fzn.mongodb.net/?retryWrites=true&w=majority");
const Schema = mongoose.Schema
//creating databse in mongo
const UsersSchema = new Schema({username:String, password:String})
const ClassesSchema = new Schema({imgName:String, classType: String, lengthInDB:Number})
const PaymentsSchema = new Schema({username:String, classType:String, subTotal:Number, total:Number, dateCreated:Date})

const users = mongoose.model("users_Collection", UsersSchema)
const classes = mongoose.model("classes_Collection", ClassesSchema)
const payments = mongoose.model("payments_Collection", PaymentsSchema)

//default admin username and password
const admin = "admin101@gmail.com"
const password = "admin1234"

//endpoints:
//==========================================================================================
//index endpoont
app.get("/", async(req,res)=>{
    console.log("[DEBUG]: At home/login page")
    console.log(req.session)
    res.render("login", { layout:"my-layout-template", userLoggedIn:(req.session.username !== undefined)})
    return
})

//==========================================================================================
//function to calculate the price
const priceCalculator = (classes) => {
    const newClassList = [];
    for (let i = 0; i < classes.length; i++) {
        const classWithPrice = {
            classType: classes[i].classType,
            lengthInDB: classes[i].lengthInDB,
            price: classes[i].lengthInDB * 0.65
        };
        newClassList.push(classWithPrice);
    }
    return newClassList;
}

//==========================================================================================

//Login Endpoint
app.post("/login", async (req,res)=>{
    console.log("[DEBUG]: Login Requested")
    console.log(`Email: ${req.body.email}`)
    console.log(`Password: ${req.body.password}`)
    
    const emailFromUI = req.body.email
    const passwordFromUI = req.body.password
    req.session.userLoggedIn = true

    if (emailFromUI === admin && passwordFromUI === password) {
        req.session.cart = {items: []}
        req.session.isCartEmpty = true
        req.session.username = "admin101@gmail.com"
        const paymentsToDisplay = await payments.find().lean()
        res.render("admin", {layout:"my-layout-template", payments:paymentsToDisplay, loggedInAdmin:(req.session.username === "admin101@gmail.com"), userLoggedIn:(req.session.username !== undefined)})
        return
    }

    try {

        if (emailFromUI.length === 0) {
            const errmsg = "Email field is empty!"
            res.render("error", {layout:"my-layout-template", errormsg: errmsg})
            return
        }
        if (passwordFromUI.length === 0){
            const errmsg = "Password field is empty!"
            res.render("error", {layout:"my-layout-template", errormsg: errmsg})
            return
        }
        if (!(emailFromUI.includes("@"))) {
            const errmsg = "Email is invalid...PLease use a valid email"
            res.render("error", {layout:"my-layout-template", errormsg: errmsg})
            return
        }

        const emailFromDB = await users.findOne({username:emailFromUI}).lean()
        if (emailFromDB === null) {
            const errmsg = "You are not an exisiting valid user, please create an account"
            res.render("error", {layout:"my-layout-template", errormsg: errmsg})
            return
        }

        if (emailFromDB.password !== passwordFromUI) {
            const errmsg = "Incorrect Password!"
            res.render("error", {layout:"my-layout-template", errormsg: errmsg})
            return
        }

        if (emailFromDB.username === emailFromUI) {
            req.session.username = emailFromUI
            req.session.cart = {items: []}
            req.session.isCartEmpty = true
            const classToDisplay = await classes.find().lean()
            const classReceipt = priceCalculator(classToDisplay)
            res.render("class", {layout:"my-layout-template", class:classReceipt, userLoggedIn:(req.session.username !== undefined)})
            return
        }
        } catch (err) {
        console.log(err)
    }
})
//==========================================================================================
 
//create account endpoint
app.post("/createAccount", async (req, res) => {   
    console.log("[DEBUG]: Request received at /createAccount endpoint")
    console.log(`Email: ${req.body.email}`)
    console.log(`Password: ${req.body.password}`)
    const emailFromUI = req.body.email
    const passwordFromUI = req.body.password


    try {
        if (emailFromUI.length === 0) {
            const errmsg = "Email field is empty!"
            res.render("error", {layout:"my-layout-template", errormsg: errmsg})
            return
        }
        if (passwordFromUI.length === 0){
            const errmsg = "Password field is empty!"
            res.render("error", {layout:"my-layout-template", errormsg: errmsg})
            return
        }
        if (!(emailFromUI.includes("@"))) {
            const errmsg = "Invalid email used"
            res.render("error", {layout:"my-layout-template", errormsg: errmsg})
            return
        }

        if (passwordFromUI.length<8) {
            const errmsg = "Password doesn't match criteria (Min 8 characters long)"
            res.render("error", {layout:"my-layout-template", errormsg: errmsg})
            return
        }

        const emailFromDB = await users.findOne({username:emailFromUI}).lean()
        if (emailFromDB !== null) {
            const errmsg = "You are already an existing user, please login"
            res.render("error", {layout:"my-layout-template", errormsg: errmsg})
            return

        }
        else{
            const userToInsert = await users({username:emailFromUI, password:passwordFromUI})
            userToInsert.save()   
            req.session.username = emailFromUI
            req.session.cart = {items:[]}
            req.session.isCartEmpty = true
            const classTodisplay = await classes.find().lean()
            const classToPush = priceCalculator(classTodisplay)
            res.render("class", {layout:"my-layout-template", class:classToPush, userLoggedIn:(req.session.username !== undefined)})//***** */
            return
        }
    } catch(err) {
        console.log(err)
}
})

//==========================================================================================

//logout endpoint
app.post("/logout", (req, res) => {
    console.log(`[DEBUG] LOGOUT requested...`)
    req.session.destroy()
    console.log(`Session destroyed...`)
    res.render("login", {layout:"my-layout-template", UserLoggedIn:true}) 
 })
//==========================================================================================
//action to go back
app.post("/goBack", (req,res)=>{
    console.log(`[DEBUG] GET request received at /goBack endpoint`)
    res.render("login", {layout:"my-layout-template"})
    return
})
//==========================================================================================
//classes endpoint
app.get("/classes", async(req,res)=>{
    console.log("[DEBUG]: At classes page")
    const displayClasses = await classes.find().lean()
    res.render("class", {layout:"my-layout-template", class:displayClasses})
})
//==========================================================================================
//book endpoint
app.post("/book", async(req,res)=>{
    console.log(`[DEBUG] GET request received at /book endpoint`)
    console.log(req.session.userLoggedIn)
    req.session.isCartEmpty = false
    try{
    // 1. check if they are logged in
    if (req.session.userLoggedIn === undefined) {
        // 3. if no, then show them an error message
        const errmsg = "You must be logged in to perform this action"
        res.render("error", {layout:"my-layout-template", errormsg: errmsg})
        return
    }
    if (req.session.userLoggedIn === true)  {
            // 2. if yes, show them the output
    const bookedByUsername = req.session.userLoggedIn
    const bookedClassFromUI = req.body.bookAClass
    const bookedClass = await classes.findOne({classType: bookedClassFromUI}).lean()
    const classLength = bookedClass.lengthInDB //******/
    console.log(classLength)
    const priceBeforeTax = 0.65 * parseFloat(classLength) 
    const total = (priceBeforeTax * 0.13) + priceBeforeTax
    const dateCreated = Date()

    const paymentToInsert = await payments({username:bookedByUsername, classType:bookedClassFromUI, subTotal:priceBeforeTax, total:total, dateCreated:dateCreated})
    paymentToInsert.save()
    console.log("Inserted")

    const cartListToAppend = {username:bookedByUsername, classType:bookedClassFromUI, lengthInDB:classLength, subTotal:priceBeforeTax.toFixed(2), totalcost:total.toFixed(2)}
    req.session.cart.items.push(cartListToAppend)
    }

    const classToDisplay = await classes.find().lean()
    let price = []
    for(let i = 0; i < classToDisplay.length; i++) {
        price.push(classToDisplay.lengthInDB * 0.65)
    }
    const classReceipt = priceCalculator(classToDisplay)
    res.render("class", {layout:"my-layout-template", class:classReceipt, userLoggedIn:(req.session.username !== undefined)}) 
    return  
    }catch(err){
        console.log(err)
    }

})

//==========================================================================================
//admin endpoint
app.get("/admin", async (req, res) => {
    console.log(`[DEBUG] POST request received at /admin endpoint`)

    if (req.session.userLoggedIn === undefined) {
        const errmsg = "You must be logged in to access this site"
        res.render("error", {layout:"my-layout-template", errormsg: errmsg})
        return
    }
    else {

        if (req.session.userType === "admin101@gmail.com") {
            if (req.session.userLoggedIn === true) {
                const paymentsToDisplay = await payments.find().lean()
                res.render("admin", { layout: "my--layout-template", userLoggedIn: true, paylist: paymentsToDisplay })
                return
            }
        }
        else {
            const errmsg = "You must have admin rights to access this site"
            res.render("error", {layout:"my-layout-template", errormsg: errmsg})
            return
        }
    }
})
//====================================================================================================
//view-cart endpoint
app.get("/cart", async (req, res) => {
    console.log("[DEBUG]: Request received on /cart endpoint")
    if (req.session.username === undefined) {
        res.render("cart", {layout:"my-layout-template", userLoggedIn:"my-layout-template", isCartEmpty:req.session.isCartEmpty})
        return
    }
    else{
        res.render("cart", {layout:"my-layout-template", userLoggedIn:(req.session.username !== undefined), isCartEmpty:req.session.isCartEmpty, cartItems:req.session.cart.items})
        return
    }
})

//========================================================================================================
// start server
const onHttpStart = () => {
    console.log("Express http server listening on: " + HTTP_PORT);
    console.log(`http://localhost:${HTTP_PORT}`);
}
app.listen(HTTP_PORT, onHttpStart);







const express= require("express")
const app= express()
const cookieParser= require("cookie-parser")
const userModel = require("./modules/user.js")
const postModel= require("./modules/post.js")
const bcrypt= require("bcrypt")
const jwt= require("jsonwebtoken")

app.set("view engine", "ejs")
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())

app.get("/", (req, res)=>{
    res.render("index")
}) 

app.get("/profile",isLoggedIn,  (req, res)=>{
    console.log(req.user);
    res.render("profile")
    
}) 

app.post("/register", async(req, res)=>{
    const {username, name, email, password}= req.body
    const user= await userModel.findOne({email})
    if(user) res.status(500).send("user already registered")
    bcrypt.genSalt(10, (err, salt)=>{
        bcrypt.hash(password, salt, async(err, hash)=>{
            const newUser= await userModel.create({
                username,
                name,
                email, 
                password:hash
            })
            const token= jwt.sign({email, userid: newUser._id}, "shhhhhh")
            res.cookie("token", token)
            res.send("registered")
        })
    })
})

app.get("/login", (req, res)=>{
    res.render("login")
})

app.post("/login", async(req, res)=>{
    const {email, password}= req.body
    const user = await userModel.findOne({ email });
    if(!user) res.status(404).send("email not found")

    bcrypt.compare(password, user.password, (err, result)=>{
        if(result) {
            const token= jwt.sign({email, userid: user._id}, "shhhhhh")
            res.cookie("token", token)
            res.send("user logged in")
            
        } 
        else res.redirect("/login")
    })
})

app.get("/logout", (req, res)=>{
    res.cookie("token", "")
    res.redirect("/login")
})

function isLoggedIn(req, res, next){
    if(req.cookies.token === "") res.send("you should login in first")
    else{
        const data= jwt.verify(req.cookies.token, "shhhhhh")
        req.user= data
        next()
    }
}

app.listen(3000)
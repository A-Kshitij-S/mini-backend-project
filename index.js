const express= require("express")
const app= express()
const cookieParser= require("cookie-parser")
const userModel = require("./modules/user.js")
const postModel= require("./modules/post.js")
const bcrypt= require("bcrypt")
const jwt= require("jsonwebtoken")
const crypto= require("crypto")
const path= require("path")
const multer= require("multer")

app.set("view engine", "ejs")
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/images/uploads')
    },
    filename: function (req, file, cb) {
      crypto.randomBytes(10, (err, bytes)=>{
            const name= bytes.toString("hex") + path.extname(file.originalname)
            cb(null, name)
      })
    }
})
  
const upload = multer({ storage: storage })

app.get("/", (req, res)=>{
    res.render("index")
}) 

app.get("/test", (req, res)=>{
    res.render("upload")
}) 

app.post("/upload",upload.single("image"), (req, res)=>{
    res.render("upload")
}) 

app.get("/profile",isLoggedIn, async (req, res)=>{
    const user= await userModel.findOne({email : req.user.email}).populate("posts") 
    
    res.render("profile", {user})
    
}) 

app.post("/post",isLoggedIn, async (req, res)=>{
    const user= await userModel.findOne({email : req.user.email})
    const {content} = req.body
    const userPost= await postModel.create({
        user: user._id,
        content
    })
    user.posts.push(userPost.id)
    await user.save()
    res.redirect("/profile")
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
            res.redirect("/login")
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
            res.status(200).redirect("/profile")
        } 
        else res.redirect("/login")
    })
})

app.get("/logout", (req, res)=>{
    res.cookie("token", "")
    res.redirect("/login")
})

app.get("/edit/:id", async(req, res)=>{
    const post= await postModel.findOne({_id: req.params.id}).populate("user")    
    res.render("edit", {post})
})

app.post("/update/:id", async(req, res)=>{
    const post= await postModel.findOneAndUpdate({_id: req.params.id}, {content: req.body.content})
    res.redirect("/profile")
})

app.get("/like/:id",isLoggedIn, async (req, res)=>{
    const post= await postModel.findOne({_id: req.params.id}).populate("user")

    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid)
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }
    
    await post.save()
    res.redirect("/profile")
})

function isLoggedIn(req, res, next){
    if(req.cookies.token === "") res.redirect("/login")
    else{
        const data= jwt.verify(req.cookies.token, "shhhhhh")
        req.user= data
        next()
    }
}

app.listen(3000)
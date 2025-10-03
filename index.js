require('dotenv').config();
const express = require("express");
const path = require("path")
const cookieParser = require("cookie-parser");
const { connectToMongoDB} = require("./connect");


const userRoutes = require("./routes/user");

const app = express();
const PORT = 5801;

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(cookieParser());

// Set loggedIn variable globally
app.use((req, res, next) => {
    const token = req.cookies.token;
    res.locals.loggedIn = !!token; // true if user has a token
    next();
});


connectToMongoDB("mongodb://localhost:27017/projecthr")
.then(()=>{
    console.log("Connected to MongoDB");
});

// Render index.ejs at root
app.get("/", (req, res) => {res.render("index");});
app.get("/login", (req, res) => res.render("login",{ title: "Login" }));
app.get("/register", (req, res) => res.render("register",{ title: "Register" }));
app.get("/forgetPassword", (req, res) => res.render("forgetPassword", { title: "ForgetPassword", error: null, message: null })
);
app.get("/jobs", (req, res) => {
  // Pass empty array to avoid EJS error
  const jobs = [];

  res.render("jobs", { 
    title: "Jobs", 
    jobs   // now jobs is defined
  });
});


app.use("/user", userRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

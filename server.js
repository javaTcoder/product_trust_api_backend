require("dotenv").config({ path: "./config/config.env" }); // <-- Move this to the very top

const app = require("./app");
const connectDB = require("./db/connectDB")
const cloudinary = require("cloudinary");
const job = require("./cron/cron");
//const express = require("express");
const paymentRoute = require("./route/paymentRoute");



// Handling Uncaught Execption => anything not defind Uncaught Execption 

process.on("uncaughtException" , (err) =>{
    console.log(`Error , ${err.message}`);
    console.log(`Shutting down the server due to Uncaught Exception`);
    process.exit(1);
})


// Connect With MongoDB
connectDB();
job.start();


// conncet with cloudinary

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});




const PORT = process.env.PORT || 5000;

 // ensure body parsers are enabled for urlencoded and json
 //app.use(express.json());
 //app.use(express.urlencoded({ extended: true }));

// mount payment routes
app.use("/api/v1/payment", paymentRoute);

const server = app.listen(PORT, () => {
  console.log(`Server is listening on PORT ${process.env.PORT}`);
});

// Unhandled Promise Rejection  => server issue
process.on("unhandledRejection" , (err) =>{ 
    console.log(`Error : ${err.message}`);
    console.log(`Shutting down the server due to Unhandled Promise Rejection`);
// if there any issue occures eg : broken host link eg : then return msg and server will close
server.close(() =>{
    process.exit(1);
})
    
})
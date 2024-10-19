const dotenv = require('dotenv')
dotenv.config({path: './config.env'})
const mongoose = require("mongoose")

process.on('uncaughtException', (err) => {
  console.log(err.stack,err.name, err.message);
  console.log('Uncaught Exception occured! Shutting down...');
  process.exit(1);
})

const app = require('./app')
const port = process.env.PORT || 3007;
mongoose.connect(process.env.LOCAL_CONN_STR, {
    // Use the new URL parser
    useNewUrlParser: true,
    // Use the new server discovery and monitoring engine
    useUnifiedTopology: true,
  }).then(() => { 
    console.log("Connected to MongoDB");
  }).catch((err) => {
    console.error("Error connecting to MongoDB:", err);
})
const server =app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})
process.on('unhandledRejection', (err) => {
  console.log(err.stack,err.name, err.message);
  console.log('Unhandled rejection occured! Shutting down...')
  server.close(() => {
   process.exit(1)
  })
}) 

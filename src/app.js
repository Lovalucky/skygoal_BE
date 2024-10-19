//IMPORT PACKAGE
const express = require('express');
const morgan = require('morgan');
const bodyParser = require("body-parser");
const cors = require("cors");

// IMPORT CUSTOMIZE  MODULE
const CustomError = require('./utils/CustomError');
const globalErrorHandler = require('./controllers/error-controller');
const routes = require("../src/routes/routes");




let app = express();

app.use(express.json());

app.use(express.static('./public'));


//USING ROUTES
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(routes)

app.all('*', (req, res, next) => {
    const err = new CustomError(`Can't find ${req.originalUrl} on the server!`, 404);
    next(err);
});
// global Error Handler For Api 
app.use(globalErrorHandler);

module.exports = app;
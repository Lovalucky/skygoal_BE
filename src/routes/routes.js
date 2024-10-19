const express = require("express");
const router = express.Router();

const UserRoutes = require("./user-routes");
router.use("/api/v1/users", UserRoutes);
module.exports = router;
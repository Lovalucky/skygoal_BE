const express = require('express')
const router = express.Router()
const userController = require('../controllers/user-controller')

router.post("/signup",userController.signup); 
router.post("/login", userController.login); 
router.get("/",userController.protect,userController.getAllUsers)

router.route('/forgotPassword').post(userController.forgotPassword);
router.route('/resetPassword/:token').patch(userController.resetPassword);


module.exports = router;

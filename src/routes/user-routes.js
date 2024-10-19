const express = require('express')
const router = express.Router()
const userController = require('../controllers/user-controller')

router.post("/signup",userController.signup); 
router.post("/login", userController.login); 
router.get("/",userController.getAllUsers)
router.patch("/update-role",userController.protect,userController.restrict('admin','superadmin'),userController.updateRole)
router.patch("/update-user",userController.updateUser)
router.delete("/delete-user",userController.deleteUser)

router.route('/forgotPassword').post(userController.forgotPassword);
router.route('/resetPassword/:token').patch(userController.resetPassword);


module.exports = router;

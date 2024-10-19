const User = require("../models/User/user-model")
const AsyncErrorHandler = require("../utils/asyncErrorhandler")
const CustomError = require("./../utils/CustomError")
const sendEmail = require("../utils/email")
const jwt = require("jsonwebtoken")
const util = require("util")
const crypto = require("crypto")



// Create a Sign Token
const signToken = (username) => {
  return jwt.sign({ username }, process.env.SECRET_STR, {
    expiresIn: process.env.LOGIN_EXPIRES,
  });  

};

// Create a user
exports.signup = AsyncErrorHandler(async (req, res, next) => {
  try {
    // const newUser = await User.create(req.body);
    const { username} = req.body;
   
    const user = await User.findOne({username});
    if(user){
      const error = new CustomError("Username is already Exist", 409);
      return next(error);
    }
    // Create new user
    const newUser = await User.create(req.body);

    const token = signToken(newUser.username);

    res.status(201).json({
      status: "success",
      token,
      data: {
        user: newUser,
      },
    });
  } catch (err) {
    console.log("ERROR :",err.stack)
    res.status(500).json({
      status: "false",
      message: err.message,
    });
  }
});

// Login User
exports.login = AsyncErrorHandler(async (req, res, next) => {
  
 try{
  const { username, password } = req.body;
  // Check if username and password are provided
  if (!username || !password) {
    const error = new CustomError(
      "Please provide username and password for login",
      400
    );
    return next(error);
  }
  // Check if user exists and password is correct
  const user = await User.findOne({ username }).select("+password");
  if(!user){
    
    return next(new CustomError("Username is Not Found", 404));
  }

  if (!user || !(await user.comparePasswordInDB(password, user.password))) {
    const error = new CustomError("Incorrect Username or password", 401);
    return next(error);
  }
  if (user.userActive === false) {
    next(
      new CustomError(
        "Your Account is Deactived, Please contact Support Team",
        400
      )
    )
  }
  const token = signToken(user.username);
  // Remove password from output
  user.password = undefined;
  res.status(200).json({
    status: "success",
    token,
    data: {
      user,
    },
  })

 }catch(err){
  res.status(500).json({
    error: "error",
    message:"Internal Serer Error"
  })

 }
})


// Protect the  Api
exports.protect = AsyncErrorHandler(async (req, res, next) => {
  // 1. Read the token & check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(new CustomError("You are not logged in", 401));
  }
  // 2. Validate the token
  const decodedToken = await util.promisify(jwt.verify)(
    token,
    process.env.SECRET_STR
  );
  // console.log(decodedToken)
  // 3. Check if the user still exists
  const currentUser = await User.findById(decodedToken.id);
  if (!currentUser) {
    return next(
      new CustomError(
        "The user belonging to this token does no longer exist",
        401
      )
    );
  }
  // 4. Grant access to protected route
  req.user = currentUser;
  next();
})

// Token Validation
exports.validationToken = AsyncErrorHandler(async (req, res, next) => {
  const token = req.body.token;
  // const token = await User.findOne({token:req.body.token});

  // 2. Validate the token
  const decodedToken = await util.promisify(jwt.verify)(
    token,
    process.env.SECRET_STR
  )
  // 3. Check if the user still exists
  const currentUser = await User.findById(decodedToken.id);
  if (!currentUser) {
    return next(
      new CustomError(
        "The user belonging to this token does no longer exist",
        401
      )
    );
  }

  res.status(200).json({
    status: "Success",
    message: "It Is valid Token",
  });
  next();
});

// AUTHORIZATION USER ROLES AND PERMISSION
exports.restrict = (...role) => {
  return (req, res, next) => {
    if (!role.includes(req.user.role)) {
      const error = new CustomError(
        "You do not have permission to perform this action",
        403
      );
      next(error);
    }
    next();
  };
};

// Forgot Password reset token
exports.forgotPassword = AsyncErrorHandler(async (req, res, next) => {
  // 1. GET USER BASED ON POSTED EMAIL
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    const error = new CustomError(
      "We Could not find the user with given email",
      404
    );
    next(error);
  }
  // 2. GENERATE A RANDOM RESET TOKEN
  const resetToken = user.createResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  // 3. SEND THE TOKEN BACK TO THE USER EMAIL
  const resetUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/resetPassword/${resetToken}`;
  const message = `We have received a password reset request.Please use the below link to reset your password\n\n ${resetUrl} It will be expires in 10 mins`;
  try {
    await sendEmail({
      email: user.email,
      subject: "Password change request received",
      message: message,
    })
    res.status(200).json({
      status: "success",
      message: "password reset link send to the user email",
    })
  } catch (err) {
    user.passwordResetToken = undefined
    user.passwordResetTokenExpires = undefined
    user.save({ validateBeforeSave: false })
    console.log("ERROR:", err)
    return next(
      new CustomError(
        "There was an error sending password reset email.please try again later",
        500
      )
    )
  }
})

// RESET PASSWORD BY USING TOKEN LINK
exports.resetPassword = AsyncErrorHandler(async (req, res, next) => {
  // 1. IF THE USER EXISTS WITH GIVEN TOKEN & TOKEN HAS NOT EXPIRED
  const token = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex")
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetTokenExpires: { $gt: Date.now() },
  })

  if (!user) {
    const error = new CustomError("Token is invalid or has expired !", 400);
    next(error)
  }

  if (!req.body.password || !req.body.confirmPassword) {
    const error = new CustomError(
      "Password & Confirm Password Entry Properly",
      422
    )
  }
  // 2. RESETING  THE USER PASSWORD
  user.password = req.body.password
  user.confirmPassword = req.body.confirmPassword
  user.passwordResetToken = undefined
  user.passwordResetTokenExpires = undefined
  user.passwordChangedAt = Date.now()
  user.save()
  // 3.LOGIN THE USER
  const loginToken = signToken(user.username)
  res.status(200).json({
    status: "success",
    loginToken,
  })
})

// Update Role Only
exports.updateRole = AsyncErrorHandler(async (req, res, next) => {
  try {
    const { username, role, userActive } = req.body;
    // Find and get the User by Username
    const user = await User.findOne({ username });

    if (!user) {
      const error = new CustomError(" Username is not found!", 404);
      return next(error);
    }

    const updatedUser = await User.findOneAndUpdate(
      { username },
      { username, role, userActive },
      { new: true, runValidators: true }
    )

    res.status(200).json({
      status: "success",
      message: "User Status Successfully Updated ",
      data: {
        user: updatedUser,
      },
    })
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err.message,
    })
  }
})


// Update user For Admin 
exports.updateUser =AsyncErrorHandler(async(req,res,next)=>{
  try{
      console.log("REQ BODY ::",req.body)
      const {existusername}=req.body
      const user = await User.findOne({username:existusername});
      if(!user){
          const error = new CustomError("Please provide Correct Username for Editing user",400);
            return next(error);
      }

      const updatedUser= await username.findOneAndUpdate({username}, req.body, {new: true, runValidators: true});



      res.status(200).send({
          status:"success",
          data:updatedUser
      })

  }catch(err){
      console.log("ERROR Stack :",err.stack)
      res.status(500).send({
          status:"error",
          message:"Internal Sever Error"
      })
  }
})


// Update user For Admin 
exports.deleteUser =AsyncErrorHandler(async(req,res,next)=>{
  try{
      console.log("REQ BODY ::",req.body)
      const {existusername}=req.body
      const user = await User.findOne({username:existusername});
      if(!user){
          const error = new CustomError("Please provide Correct Username for Editing user",400);
            return next(error);
      }

      const deleteUser= await User.findOneAndDelete({username:existusername});

     if(deleteUser){
      res.status(200).send({
        status:"success",
        message:"User Deleted Successfully ! "
        // data:updatedUser
    })
     }else{
      const error =CustomError('User not Delete ',400)
      return next(error);
     }

     

  }catch(err){
      console.log("ERROR Stack :",err.stack)
      res.status(500).send({
          status:"error",
          message:"Internal Sever Error"
      })
  }
})



// 
exports.getAllUsers = AsyncErrorHandler(async (req,res,next)=>{
  try{
    const users = await User.find();
    res.status(200).send({
        status:"success",
        data:users
    })
  }catch(err){
    res.status(200).send({
      status:"error",
      message:"Internal Sever Error"
  })
  }
})

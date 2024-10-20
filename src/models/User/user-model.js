const mongoose = require("mongoose");
const validator =require('validator');
const bcrypt =require('bcryptjs');
const crypto = require("crypto");
const date = new Date();

const userSchema = new mongoose.Schema({

  username:{
    type:String,
    required:[true,'Username is required'],
    unique: true,
  },
  email: {
    type: String,
    required: [true,'Please Enter Your Email'],
    unique: true,
    lowercase:true,
    validate:[validator.isEmail,'Please Enter a Valid Email']
  },
  
 
 
  password: {
    type: String,
    required: [true,'Please Enter a password'],
    minlength:8,
    select:false
  },


status:{
    type:String,
    enum:['Active','InActive','Deactive'],
    default:'Active'
},
  createdon: {
    type: String,
    default:  () => {
      const date = new Date();
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  },
  verificationToken: String, 
  passwordChangedAt:Date,
  passwordResetToken:String,
  passwordResetTokenExpires:Date,
 
});


// Pre-save middleware to hash the password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  
  // Delete confirmPassword field
  this.confirmPassword = undefined;
  next();
});


// Instance method to compare passwords
userSchema.methods.comparePasswordInDB = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// IF the User want Reset password then send to Reset Token
userSchema.methods.createResetPasswordToken = function(){
  const resetToken =crypto.randomBytes(32).toString('hex');
   this.passwordResetToken= crypto.createHash('sha256').update(resetToken).digest('hex');
   this.passwordResetTokenExpires= Date.now() + 10 * 60 * 1000;
    
   return resetToken;
}

//  Compile scheme into model
const User = mongoose.model("User", userSchema);
module.exports = User

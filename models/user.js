// models/User.js
const mongoose = require('mongoose');
const { randomBytes, createHmac } = require('crypto');
const { createTokenForUser } = require('../service/authentication');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true, 
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user', 
  },
  appliedJobs: [
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    appliedAt: { type: Date, default: Date.now },
    resume: String // filename of the uploaded resume
  }
],
  otp: String, 
  otpExpires: Date, 
  salt: String, 
}, {
  timestamps: true, 
});

// Hash password before saving
userSchema.pre("save", function(next) {
  if (!this.isModified("password")) return next();
  const salt = randomBytes(16).toString("hex");    
  this.salt = salt;
  this.password = createHmac('sha256', salt).update(this.password).digest("hex");
  next();
});

userSchema.statics.matchPasswordAndGenerateToken = async function(email, password) {
  const user = await this.findOne({ email });
  if (!user) throw new Error('User not found!');

  const userProvidedHash = createHmac('sha256', user.salt)
                             .update(password)
                             .digest('hex');

  if (user.password !== userProvidedHash) throw new Error('Incorrect Password');

  const token = createTokenForUser(user); 
  return { user, token };
};


const User = mongoose.model('User', userSchema); 

module.exports = User;
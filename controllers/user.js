// controllers/user.js

const User = require("../models/user");
const Job = require("../models/job");
const axios = require("axios");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { createTokenForUser } = require("../service/authentication");
const { fast2smsApiKey } = require('../config/keys');


// ------------------------ MULTER CONFIG ------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/resumes";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, req.user._id + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.test(ext)) cb(null, true);
  else cb(new Error("Only PDF or DOC/DOCX files are allowed"));
};

const upload = multer({ storage, fileFilter });

// ------------------------ USER REGISTER ------------------------
async function handleUserRegister(req, res) {
  try {
    const { fullName, email, password, mobileNumber, consent } = req.body;

    console.log("Form data:", req.body); // debug

    // Simple validation
    if (!fullName || !email || !mobileNumber || !password) {
      return res.status(400).render("register", { error: "All fields are required" });
    }

    // Checkbox value is "on" if checked
    const consentGiven = consent === "on";
    if (!consentGiven) {
      return res.status(400).render("register", { error: "You must agree to the consent checkbox." });
    }

    // Create user
    await User.create({ fullName, email, password, mobileNumber, consent: consentGiven });

    // Redirect to login page
    return res.redirect("/user/login");
  } catch (err) {
    console.error("Error registering user:", err);
    return res.status(500).render("register", { error: "Failed to register user." });
  }
}

// ------------------------ USER LOGIN ------------------------
async function handleUserLogin(req, res) {
  try {
    const { email, password } = req.body;
    console.log("Login attempt:", email);

    if (!email || !password) {
      return res.render("login", { title: "Login Page", error: "Email & password required" });
    }

    const result = await User.matchPasswordAndGenerateToken(email, password);
    console.log("Login result:", result);

    const { user, token } = result;

    res.cookie("token", token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    return res.redirect("/");

  } catch (err) {
    console.error("Login error:", err.message);
    return res.render("login", { title: "Login Page", error: err.message });
  }
}



// ------------------------ FORGOT PASSWORD ------------------------
async function handleForgetPassword(req, res) {
  try {
    let { mobileNumber } = req.body;

    // keep only digits
    mobileNumber = mobileNumber.toString().replace(/\D/g, "");
    console.log("Searching for mobile:", mobileNumber);

    const user = await User.findOne({ mobileNumber });
    if (!user) { return res.render("forgetPassword", { error: "User not found." }); }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 min

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send OTP via SMS
    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      new URLSearchParams({
        route: "q",
        message: `Your OTP is ${otp}. Valid for 10 minutes.`,
        language: "english",
        numbers: "91" + user.mobileNumber
      }),
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded"
        },
      }
    );

    console.log("Fast2SMS response:", response.data);


    return res.render("verifyOtp", { message: "OTP sent successfully." });
  } catch (smsErr) {
    if (smsErr.response) {
      console.error("Fast2SMS API Error:", smsErr.response.data);
    } else {
      console.error("Axios Error:", smsErr.message);
    }
    return res.render("forgetPassword", { error: "Failed to send OTP." });
  }

}

// ------------------------ VERIFY OTP ------------------------
async function handleVerifyOtp(req, res) {
  try {
    const { fullName, mobileNumber, otp } = req.body;
    const user = await User.findOne({ fullName, mobileNumber });
    if (!user) return res.render("verifyOtp", { error: "User not found." });

    if (user.otp === otp && user.otpExpires > Date.now()) {
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();
      return res.render("resetPassword", {
        message: "OTP verified. Set new password.",
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
      });
    } else {
      return res.render("verifyOtp", { error: "Invalid or expired OTP.", fullName, mobileNumber });
    }
  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.render("verifyOtp", { error: "Server error." });
  }
}

// ------------------------ RESET PASSWORD ------------------------
async function handleResetPassword(req, res) {
  try {
    const { fullName, mobileNumber, newPassword } = req.body;
    const user = await User.findOne({ fullName, mobileNumber });
    if (!user) return res.render('resetPassword', { error: 'User not found.', message: null, fullName, mobileNumber });

    // Hash the new password
    const salt = crypto.randomBytes(16).toString('hex');
    user.salt = salt;
    user.password = crypto.createHmac('sha256', salt).update(newPassword).digest('hex');

    await user.save();
    res.render('login', { message: 'Password reset successful. Please login.', error: null });
  } catch (err) {
    console.error(err);
    res.render('resetPassword', { error: 'Failed to reset password.', message: null, fullName, mobileNumber });
  }
}


// ------------------------ GET USER PROFILE ------------------------
async function handleGetUserProfile(req, res) {
  try {
    const user = await User.findById(req.user._id)
      .select("-password -salt -otp -otpExpires")
      .populate("appliedJobs.job");
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.render("userProfile", { user }); // EJS
  } catch (err) {
    console.error("Profile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ------------------------ GET APPLIED JOBS ------------------------
async function handleGetAppliedJobs(req, res) {
  try {
    const user = await User.findById(req.user._id).populate("appliedJobs.job");
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ success: true, appliedJobs: user.appliedJobs });
  } catch (err) {
    console.error("Applied jobs error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ------------------------ APPLY FOR JOB ------------------------
async function handleApplyForJob(req, res) {
  try {
    const userId = req.user._id;
    const { jobId } = req.body;
    const resumeFile = req.file?.filename;

    if (!resumeFile) return res.status(400).json({ message: "Please upload your resume." });

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: "Job not found." });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const alreadyApplied = user.appliedJobs.some((app) => app.job.toString() === jobId);
    if (alreadyApplied) {
      fs.unlinkSync(path.join("uploads/resumes", resumeFile));
      return res.status(400).json({ message: "Already applied to this job." });
    }

    user.appliedJobs.push({ job: jobId, resume: resumeFile });
    await user.save();

    return res.status(200).json({ message: "Applied successfully." });
  } catch (err) {
    console.error("Apply job error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

// ------------------------ DOWNLOAD RESUME ------------------------
async function handleDownloadResume(req, res) {
  try {
    const { jobId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const application = user.appliedJobs.find((app) => app.job.toString() === jobId);
    if (!application) return res.status(404).json({ message: "Application not found." });

    const filePath = path.join("uploads/resumes", application.resume);
    res.download(filePath);
  } catch (err) {
    console.error("Download resume error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

// ------------------------ UPDATE RESUME ------------------------
async function handleUpdateResume(req, res) {
  try {
    const { jobId } = req.body;
    const resumeFile = req.file?.filename;

    if (!resumeFile) return res.status(400).json({ message: "Please upload resume." });

    const user = await User.findById(req.user._id);
    const application = user.appliedJobs.find((app) => app.job.toString() === jobId);
    if (!application) return res.status(404).json({ message: "Application not found." });

    fs.unlinkSync(path.join("uploads/resumes", application.resume));

    application.resume = resumeFile;
    await user.save();

    return res.status(200).json({ message: "Resume updated successfully." });
  } catch (err) {
    console.error("Update resume error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

// ----------------- FILTER / SEARCH APPLIED JOBS -----------------
async function handleFilterAppliedJobs(req, res) {
  try {
    const { status } = req.query;
    const user = await User.findById(req.user._id).populate("appliedJobs.job");

    let appliedJobs = user.appliedJobs;
    if (status) appliedJobs = appliedJobs.filter(app => app.status === status);

    res.status(200).json({ appliedJobs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// ----------------- REMOVE A JOB APPLICATION -----------------
async function handleWithdrawApplication(req, res) {
  try {
    const { jobId } = req.params;
    const user = await User.findById(req.user._id);

    const index = user.appliedJobs.findIndex(app => app.job.toString() === jobId);
    if (index === -1) return res.status(404).json({ message: "Application not found" });

    // Delete resume file safely
    const resumePath = path.join("uploads/resumes", user.appliedJobs[index].resume);
    if (fs.existsSync(resumePath)) fs.unlinkSync(resumePath);

    // Remove application
    user.appliedJobs.splice(index, 1);
    await user.save();

    res.status(200).json({ message: "Application withdrawn successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  upload,
  handleUserRegister,
  handleUserLogin,
  handleForgetPassword,
  handleVerifyOtp,
  handleResetPassword,
  handleGetUserProfile,
  handleGetAppliedJobs,
  handleApplyForJob,
  handleDownloadResume,
  handleUpdateResume,
  handleFilterAppliedJobs,
  handleWithdrawApplication,
};

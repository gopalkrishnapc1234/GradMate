const express = require('express');
const {
    handleUserLogin,
    handleUserRegister,
    handleForgetPassword,
    handleVerifyOtp,
    handleGetAppliedJobs,
    handleApplyForJob,
    handleDownloadResume,
    handleUpdateResume,
    handleGetUserProfile,
    handleWithdrawApplication,
    handleFilterAppliedJobs,
    handleResetPassword,
} = require('../controllers/user');

const router = express.Router();
const { upload } = require("../middlewares/uploads");
const { checkForAuthentication } = require("../middlewares/auth");




// User actions
router.post('/register', handleUserRegister);
router.post('/login', handleUserLogin);
router.post('/forgetPassword', handleForgetPassword);
router.post('/verifyOtp', handleVerifyOtp);
router.post('/resetPassword', handleResetPassword);
router.delete("/appliedJobs/:jobId/withdraw", checkForAuthentication, handleWithdrawApplication);
router.get("/appliedJobs/filter", checkForAuthentication, handleFilterAppliedJobs);



// Profile route (logged-in user)
router.get('/profile', checkForAuthentication, handleGetUserProfile);

// Job applications
router.get('/appliedJobs', checkForAuthentication, handleGetAppliedJobs);
router.post('/applyJob', checkForAuthentication, upload.single('resume'), handleApplyForJob);
router.post('/updateResume', checkForAuthentication, upload.single('resume'), handleUpdateResume);
router.get('/downloadResume/:jobId', checkForAuthentication, handleDownloadResume);


module.exports = router;

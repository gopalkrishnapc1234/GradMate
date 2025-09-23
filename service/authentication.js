const JWT = require("jsonwebtoken");
const secret = "$Dev-Utkarsh$";

function createTokenForUser(user) {
    const payload = {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
    }

   const token = JWT.sign(payload, secret, { expiresIn: "1d" }); // 1 day

    return token;
}async function handleVerifyOtp(req, res) {
    try {
        const { fullName, mobileNumber, otp } = req.body;
        // Find user by fullName + mobileNumber
        const user = await User.findOne({ fullName, mobileNumber });
        if (!user) {
            return res.render("verifyOtp", {
                error: "User not found. Please try again."
            });
        }

        // Check OTP and expiry
        if (user.otp === otp && user.otpExpires > Date.now()) {
            // Clear OTP fields after success
            user.otp = undefined;
            user.otpExpires = undefined;
            await user.save();

            return res.render("resetPassword", {
                message: "OTP verified successfully. Please set a new password.",
                fullName: user.fullName,
                mobileNumber: user.mobileNumber
            });
        } else {
            return res.render("verifyOtp", {
                error: "Invalid or expired OTP. Try again.",
                fullName,
                mobileNumber
            });
        }

    } catch (err) {
        console.error("❌ Error verifying OTP:", err.message);
        return res.render("verifyOtp", {
            error: "Something went wrong. Please try again."
        });
    }
}

function validateToken(token) {
    try {
        const payload = JWT.verify(token, secret);
        return payload;
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            console.error("❌ Token expired");
        } else {
            console.error("❌ Invalid token:", err.message);
        }
        return null;
    }
}


module.exports = {
    createTokenForUser,
    validateToken,
    handleVerifyOtp,
}


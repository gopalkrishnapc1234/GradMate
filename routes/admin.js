const express = require("express");
const router = express.Router();
const { checkForAuthentication, checkAdmin } = require("../middlewares/auth");
const { handleAddJob, handleModifyJob, handleDeleteJob } = require("../controllers/job");

// Only admin can add, modify or delete jobs
router.post("/addJob", checkForAuthentication, checkAdmin, handleAddJob);
router.put("/modifyJob/:jobId", checkForAuthentication, checkAdmin, handleModifyJob);
router.delete("/deleteJob/:jobId", checkForAuthentication, checkAdmin, handleDeleteJob);

module.exports = router;

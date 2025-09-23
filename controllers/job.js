const Job = require("../models/job");
const User = require("../models/user");
const fs = require("fs");
const path = require("path");

// ----------------- ADD A NEW JOB -----------------
async function handleAddJob(req, res) {
    try {
        const { title, description, company, location, salary } = req.body;
        const newJob = await Job.create({ title, description, company, location, salary });

        res.status(201).json({ message: "Job added successfully", job: newJob });
    } catch (err) {
        console.error("Error adding job:", err);
        res.status(500).json({ message: "Server error" });
    }
}

// ----------------- MODIFY AN EXISTING JOB -----------------
async function handleModifyJob(req, res) {
    try {
        const { jobId } = req.params;
        const updates = req.body;

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: "Job not found" });

        Object.keys(updates).forEach((key) => (job[key] = updates[key]));
        await job.save();

        res.status(200).json({ message: "Job updated successfully", job });
    } catch (err) {
        console.error("Error updating job:", err);
        res.status(500).json({ message: "Server error" });
    }
}

// ----------------- DELETE A JOB -----------------
async function handleDeleteJob(req, res) {
    try {
        const { jobId } = req.params;
        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: "Job not found" });

        // Remove job from all users' appliedJobs
        await User.updateMany(
            { "appliedJobs.job": jobId },
            { $pull: { appliedJobs: { job: jobId } } }
        );

        await job.remove();
        res.status(200).json({ message: "Job deleted successfully" });
    } catch (err) {
        console.error("Error deleting job:", err);
        res.status(500).json({ message: "Server error" });
    }
}



module.exports = {
    handleAddJob,
    handleModifyJob,
    handleDeleteJob,
};

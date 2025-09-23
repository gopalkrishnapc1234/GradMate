// models/Job.js
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  experience: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
    required: true,
  },
  summary: {
    type: String,
    required: true,
  },
  responsibilities: [String], // Array of strings
  requirements: [String],     // Array of strings
  stack: [String],            // Array of strings
  postedBy: {                 // To track who posted the job (optional)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
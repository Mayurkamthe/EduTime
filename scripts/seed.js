/**
 * Seed Script - creates initial admin user
 * Run: node scripts/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Settings = require('../models/Settings');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Create default settings
  const existing = await Settings.findOne();
  if (!existing) {
    await Settings.create({
      collegeName: 'SPPU Engineering College',
      departmentName: 'Computer Engineering',
      academicYear: '2024-25'
    });
    console.log('Default settings created');
  }

  // Create admin user
  const email = process.argv[2] || 'admin@college.edu';
  const exists = await User.findOne({ email });
  if (exists) {
    console.log(`User ${email} already exists`);
  } else {
    await User.create({ name: 'Admin', email, role: 'admin' });
    console.log(`Admin user created: ${email}`);
  }

  await mongoose.disconnect();
  console.log('Done. Login with the email above — OTP will be sent.');
};

seed().catch(console.error);

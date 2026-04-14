/**
 * Seed Script - creates initial admin user with password
 * Run: node scripts/seed.js
 * Or:  node scripts/seed.js admin@college.edu MyPassword123
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Settings = require('../models/Settings');

const seed = async () => {
  console.log('[SEED] Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[SEED] ✅ Connected');

  // Create default settings
  const existing = await Settings.findOne();
  if (!existing) {
    await Settings.create({
      collegeName: 'SPPU Engineering College',
      departmentName: 'Computer Engineering',
      academicYear: '2024-25'
    });
    console.log('[SEED] Default settings created');
  }

  // Create admin user
  const email = process.argv[2] || 'admin@college.edu';
  const password = process.argv[3] || 'Admin@1234';

  const exists = await User.findOne({ email });
  if (exists) {
    console.log(`[SEED] User ${email} already exists. Updating password...`);
    exists.password = password;
    await exists.save();
    console.log(`[SEED] ✅ Password updated for: ${email}`);
  } else {
    await User.create({ name: 'Admin', email, password, role: 'admin' });
    console.log(`[SEED] ✅ Admin user created: ${email}`);
  }

  console.log(`[SEED] 🔑 Login credentials:`);
  console.log(`        Email   : ${email}`);
  console.log(`        Password: ${password}`);

  await mongoose.disconnect();
  console.log('[SEED] Done.');
};

seed().catch(console.error);


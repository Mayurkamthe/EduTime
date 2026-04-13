const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send OTP email
 * @param {string} to - recipient email
 * @param {string} otp - plain OTP
 */
const sendOTPEmail = async (to, otp) => {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to,
    subject: 'Login OTP - SPPU Timetable System',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #ddd;border-radius:8px;">
        <h2 style="color:#0d6efd;margin-bottom:20px;">SPPU Timetable System</h2>
        <p>Your One-Time Password (OTP) for login:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#0d6efd;padding:20px;background:#f0f4ff;border-radius:6px;text-align:center;margin:20px 0;">
          ${otp}
        </div>
        <p>This OTP expires in <strong>5 minutes</strong>.</p>
        <p style="color:#666;font-size:12px;">If you did not request this, ignore this email.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail };

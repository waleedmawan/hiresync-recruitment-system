const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

async function sendOTPEmail(toEmail, toName, otp) {
  await transporter.sendMail({
    from: `"HireSync" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: 'Verify your HireSync account',
    html: `
      <div style="font-family:Arial,sans-serif; max-width:480px; margin:0 auto; background:#0f1117; color:#e2e8f0; padding:32px; border-radius:12px;">
        <h2 style="font-size:1.4rem; margin-bottom:8px; color:#ffffff;">Welcome to HireSync 👋</h2>
        <p style="color:#94a3b8; font-size:0.9rem; margin-bottom:24px;">Hi ${toName}, please verify your email address to activate your account.</p>

        <div style="background:#1e2330; border:1px solid #2d3748; border-radius:10px; padding:24px; text-align:center; margin-bottom:24px;">
          <p style="color:#94a3b8; font-size:0.8rem; margin-bottom:8px; text-transform:uppercase; letter-spacing:2px;">Your OTP Code</p>
          <div style="font-size:2.5rem; font-weight:700; letter-spacing:12px; color:#5b8dee;">${otp}</div>
          <p style="color:#64748b; font-size:0.75rem; margin-top:12px;">Expires in 10 minutes</p>
        </div>

        <p style="color:#64748b; font-size:0.78rem;">If you did not create a HireSync account, you can safely ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendOTPEmail };
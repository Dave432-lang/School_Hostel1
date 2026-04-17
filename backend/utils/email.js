const nodemailer = require('nodemailer');

// Configure the SMTP securely using env variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Helper to dispatch beautiful HTML emails
 */
const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: '"School Hostel System" <noreply@hostelsystem.edu>',
      to,
      subject,
      html
    });
    console.log(`✉️ Email successfully dispatched to ${to} [${info.messageId}]`);
    return true;
  } catch (error) {
    console.warn(`⚠️ Email delivery skipped/failed for ${to}. (Did you configure SMTP in .env?) Error:`, error.message);
    return false;
  }
};

module.exports = { sendEmail };

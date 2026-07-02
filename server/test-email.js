import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

async function testEmail() {
  console.log('Testing SMTP with:', process.env.SMTP_USER);
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    const info = await transporter.sendMail({
      from: `"ExecutiveHub Test" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // sending to themselves
      subject: 'Test Email Verification',
      text: 'This is a test email.'
    });
    console.log('Success! Email sent:', info.messageId);
  } catch (err) {
    console.error('Error sending email:', err.message);
  }
}

testEmail();

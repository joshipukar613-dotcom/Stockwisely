const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  // Prefer SMTP_* env vars; fallback to mock when not configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  const hasCreds = smtpHost && smtpUser && smtpPass;
  const looksPlaceholder = smtpUser === 'your-email@gmail.com' || smtpPass === 'your-app-specific-password';
  if (!hasCreds || looksPlaceholder) {
    console.log('⚠️  Email credentials not configured. Using mock transporter for development.');
    // Return a mock transporter for development
    return {
      sendMail: async (mailOptions) => {
        console.log('📧 Mock email sent (development mode):');
        console.log(`   To: ${mailOptions.to}`);
        console.log(`   Subject: ${mailOptions.subject}`);
        console.log(`   From: ${mailOptions.from}`);
        return { messageId: 'mock-message-id' };
      }
    };
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for port 465, false for others
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
};

// Send verification email
const sendVerificationEmail = async (email, verificationCode, firstName) => {
  try {
    const transporter = createTransporter();

    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
    const fromName = process.env.FROM_NAME || 'Stock Wisely';

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: 'Verify Your Email - Stock Wisely',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification - Stock Wisely</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Stock Wisely</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Smart Inventory Management</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${firstName},</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">Thank you for signing up for Stock Wisely! To complete your registration, please verify your email address using the verification code below:</p>
            
            <div style="background: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
              <h3 style="margin: 0 0 10px 0; color: #667eea; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</h3>
              <div style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 3px; font-family: 'Courier New', monospace;">${verificationCode}</div>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">This verification code will expire in 24 hours for security reasons.</p>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">If you didn't create this account, you can safely ignore this email.</p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">Stock Wisely Team | Smart inventory management for modern businesses</p>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, firstName) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
    const fromName = process.env.FROM_NAME || 'Stock Wisely';

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: 'Reset Your Password - Stock Wisely',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - Stock Wisely</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Stock Wisely</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Smart Inventory Management</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${firstName},</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">We received a request to reset your password for your Stock Wisely account. Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="font-size: 12px; color: #667eea; word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 5px;">${resetUrl}</p>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">This password reset link will expire in 1 hour for security reasons.</p>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">Stock Wisely Team | Smart inventory management for modern businesses</p>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// Send welcome email
const sendWelcomeEmail = async (email, firstName) => {
  try {
    const transporter = createTransporter();

    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
    const fromName = process.env.FROM_NAME || 'Stock Wisely';

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: 'Welcome to Stock Wisely!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome - Stock Wisely</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Stock Wisely</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Smart Inventory Management</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome to Stock Wisely, ${firstName}!</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">🎉 Your email has been successfully verified and your account is now fully activated!</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">You're now ready to experience the power of smart inventory management. Stock Wisely helps you:</n>
            
            <ul style="font-size: 14px; color: #666; margin-bottom: 20px; padding-left: 20px;">
              <li>📊 Track inventory levels in real-time</li>
              <li>🤖 Get AI-powered demand forecasting</li>
              <li>⚡ Receive instant low-stock alerts</li>
              <li>📈 Generate comprehensive reports</li>
              <li>🔄 Streamline your ordering process</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/dashboard" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Get Started</a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">Need help getting started? Check out our help center or contact our support team.</p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">Stock Wisely Team | Smart inventory management for modern businesses</p>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendEmail: async (to, subject, html, text) => {
    const transporter = createTransporter();
    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
    const fromName = process.env.FROM_NAME || 'Stock Wisely';
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
      ...(text ? { text } : {})
    };
    const info = await transporter.sendMail(mailOptions);
    return info;
  }
};

const bcrypt          = require('bcrypt');
const jwt             = require('jsonwebtoken');
const User            = require('../models/userModel');
const { sendOTPEmail } = require('../utils/mailer');
const logger          = require('../utils/logger');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const L = 'authLayout';

class AuthController {

  static showRegister(req, res) {
    res.render('auth/register', { title: 'Create Account', layout: L, error: null, success: null });
  }

  static showLogin(req, res) {
    res.render('auth/login', { title: 'Sign In', layout: L, error: null, success: null });
  }

  static showVerifyOTP(req, res) {
    const { email } = req.query;
    if (!email) return res.redirect('/auth/login');
    res.render('auth/verifyOtp', { title: 'Verify Email', layout: L, email, error: null });
  }

  static showForgotPassword(req, res) {
    res.render('auth/forgotPassword', { title: 'Forgot Password', layout: L, error: null, success: null });
  }

  static showResetPassword(req, res) {
    const { email } = req.query;
    if (!email) return res.redirect('/auth/forgot-password');
    res.render('auth/resetPassword', { title: 'Reset Password', layout: L, email, error: null });
  }

  static showProfile(req, res) {
    res.render('auth/profile', { title: 'My Profile', user: req.user, error: null, success: null });
  }

  static async register(req, res) {
    try {
      const { name, email, password, confirmPassword } = req.body;

      if (!name || !email || !password || !confirmPassword)
        return res.render('auth/register', { title: 'Create Account', layout: L, error: 'All fields are required.', success: null });

      if (password !== confirmPassword)
        return res.render('auth/register', { title: 'Create Account', layout: L, error: 'Passwords do not match.', success: null });

      if (password.length < 6)
        return res.render('auth/register', { title: 'Create Account', layout: L, error: 'Password must be at least 6 characters.', success: null });

      const existing = await User.findOne({ where: { email } });
      if (existing) {
        if (!existing.isVerified) {
          const otp = generateOTP();
          existing.otp = otp;
          existing.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
          await existing.save();
          await sendOTPEmail(email, existing.name, otp);
          return res.redirect(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
        }
        return res.render('auth/register', { title: 'Create Account', layout: L, error: 'This email is already registered. Please login.', success: null });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const otp = generateOTP();

      await User.create({
        name, email,
        password: hashedPassword,
        role: 'recruiter',
        isVerified: false,
        otp,
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      await sendOTPEmail(email, name, otp);
      logger.info(`OTP sent to ${email}`);
      res.redirect(`/auth/verify-otp?email=${encodeURIComponent(email)}`);

    } catch (err) {
      logger.error('Register error: ' + err.message);
      res.render('auth/register', { title: 'Create Account', layout: L, error: 'Something went wrong. Please try again.', success: null });
    }
  }

  static async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;
      const user = await User.findOne({ where: { email } });

      if (!user)
        return res.render('auth/verifyOtp', { title: 'Verify Email', layout: L, email, error: 'User not found.' });

      if (user.isVerified) return res.redirect('/auth/login');

      if (user.otp !== otp)
        return res.render('auth/verifyOtp', { title: 'Verify Email', layout: L, email, error: 'Invalid OTP. Please try again.' });

      if (new Date() > new Date(user.otpExpiresAt))
        return res.render('auth/verifyOtp', { title: 'Verify Email', layout: L, email, error: 'OTP has expired. Please register again.' });

      user.isVerified = true;
      user.otp = null;
      user.otpExpiresAt = null;
      await user.save();

      logger.info(`Email verified: ${email}`);
      res.render('auth/login', { title: 'Sign In', layout: L, error: null, success: 'Email verified! You can now log in.' });

    } catch (err) {
      logger.error('OTP verify error: ' + err.message);
      res.render('auth/verifyOtp', { title: 'Verify Email', layout: L, email: req.body.email, error: 'Something went wrong.' });
    }
  }

  static async resendOTP(req, res) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ where: { email } });
      if (!user || user.isVerified) return res.redirect('/auth/login');

      const otp = generateOTP();
      user.otp = otp;
      user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      await sendOTPEmail(email, user.name, otp);
      res.redirect(`/auth/verify-otp?email=${encodeURIComponent(email)}`);

    } catch (err) {
      logger.error('Resend OTP error: ' + err.message);
      res.redirect('/auth/login');
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password)
        return res.render('auth/login', { title: 'Sign In', layout: L, error: 'Email and password are required.', success: null });

      const user = await User.findOne({ where: { email } });
      if (!user)
        return res.render('auth/login', { title: 'Sign In', layout: L, error: 'Invalid email or password.', success: null });

      if (!user.isVerified) {
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();
        await sendOTPEmail(email, user.name, otp);
        return res.redirect(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.render('auth/login', { title: 'Sign In', layout: L, error: 'Invalid email or password.', success: null });

      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      });

      logger.info(`User logged in: ${email}`);
      res.redirect('/dashboard');

    } catch (err) {
      logger.error('Login error: ' + err.message);
      res.render('auth/login', { title: 'Sign In', layout: L, error: 'Something went wrong. Please try again.', success: null });
    }
  }

  static logout(req, res) {
    res.clearCookie('token');
    res.redirect('/auth/login');
  }

  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ where: { email } });

      if (!user || !user.isVerified) {
        return res.render('auth/forgotPassword', {
          title: 'Forgot Password', layout: L, error: null,
          success: 'If that email exists, a reset code has been sent.',
        });
      }

      const otp = generateOTP();
      user.otp = otp;
      user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      await sendOTPEmail(email, user.name, otp);

      res.redirect(`/auth/reset-password?email=${encodeURIComponent(email)}`);

    } catch (err) {
      logger.error('Forgot password error: ' + err.message);
      res.render('auth/forgotPassword', { title: 'Forgot Password', layout: L, error: 'Something went wrong.', success: null });
    }
  }

  static async resetPassword(req, res) {
    try {
      const { email, otp, password, confirmPassword } = req.body;
      const user = await User.findOne({ where: { email } });

      if (!user)
        return res.render('auth/resetPassword', { title: 'Reset Password', layout: L, email, error: 'User not found.' });

      if (user.otp !== otp)
        return res.render('auth/resetPassword', { title: 'Reset Password', layout: L, email, error: 'Invalid OTP. Please try again.' });

      if (new Date() > new Date(user.otpExpiresAt))
        return res.render('auth/resetPassword', { title: 'Reset Password', layout: L, email, error: 'OTP has expired. Please request a new one.' });

      if (password !== confirmPassword)
        return res.render('auth/resetPassword', { title: 'Reset Password', layout: L, email, error: 'Passwords do not match.' });

      if (password.length < 6)
        return res.render('auth/resetPassword', { title: 'Reset Password', layout: L, email, error: 'Password must be at least 6 characters.' });

      user.password = await bcrypt.hash(password, 10);
      user.otp = null;
      user.otpExpiresAt = null;
      await user.save();

      logger.info(`Password reset: ${email}`);
      res.render('auth/login', { title: 'Sign In', layout: L, error: null, success: 'Password reset successfully! You can now log in.' });

    } catch (err) {
      logger.error('Reset password error: ' + err.message);
      res.render('auth/resetPassword', { title: 'Reset Password', layout: L, email: req.body.email, error: 'Something went wrong.' });
    }
  }

  static async updateProfile(req, res) {
    try {
      const { name, currentPassword, newPassword, confirmNewPassword } = req.body;
      const user = await User.findByPk(req.user.id);

      if (!user)
        return res.render('auth/profile', { title: 'My Profile', user: req.user, error: 'User not found.', success: null });

      if (name && name.trim()) user.name = name.trim();

      if (newPassword) {
        if (!currentPassword)
          return res.render('auth/profile', { title: 'My Profile', user: req.user, error: 'Enter your current password to change it.', success: null });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch)
          return res.render('auth/profile', { title: 'My Profile', user: req.user, error: 'Current password is incorrect.', success: null });

        if (newPassword !== confirmNewPassword)
          return res.render('auth/profile', { title: 'My Profile', user: req.user, error: 'New passwords do not match.', success: null });

        if (newPassword.length < 6)
          return res.render('auth/profile', { title: 'My Profile', user: req.user, error: 'New password must be at least 6 characters.', success: null });

        user.password = await bcrypt.hash(newPassword, 10);
      }

      await user.save();

      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      });

      logger.info(`Profile updated: ${user.email}`);
      res.render('auth/profile', { title: 'My Profile', user: { ...req.user, name: user.name }, error: null, success: 'Profile updated successfully!' });

    } catch (err) {
      logger.error('Update profile error: ' + err.message);
      res.render('auth/profile', { title: 'My Profile', user: req.user, error: 'Something went wrong.', success: null });
    }
  }
}

module.exports = AuthController;
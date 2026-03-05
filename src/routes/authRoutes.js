const express        = require('express');
const AuthController = require('../controllers/authController');
const requireAuth    = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/register',         AuthController.showRegister);
router.get('/login',            AuthController.showLogin);
router.get('/verify-otp',       AuthController.showVerifyOTP);
router.get('/forgot-password',  AuthController.showForgotPassword);
router.get('/reset-password',   AuthController.showResetPassword);
router.get('/logout',           AuthController.logout);

router.post('/register',        AuthController.register);
router.post('/login',           AuthController.login);
router.post('/verify-otp',      AuthController.verifyOTP);
router.post('/resend-otp',      AuthController.resendOTP);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password',  AuthController.resetPassword);

router.get('/profile',          requireAuth, AuthController.showProfile);
router.post('/profile',         requireAuth, AuthController.updateProfile);

module.exports = router;
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['admin', 'presenter', 'student'],
      default: 'student',
    },
    isVerified: { type: Boolean, default: false },
    verificationOtp: String,
    verificationOtpExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);

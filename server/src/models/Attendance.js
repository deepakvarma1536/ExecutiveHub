import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    playerName: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    joinedAt: { type: Date, default: Date.now },
    meta: {
      ip: String,
      userAgent: String,
      device: String,
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ sessionId: 1, userId: 1 });

export default mongoose.model('Attendance', attendanceSchema);

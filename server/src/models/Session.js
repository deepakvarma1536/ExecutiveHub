import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joinCode: { type: String, unique: true, required: true },
    type: { type: String, enum: ['quiz', 'poll'], default: 'quiz' },
    isLive: { type: Boolean, default: false },
    endedAt: { type: Date },
    topic: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model('Session', sessionSchema);

import mongoose from 'mongoose';

const perQuizSchema = new mongoose.Schema(
  {
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'PostClassQuiz', required: true },
    attempts: { type: Number, default: 0, min: 0 },
    bestScore: { type: Number, default: 0, min: 0 },
    averageScore: { type: Number, default: 0, min: 0 },
    lastAttemptAt: { type: Date },
  },
  { _id: false }
);

const studentPerformanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    userName: { type: String, trim: true },
    totalAttempts: { type: Number, default: 0, min: 0 },
    totalScore: { type: Number, default: 0, min: 0 },
    averageScore: { type: Number, default: 0, min: 0 },
    quizzesTaken: { type: Number, default: 0, min: 0 },
    quizStats: { type: [perQuizSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('StudentPerformance', studentPerformanceSchema);

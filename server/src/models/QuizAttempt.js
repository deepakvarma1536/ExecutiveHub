import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedIndex: { type: Number, required: true, min: 0, max: 3 },
    correct: { type: Boolean, required: true },
    points: { type: Number, required: true, min: 0 },
    responseTimeMs: { type: Number, required: true, min: 0 },
  },
  { _id: false } // sub-documents don't need their own _id
);

const quizAttemptSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PostClassQuiz',
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    guestId: { type: String, trim: true, maxlength: 128, index: true, sparse: true },
    playerName: { type: String, required: true, trim: true },
    answers: {
      type: [answerSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'answers must contain at least one entry',
      },
    },
    totalScore: { type: Number, required: true, min: 0 },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

quizAttemptSchema.index({ userId: 1, completedAt: -1 });
quizAttemptSchema.index({ quizId: 1, completedAt: -1 });

export default mongoose.model('QuizAttempt', quizAttemptSchema);

import mongoose from 'mongoose';

const quizQuestionSchema = new mongoose.Schema({
  prompt: { type: String, required: true, trim: true },
  options: {
    type: [String],
    validate: { validator: (v) => v.length === 4, message: 'options must have exactly 4 items' },
  },
  correctIndex: { type: Number, required: true, min: 0, max: 3 },
  explanation: { type: String, trim: true },
  style: { type: String, enum: ['tricky', 'funny', 'concept'], required: true },
  points: { type: Number, default: 10 },
});

const postClassQuizSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      unique: true,
    },
    questions: [quizQuestionSchema],
    source: { type: String, enum: ['ai', 'manual', 'mixed'], required: true },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('PostClassQuiz', postClassQuizSchema);

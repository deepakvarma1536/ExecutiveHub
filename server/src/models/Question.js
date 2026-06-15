import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    type: { type: String, enum: ['poll', 'quiz', 'wordcloud'], required: true },
    prompt: { type: String, required: true, trim: true },
    options: [
      {
        text: { type: String, required: true },
        votes: { type: Number, default: 0 },
      },
    ],
    position: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Question', questionSchema);

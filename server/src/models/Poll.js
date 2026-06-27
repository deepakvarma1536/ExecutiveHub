import mongoose from 'mongoose';

const voterSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    guestId: { type: String, trim: true, maxlength: 128 },
    playerName: { type: String, trim: true },
    optionIndex: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const optionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    votes: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const pollSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    question: { type: String, required: true, trim: true },
    options: {
      type: [optionSchema],
      validate: {
        validator: (v) => v.length >= 2 && v.length <= 6,
        message: 'A poll must have between 2 and 6 options',
      },
    },
    isOpen: { type: Boolean, default: true },
    voters: { type: [voterSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('Poll', pollSchema);

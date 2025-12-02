import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    round: { type: Number, required: true, min: 1, max: 4, index: true },
    level: { type: Number, required: true, min: 1, max: 3, index: true },
    question: { type: String, required: true, trim: true },
    options: {
      A: { type: String, required: true, trim: true },
      B: { type: String, required: true, trim: true },
      C: { type: String, required: true, trim: true },
      D: { type: String, required: true, trim: true },
    },
    answer: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    points: { type: Number, default: 1, min: 0 }
  },
  { timestamps: true }
);

questionSchema.index({ round: 1, level: 1 });

const Question = mongoose.model('Question', questionSchema);
export default Question;

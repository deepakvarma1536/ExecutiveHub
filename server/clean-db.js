import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Session from './src/models/Session.js';
import Question from './src/models/Question.js';
import PostClassQuiz from './src/models/PostClassQuiz.js';
import Poll from './src/models/Poll.js';
import QuizAttempt from './src/models/QuizAttempt.js';
import StudentPerformance from './src/models/StudentPerformance.js';
import Attendance from './src/models/Attendance.js';

dotenv.config();

async function clean() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const [
      userRes,
      sessionRes,
      questionRes,
      quizRes,
      pollRes,
      attemptRes,
      perfRes,
      attendanceRes
    ] = await Promise.all([
      User.deleteMany({}),
      Session.deleteMany({}),
      Question.deleteMany({}),
      PostClassQuiz.deleteMany({}),
      Poll.deleteMany({}),
      QuizAttempt.deleteMany({}),
      StudentPerformance.deleteMany({}),
      Attendance.deleteMany({})
    ]);

    console.log(`Deleted ${userRes.deletedCount} user account(s).`);
    console.log(`Deleted ${sessionRes.deletedCount} session(s).`);
    console.log(`Deleted ${questionRes.deletedCount} question(s).`);
    console.log(`Deleted ${quizRes.deletedCount} quiz(zes).`);
    console.log(`Deleted ${pollRes.deletedCount} poll(s).`);
    console.log(`Deleted ${attemptRes.deletedCount} attempt(s).`);
    console.log(`Deleted ${perfRes.deletedCount} performance record(s).`);
    console.log(`Deleted ${attendanceRes.deletedCount} attendance record(s).`);

    console.log('\nAll user accounts and data have been completely removed!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

clean();

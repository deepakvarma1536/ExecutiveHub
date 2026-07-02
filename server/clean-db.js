import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import QuizAttempt from './src/models/QuizAttempt.js';
import StudentPerformance from './src/models/StudentPerformance.js';

dotenv.config();

async function clean() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const keepUser = await User.findOne({ email: 'gowrishvarma@gmail.com' });
    const keepUserId = keepUser ? keepUser._id : null;

    if (!keepUserId) {
      console.log('Warning: gowrishvarma@gmail.com was not found in the database. Deleting ALL accounts.');
    } else {
      console.log(`Keeping account: ${keepUser.email}`);
    }

    // 1. Delete all other users
    const userResult = await User.deleteMany({ email: { $ne: 'gowrishvarma@gmail.com' } });
    console.log(`Deleted ${userResult.deletedCount} User accounts.`);

    // 2. Delete all related data for other users
    if (keepUserId) {
      const qaRes = await QuizAttempt.deleteMany({ userId: { $ne: keepUserId } });
      console.log(`Deleted ${qaRes.deletedCount} Quiz Attempts.`);

      const spRes = await StudentPerformance.deleteMany({ userId: { $ne: keepUserId } });
      console.log(`Deleted ${spRes.deletedCount} Student Performances.`);
    } else {
      const qaRes = await QuizAttempt.deleteMany({});
      console.log(`Deleted ${qaRes.deletedCount} Quiz Attempts.`);

      const spRes = await StudentPerformance.deleteMany({});
      console.log(`Deleted ${spRes.deletedCount} Student Performances.`);
    }

    console.log('\nDatabase cleanup complete!');
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

clean();

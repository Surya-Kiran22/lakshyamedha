import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';   

dotenv.config();               
import authRouter from './routes/auth.js';
import questionsRouter from './routes/questions.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4005;

// ✔ Safely load Mongo URI
const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.DEFAULT_MONGO_URI;  // fallback (optional)

async function start() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB');

    // Drop email_1 index if present
    try {
      const usersCol = mongoose.connection.db.collection('users');
      const indexes = await usersCol.indexes();
      const hasEmailIdx = indexes.some((idx) => idx.name === 'email_1');
      if (hasEmailIdx) {
        await usersCol.dropIndex('email_1');
        console.log('🧹 Dropped obsolete index: users.email_1');
      }
    } catch (e) {
      console.warn('Index maintenance warning:', e?.message || e);
    }

    // Routes
    app.use('/api', authRouter);
    app.use('/api/questions', questionsRouter);

    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    // Auto port retry
    const tryListen = (p) => {
      const server = app.listen(p, () => {
        console.log(`🚀 Server running on port ${p}`);
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          const next = Number(p) + 1;
          console.warn(`⚠️ Port ${p} in use, trying ${next}...`);
          tryListen(next);
        } else {
          console.error('Server listen error:', err);
          process.exit(1);
        }
      });
    };

    tryListen(PORT);

  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}

start();

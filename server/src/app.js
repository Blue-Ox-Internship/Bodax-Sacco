import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorMiddleware, notFound } from './middleware/errorMiddleware.js';
import routes from './routes/index.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) return callback(null, true);
      // In development allow everything
      if (env.nodeEnv === 'development') return callback(null, true);
      // In production: allow if CLIENT_URL matches, or allow all if CLIENT_URL not set
      if (!env.clientUrl || origin === env.clientUrl) return callback(null, true);
      // Also allow any subdomain of the same root domain
      try {
        const allowed = new URL(env.clientUrl).hostname;
        const incoming = new URL(origin).hostname;
        if (incoming === allowed || incoming.endsWith(`.${allowed}`)) return callback(null, true);
      } catch { /* ignore parse errors */ }
      callback(new Error('CORS: origin not allowed'));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '5mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'bodax-api' });
});

app.use('/api', routes);
app.use(notFound);
app.use(errorMiddleware);

export default app;

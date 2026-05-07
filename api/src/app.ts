import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import router from './routes/index.js';
import { env } from './config/env.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: env.API_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: env.API_BODY_LIMIT }));
app.use(cookieParser());

app.use('/api/v1', router);

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large' });
  }

  return next(error);
});

export default app;

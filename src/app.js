import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import hpp from 'hpp';
import compression from 'compression';
import errorHandler from './middleware/errorHandler.js';
import logger from './winstonLogger.js';

import taishinJobs from './routes/taishin/jobs.js';
import cathaybkJobs from './routes/cathaybk/jobs.js';
import esunfhcJobs from './routes/esunfhc/jobs.js';
import sinopacJobs from './routes/sinopac/jobs.js';

const app = express();
const port = 3000;

app.use(hpp());
app.use(helmet());

app.use(compression());

app.use(
  morgan('tiny', {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
);
app.use(cors());

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to the Image conversion Service!');
});

app.get('/taishin/jobs', taishinJobs);
app.get('/cathaybk/jobs', cathaybkJobs);
app.get('/esunfhc/jobs', esunfhcJobs);
app.get('/sinopac/jobs', sinopacJobs);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

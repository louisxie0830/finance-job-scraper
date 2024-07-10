import express from 'express';
import rateLimit from 'express-rate-limit';
import { IpFilter } from 'express-ipfilter';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import hpp from 'hpp';
import compression from 'compression';
import timeout from 'express-timeout-handler';
import errorHandler from './middleware/errorHandler.js';
import logger from './winstonLogger.js';

import taishinJobs from './routes/taishin/jobs.js';
import cathaybkJobs from './routes/cathaybk/jobs.js';
import esunfhcJobs from './routes/esunfhc/jobs.js';
import sinopacJobs from './routes/sinopac/jobs.js';
import sinopacJobDetail from './routes/sinopac/jobDetail.js';

const app = express();

app.set('trust proxy', ['127.0.0.1', '::1']);

const port = 3000;

app.use(hpp());
app.use(helmet());
app.use(IpFilter(['127.0.0.1', '::1'], { mode: 'allow' }));

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
app.use(
  timeout.handler({
    timeout: 1200000,
    onTimeout: (req, res) => {
      res.status(503).send('Service unavailable. Please retry.');
    },
    onDelayedResponse: (req, method, args, requestTime) => {
      console.log(`Delayed response after ${requestTime}ms`);
    },
    disable: ['write', 'setHeaders', 'send', 'json', 'end'],
  }),
);

app.get('/', (req, res) => {
  res.send('Welcome to the finance-job-scraper service!');
});

app.get('/taishin/jobs', taishinJobs);
app.get('/cathaybk/jobs', cathaybkJobs);
app.get('/esunfhc/jobs', esunfhcJobs);
app.get('/sinopac/jobs', sinopacJobs);
app.get('/sinopac/job/description', sinopacJobDetail);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

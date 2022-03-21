import express from 'express';
import helmet from 'helmet';
import {
	handleErrors,
	handleNotFound,
} from './middleware.js';

const app = express();

app.use(helmet());
app.use(handleNotFound);
app.use(handleErrors);

export default app;

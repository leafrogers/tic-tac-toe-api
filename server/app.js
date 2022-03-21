import express from 'express';
import helmet from 'helmet';
import {
	handleAuth,
	handleErrors,
	handleNotFound,
} from './middleware.js';

const app = express();

app.use(helmet());
app.use(handleAuth());
app.use(handleNotFound);
app.use(handleErrors);

export default app;

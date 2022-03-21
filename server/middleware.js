import config from '../config.js';
import logger from './logger.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 * @typedef {Error & { status: number }} ExpressError
 */

/**
 * @param {Request} req
 * @param {Response} res
 */
export const handleNotFound = (req, res) => {
	const requestId = req.get('X-Request-ID');
	const response = {
		game: null,
		message: 'Couldn’t find this route',
		status: 404
	};

	logger.warn({ event: 'NOT_FOUND', requestId, ...response });

	res.status(404).json(response);
};

/**
 * @param {ExpressError | HttpError} error
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} _next
 */
// eslint-disable-next-line no-unused-vars
export const handleErrors = (error, req, res, _next) => {
	const requestId = req.get('X-Request-ID');
	const status = error.status || 500;
	const response = {
		game: null,
		message: error.message,
		status
	};

	logger.error({ event: 'REQUEST_ERROR', requestId, ...response }, error.stack);

	res.status(status).json(response);
};

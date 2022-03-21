import config from '../config.js';
import logger from './logger.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 * @typedef {Error & { status: number }} ExpressError
 */

class HttpError extends Error {
	/**
	 * @param {number} status
	 * @param {string} message
	 */
	constructor(status, message) {
		super(message);
		this.status = status;
		this.message = message;
	}
}

export const handleAuth = () => {
	const apiKeys = (config.API_KEYS || '').split(',').filter(Boolean);

	if (!apiKeys.length) {
		throw new Error(
			'At least one API key must be set, but none were found. Set a list of API keys via an environment variable called API_KEYS. The variable’s value should be a string of keys separated by commas. Example: API_KEYS="key1,key2"'
		);
	}

	/**
	 * @param {Request} req
	 * @param {Response} _res
	 * @param {NextFunction} next
	 */
	return (req, _res, next) => {
		const key = req.get('API-Key');
		const requestId = req.get('X-Request-ID');

		if (!key) {
			return next(new HttpError(401, 'API key missing'));
		}

		if (!apiKeys.includes(key)) {
			return next(new HttpError(403, 'Invalid API key'));
		}

		logger.info({
			event: 'AUTH_PASSED',
			keyTail: key.slice(-4),
			requestId
		});

		next();
	};
};

/**
 * @param {Request} _req
 * @param {Response} _res
 * @param {NextFunction} next
 */
export const onlyNonProduction = (_req, _res, next) => {
	if (config.IS_PRODUCTION) {
		return next(
			new HttpError(405, 'This method or route is not allowed in production')
		);
	}

	next();
};

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

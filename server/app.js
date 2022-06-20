import express from 'express';
import helmet from 'helmet';
import logger from './logger.js';
import {
	handleAuth,
	handleErrors,
	handleNotFound,
	onlyNonProduction
} from './middleware.js';
import {
	create as createGame,
	read as readGame,
	remove as removeGame,
	update as updateGame
} from './game.js';

const app = express();

app.use(helmet());
app.use(handleAuth());

app.post('/api/games', (_req, res) => {
	const newGame = createGame();
	res.status(201).json({ game: newGame, status: 201 });
});

app.get('/api/games/:gameId', (req, res, next) => {
	const { playerId } = req.query;
	const options = {};

	if (typeof playerId === 'string') {
		options.playerId = playerId;
	}

	const game = readGame(req.params.gameId, options);

	if (game) {
		return res.status(200).json({ game, status: 200 });
	}

	next();
});

app.delete('/api/games/:gameId', onlyNonProduction, (req, res, next) => {
	const isDeleted = removeGame(req.params.gameId);

	if (isDeleted) {
		return res.sendStatus(204);
	}

	next();
});

app.post('/api/games/:gameId/turn', express.json(), (req, res, next) => {
	const { cellToClaim, playerId } = req.body;
	const game = readGame(req.params.gameId);

	if (!game) {
		return next();
	}

	const {
		game: updatedGame,
		isUpdated,
		message
	} = updateGame(req.params.gameId, {
		cellToClaim,
		playerId
	});

	if (isUpdated) {
		return res.status(200).json({
			game: updatedGame,
			status: 200
		});
	}

	const body = {
		game: null,
		message,
		status: 400
	};

	logger.warn({
		event: 'BAD_REQUEST',
		gameId: req.params.gameId,
		cellToClaim,
		playerId,
		...body
	});

	return res.status(400).json(body);
});

app.use(handleNotFound);
app.use(handleErrors);

export default app;

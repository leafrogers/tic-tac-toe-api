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

app.get('/api/games/:gameUuid', (req, res, next) => {
	const playerUuid = req.get('Player-UUID');
	const game = readGame(req.params.gameUuid, { playerUuid });

	if (game) {
		return res.status(200).json({ game, status: 200 });
	}

	next();
});

app.delete('/api/games/:gameUuid', onlyNonProduction, (req, res, next) => {
	const isDeleted = removeGame(req.params.gameUuid);

	if (isDeleted) {
		return res.sendStatus(204);
	}

	next();
});

app.post('/api/games/:gameUuid/turn', express.json(), (req, res, next) => {
	console.log({ body: req.body });
	const { cellToClaim, playerUuid } = req.body;
	const game = readGame(req.params.gameUuid);

	if (!game) {
		return next();
	}

	const {
		game: updatedGame,
		isUpdated,
		message
	} = updateGame(req.params.gameUuid, {
		cellToClaim,
		playerUuid
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
		gameUuid: req.params.gameUuid,
		cellToClaim,
		playerUuid,
		...body
	});

	return res.status(400).json(body);
});

app.use(handleNotFound);
app.use(handleErrors);

export default app;

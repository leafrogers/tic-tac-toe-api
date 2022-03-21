import express from 'express';
import helmet from 'helmet';
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

app.get('/api/games/:uuid', (req, res, next) => {
	const playerUuid = req.get('Player-UUID');
	const game = readGame(req.params.uuid, { playerUuid });

	if (game) {
		return res.status(200).json({ game, status: 200 });
	}

	next();
});

app.delete('/api/games/:uuid', onlyNonProduction, (req, res, next) => {
	const isDeleted = removeGame(req.params.uuid);

	if (isDeleted) {
		return res.sendStatus(204);
	}

	next();
});

app.post('/api/games/:uuid/turn', express.json(), (req, res, next) => {
	const { cellToClaim, playerUuid } = req.body;
	const game = readGame(req.params.uuid);

	if (!game) {
		return next();
	}

	const {
		game: updatedGame,
		isUpdated,
		message
	} = updateGame(req.params.uuid, {
		cellToClaim,
		playerUuid
	});

	if (isUpdated) {
		return res.status(200).json({
			game: updatedGame,
			status: 200
		});
	}

	return res.status(400).json({
		game: null,
		message,
		status: 400
	});
});

app.use(handleNotFound);
app.use(handleErrors);

export default app;

import { Application, Router } from 'https://deno.land/x/oak@v4.0.0/mod.ts';
import logger from './logger.ts';
// import {
//   handleAuth,
//   handleErrors,
//   handleNotFound,
//   onlyNonProduction,
// } from "./middleware.ts";
import {
	create as createGame,
	read as readGame,
	update as updateGame
} from './game.ts';

const app = new Application();
const router = new Router();

//app.use(handleAuth());

router.post('/api/games', ({ response }) => {
	const newGame = createGame();
	response.status = 201;
	response.type = 'json';
	response.body = { game: newGame, status: 201 };
});

router.get('/api/games/:gameId', ({ params, request, response }, next) => {
	const playerId = request.headers.get('Player-ID') || undefined;
	const game = readGame(params.gameId, { playerId });

	if (game) {
		response.status = 200;
		response.type = 'json';
		response.body = { game, status: 200 };
		return;
	}

	next();
});

router.post(
	'/api/games/:gameId/turn',
	async ({ params, request, response }, next) => {
		const { cellToClaim, playerId } = (await request.body()).value;
		const game = readGame(params.gameId);

		if (!game) {
			return next();
		}

		const {
			game: updatedGame,
			isUpdated,
			message
		} = updateGame(params.gameId || '', {
			cellToClaim,
			playerId
		});

		if (isUpdated) {
			response.status = 200;
			response.type = 'json';
			response.body = {
				game: updatedGame,
				status: 200
			};
			return;
		}

		const body = {
			game: null,
			message,
			status: 400
		};

		logger.warn({
			event: 'BAD_REQUEST',
			gameId: params.gameId,
			cellToClaim,
			playerId,
			...body
		});

		response.status = 400;
		response.type = 'json';
		response.body = body;
	}
);

app.use(router.routes());

//app.use(handleNotFound);
//app.use(handleErrors);

export default app;

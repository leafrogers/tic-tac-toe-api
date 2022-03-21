// eslint-disable-next-line node/no-extraneous-import
import { jest } from '@jest/globals';
import nock from 'nock';
import supertest from 'supertest';
import config from '../config.js';
import app from './app.js';

const requestWithApiKey = supertest.agent(app);

requestWithApiKey.set('API-Key', 'test-key');

const requestWithNoApiKey = supertest.agent(app);
const requestWithBadApiKey = supertest.agent(app);

requestWithBadApiKey.set('API-Key', 'beep-boop');

jest.spyOn(global.console, 'info').mockImplementation(() => {});
jest.spyOn(global.console, 'warn').mockImplementation(() => {});
jest.spyOn(global.console, 'error').mockImplementation(() => {});

describe(`The ${config.APP_FRIENDLY_NAME} app`, () => {
	beforeAll(() => {
		nock.disableNetConnect();
		nock.enableNetConnect('127.0.0.1');
	});

	afterAll(() => {
		nock.enableNetConnect();
	});

	describe('Authentication and authorization', () => {
		it('doesn’t allow calls that omit an API key', async () => {
			const { status } = await requestWithNoApiKey.post('/api/games');
			expect(status).toBe(401);
		});

		it('doesn’t allow calls that include a bad API key', async () => {
			const { status } = await requestWithBadApiKey.post('/api/games');
			expect(status).toBe(403);
		});
	});

	describe('Missing routes', () => {
		it('responds with a 404 for a nonsense route', async () => {
			const { status } = await requestWithApiKey.get('/i/am/not/here');
			expect(status).toBe(404);
		});

		it('responds with a 404 for a non-existent game', async () => {
			const { status } = await requestWithApiKey.get(
				'/api/games/00000000-0000-0000-0000-000000000000'
			);
			expect(status).toBe(404);
		});

		it('responds with a 404 when attempting a turn on an non-existent game', async () => {
			const { status } = await requestWithApiKey.post(
				'/api/games/00000000-0000-0000-0000-000000000000/turn'
			);
			expect(status).toBe(404);
		});
	});

	describe('Creating a game', () => {
		/**
		 * @type {import("superagent").Response}
		 */
		let response;

		beforeEach(async () => {
			response = await requestWithApiKey.post('/api/games');
		});

		afterEach(async () => {
			await requestWithApiKey.delete(`/api/games/${response.body.game.uuid}`);
		});

		it('responds with a 201 on success', async () => {
			expect(response.status).toBe(201);
		});

		it('responds with a full game model on success', async () => {
			const uuidRegEx =
				/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/;

			expect(response.body.game).toEqual({
				board: {
					cells: ['', '', '', '', '', '', '', '', ''],
					winningIndexTrio: null
				},
				hasEnded: false,
				players: [
					{
						isTheirTurn: true,
						isWinner: null,
						name: 'Player O',
						uuid: expect.stringMatching(uuidRegEx)
					},
					{
						isTheirTurn: false,
						isWinner: null,
						name: 'Player X',
						uuid: expect.stringMatching(uuidRegEx)
					}
				],
				uuid: expect.stringMatching(uuidRegEx)
			});
		});

		it('retrieves a game (note the omission of player UUIDs after creation)', async () => {
			const { body } = await requestWithApiKey.get(
				`/api/games/${response.body.game.uuid}`
			);

			const expectedModel = {
				board: {
					cells: ['', '', '', '', '', '', '', '', ''],
					winningIndexTrio: null
				},
				hasEnded: false,
				players: [
					// Player O always starts first
					{ isTheirTurn: true, isWinner: null, name: 'Player O' },
					{ isTheirTurn: false, isWinner: null, name: 'Player X' }
				],
				uuid: response.body.game.uuid
			};

			expect(body.game).toEqual(expectedModel);
		});

		// This lets API clients validate a player UUID, as well as identify
		// when it’s a player’s turn next
		it('retrieves a game and includes a player UUID if it matches with a header', async () => {
			const playerUuidX = response.body.game.players[1].uuid;
			const { body } = await requestWithApiKey
				.get(`/api/games/${response.body.game.uuid}`)
				.set('Player-UUID', playerUuidX);

			const expectedPlayers = [
				{ isTheirTurn: true, isWinner: null, name: 'Player O' },
				{
					isTheirTurn: false,
					isWinner: null,
					name: 'Player X',
					uuid: playerUuidX
				}
			];

			expect(body.game.players).toEqual(expectedPlayers);
		});
	});

	describe('Valid turns', () => {
		/**
		 * @type {string}
		 */
		let gameUuid;
		/**
		 * @type {string}
		 */
		let playerUuidX;
		/**
		 * @type {string}
		 */
		let playerUuidO;

		beforeEach(async () => {
			const { body } = await requestWithApiKey.post('/api/games');
			gameUuid = body.game.uuid;
			playerUuidO = body.game.players[0].uuid;
			playerUuidX = body.game.players[1].uuid;
		});

		afterEach(async () => {
			await requestWithApiKey.delete(`/api/games/${gameUuid}`);
		});

		it('allows a valid turn', async () => {
			const { status } = await requestWithApiKey
				.post(`/api/games/${gameUuid}/turn`)
				.send({ cellToClaim: 0, playerUuid: playerUuidO });

			expect(status).toBe(200);
		});

		it('serves the updated game in the response body', async () => {
			const { body } = await requestWithApiKey
				.post(`/api/games/${gameUuid}/turn`)
				.send({ cellToClaim: 0, playerUuid: playerUuidO });

			expect(body.game.board.cells).toEqual([
				'O',
				'',
				'',
				'',
				'',
				'',
				'',
				'',
				''
			]);
		});

		it('returns the expected change to the game board', async () => {
			await requestWithApiKey
				.post(`/api/games/${gameUuid}/turn`)
				.send({ cellToClaim: 0, playerUuid: playerUuidO });

			const { body } = await requestWithApiKey.get(`/api/games/${gameUuid}`);

			expect(body.game.board.cells).toEqual([
				'O',
				'',
				'',
				'',
				'',
				'',
				'',
				'',
				''
			]);
		});

		it('returns the expected change after a valid turn as player X', async () => {
			// New games always start with player O first, so take their turn
			// to then make it player X’s turn for this test
			await requestWithApiKey
				.post(`/api/games/${gameUuid}/turn`)
				.send({ cellToClaim: 0, playerUuid: playerUuidO });

			// Now it’s player X’s turn
			await requestWithApiKey
				.post(`/api/games/${gameUuid}/turn`)
				.send({ cellToClaim: 2, playerUuid: playerUuidX });

			const { body } = await requestWithApiKey.get(`/api/games/${gameUuid}`);

			expect(body.game.board.cells).toEqual([
				'O',
				'',
				'X',
				'',
				'',
				'',
				'',
				'',
				''
			]);
		});
	});

	describe('Invalid turns', () => {
		/**
		 * @type {string}
		 */
		let gameUuid;
		/**
		 * @type {string}
		 */
		let playerUuidX;
		/**
		 * @type {string}
		 */
		let playerUuidO;

		beforeEach(async () => {
			const { body } = await requestWithApiKey.post('/api/games');
			gameUuid = body.game.uuid;
			playerUuidO = body.game.players[0].uuid;
			playerUuidX = body.game.players[1].uuid;
		});

		afterEach(async () => {
			await requestWithApiKey.delete(`/api/games/${gameUuid}`);
		});

		// TODO: validate json payload

		describe('with invalid parameters', () => {
			it('responds with a 400', async () => {
				const { status } = await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({ pineapple: 1 });

				expect(status).toBe(400);
			});

			it('responds with a message that includes the reason for rejection', async () => {
				const { body } = await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({ pineapple: 1 });

				expect(body.message).toEqual(
					'Player not found; cellToClaim should be a number from 0 through 8'
				);
			});
		});

		describe('when it’s not the player’s turn to take', () => {
			it('responds with a 400', async () => {
				await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({ cellToClaim: 0, playerUuid: playerUuidO });

				const { status } = await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({ cellToClaim: 1, playerUuid: playerUuidO });

				expect(status).toBe(400);
			});

			it('responds with a message that includes the reason for rejection', async () => {
				await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({ cellToClaim: 0, playerUuid: playerUuidO });

				const { body } = await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({ cellToClaim: 1, playerUuid: playerUuidO });

				expect(body.message).toBe('It is not this player’s turn');
			});
		});

		describe('when the given player UUID is invalid', () => {
			it('responds with a 400', async () => {
				const { status } = await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({
						cellToClaim: 0,
						playerUuid: '00000000-0000-0000-0000-000000000000'
					});

				expect(status).toBe(400);
			});

			it('responds with a message that includes the reason for rejection', async () => {
				const { body } = await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({
						cellToClaim: 0,
						playerUuid: '00000000-0000-0000-0000-000000000000'
					});

				expect(body.message).toBe('Player not found');
			});
		});

		describe('when an attempt is made to claim an invalid cell', () => {
			it('responds with a 400', async () => {
				const { status } = await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({
						cellToClaim: 42,
						playerUuid: playerUuidO
					});

				expect(status).toBe(400);
			});

			it('responds with a message that includes the reason for rejection', async () => {
				const { body } = await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({
						cellToClaim: 42,
						playerUuid: playerUuidO
					});

				expect(body.message).toBe(
					'cellToClaim should be a number from 0 through 8'
				);
			});
		});

		describe('when an attempt is made to claim an already-claimed cell', () => {
			it('responds with a 400', async () => {
				await requestWithApiKey.post(`/api/games/${gameUuid}/turn`).send({
					cellToClaim: 0,
					playerUuid: playerUuidO
				});

				const { status } = await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({
						cellToClaim: 0,
						playerUuid: playerUuidX
					});

				expect(status).toBe(400);
			});

			it('responds with a message that includes the reason for rejection', async () => {
				await requestWithApiKey.post(`/api/games/${gameUuid}/turn`).send({
					cellToClaim: 0,
					playerUuid: playerUuidO
				});

				const { body } = await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({
						cellToClaim: 0,
						playerUuid: playerUuidX
					});

				expect(body.message).toBe('This cell has already been claimed');
			});
		});

		describe('when the game has ended because a player had a winning row', () => {
			it('responds with a 400', async () => {
				for (const turn of [
					['O', 0],
					['X', 3],
					['O', 1],
					['X', 4],
					['O', 2]
				]) {
					const [player, cellToClaim] = turn;
					await requestWithApiKey.post(`/api/games/${gameUuid}/turn`).send({
						cellToClaim,
						playerUuid: player === 'O' ? playerUuidO : playerUuidX
					});
				}

				const { status } = await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({
						cellToClaim: 5,
						playerUuid: playerUuidX
					});

				expect(status).toBe(400);
			});

			it('responds with a message that includes the reason for rejection', async () => {
				for (const turn of [
					['O', 0],
					['X', 3],
					['O', 1],
					['X', 4],
					['O', 2]
				]) {
					const [player, cellToClaim] = turn;
					await requestWithApiKey.post(`/api/games/${gameUuid}/turn`).send({
						cellToClaim,
						playerUuid: player === 'O' ? playerUuidO : playerUuidX
					});
				}

				const { body } = await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({
						cellToClaim: 5,
						playerUuid: playerUuidX
					});

				expect(body.message).toBe('This game has already ended');
			});
		});

		describe('when the game has ended because a player had a winning column', () => {
			it('responds with a 400', async () => {
				for (const turn of [
					['O', 1],
					['X', 0],
					['O', 4],
					['X', 2],
					['O', 7]
				]) {
					const [player, cellToClaim] = turn;
					await requestWithApiKey.post(`/api/games/${gameUuid}/turn`).send({
						cellToClaim,
						playerUuid: player === 'O' ? playerUuidO : playerUuidX
					});
				}

				const { status } = await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({
						cellToClaim: 6,
						playerUuid: playerUuidX
					});

				expect(status).toBe(400);
			});

			it('responds with a message that includes the reason for rejection', async () => {
				for (const turn of [
					['O', 1],
					['X', 0],
					['O', 4],
					['X', 2],
					['O', 7]
				]) {
					const [player, cellToClaim] = turn;
					await requestWithApiKey.post(`/api/games/${gameUuid}/turn`).send({
						cellToClaim,
						playerUuid: player === 'O' ? playerUuidO : playerUuidX
					});
				}

				const { body } = await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({
						cellToClaim: 6,
						playerUuid: playerUuidX
					});

				expect(body.message).toBe('This game has already ended');
			});
		});

		describe('when the game has ended because a player had a winning diagonal', () => {
			it('responds with a 400', async () => {
				for (const turn of [
					['O', 2],
					['X', 0],
					['O', 4],
					['X', 3],
					['O', 6]
				]) {
					const [player, cellToClaim] = turn;
					await requestWithApiKey.post(`/api/games/${gameUuid}/turn`).send({
						cellToClaim,
						playerUuid: player === 'O' ? playerUuidO : playerUuidX
					});
				}

				const { status } = await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({
						cellToClaim: 8,
						playerUuid: playerUuidX
					});

				expect(status).toBe(400);
			});

			it('responds with a message that includes the reason for rejection', async () => {
				for (const turn of [
					['O', 2],
					['X', 0],
					['O', 4],
					['X', 3],
					['O', 6]
				]) {
					const [player, cellToClaim] = turn;
					await requestWithApiKey.post(`/api/games/${gameUuid}/turn`).send({
						cellToClaim,
						playerUuid: player === 'O' ? playerUuidO : playerUuidX
					});
				}

				const { body } = await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({
						cellToClaim: 8,
						playerUuid: playerUuidX
					});

				expect(body.message).toBe('This game has already ended');
			});
		});

		describe('when the game has ended because all cells were taken', () => {
			it('responds with a 400', async () => {
				// Simulate a full game being played
				for (let index = 0; index < 9; index += 1) {
					await requestWithApiKey.post(`/api/games/${gameUuid}/turn`).send({
						cellToClaim: index,
						playerUuid: index % 2 === 0 ? playerUuidO : playerUuidX
					});
				}

				const { status } = await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({
						cellToClaim: 0,
						playerUuid: playerUuidX
					});

				expect(status).toBe(400);
			});

			it('responds with a message that includes the reason for rejection', async () => {
				// Simulate a full game being played
				for (let index = 0; index < 9; index += 1) {
					await requestWithApiKey.post(`/api/games/${gameUuid}/turn`).send({
						cellToClaim: index,
						playerUuid: index % 2 === 0 ? playerUuidO : playerUuidX
					});
				}

				const { body } = await requestWithApiKey
					.post(`/api/games/${gameUuid}/turn`)
					.send({
						cellToClaim: 0,
						playerUuid: playerUuidX
					});

				expect(body.message).toBe(
					'This game has already ended; This cell has already been claimed'
				);
			});
		});
	});

	describe('When the game ends', () => {
		/**
		 * @type {string}
		 */
		let gameUuid;
		/**
		 * @type {string}
		 */
		let playerUuidX;
		/**
		 * @type {string}
		 */
		let playerUuidO;

		beforeEach(async () => {
			const { body } = await requestWithApiKey.post('/api/games');
			gameUuid = body.game.uuid;
			playerUuidO = body.game.players[0].uuid;
			playerUuidX = body.game.players[1].uuid;
		});

		afterEach(async () => {
			await requestWithApiKey.delete(`/api/games/${gameUuid}`);
		});

		it('includes an array of the winning cell indexes after a win', async () => {
			for (const turn of [
				['O', 0],
				['X', 3],
				['O', 1],
				['X', 4],
				['O', 2]
			]) {
				const [player, cellToClaim] = turn;
				await requestWithApiKey.post(`/api/games/${gameUuid}/turn`).send({
					cellToClaim,
					playerUuid: player === 'O' ? playerUuidO : playerUuidX
				});
			}

			const { body } = await requestWithApiKey.get(`/api/games/${gameUuid}`);

			expect(body.game.board).toEqual({
				cells: ['O', 'O', 'O', 'X', 'X', '', '', '', ''],
				winningIndexTrio: [0, 1, 2]
			});
		});

		it('includes winning data after a win', async () => {
			for (const turn of [
				['O', 0],
				['X', 3],
				['O', 1],
				['X', 4],
				['O', 2]
			]) {
				const [player, cellToClaim] = turn;
				await requestWithApiKey.post(`/api/games/${gameUuid}/turn`).send({
					cellToClaim,
					playerUuid: player === 'O' ? playerUuidO : playerUuidX
				});
			}

			const { body } = await requestWithApiKey.get(`/api/games/${gameUuid}`);

			expect(body.game.players[0].isWinner).toBe(true);
		});
	});

	describe('Deleting a game', () => {
		const originalIsProduction = config.IS_PRODUCTION;
		/**
		 * @type {string}
		 */
		let gameUuid;

		beforeEach(async () => {
			const { body } = await requestWithApiKey.post('/api/games');
			gameUuid = body.game.uuid;
		});

		afterEach(async () => {
			config.IS_PRODUCTION = false;
			await requestWithApiKey.delete(`/api/games/${gameUuid}`);
			config.IS_PRODUCTION = originalIsProduction;
		});

		// TODO: consider removing this route if this API ever uses a DB:
		// it’s only here as a convenience for development and testing
		it('serves a delete route if not in production', async () => {
			config.IS_PRODUCTION = false;

			const { status } = await requestWithApiKey.delete(
				`/api/games/${gameUuid}`
			);

			expect(status).toEqual(204);
		});

		it('deletes a game if not in production', async () => {
			config.IS_PRODUCTION = false;

			await requestWithApiKey.delete(`/api/games/${gameUuid}`);
			const { status } = await requestWithApiKey.get(`/api/games/${gameUuid}`);

			expect(status).toEqual(404);
		});

		it('doesn’t serve a delete route if in production', async () => {
			config.IS_PRODUCTION = true;

			const { status } = await requestWithApiKey.delete(
				`/api/games/${gameUuid}`
			);

			expect(status).toEqual(405);
		});

		it('doesn’t delete a game if in production', async () => {
			config.IS_PRODUCTION = true;

			await requestWithApiKey.delete(`/api/games/${gameUuid}`);

			const { status } = await requestWithApiKey.get(`/api/games/${gameUuid}`);

			expect(status).toEqual(200);
		});
	});
});

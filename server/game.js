import ShortUniqueId from 'short-unique-id';
import config from '../config.js';

const createId = new ShortUniqueId({ length: config.ID_LENGTH });

/**
 * @type {gameModel[]} games
 */
const games = [];

/**
 * @param {cellValue} cell
 */
const cellIsX = (cell) => cell === 'X';

/**
 * @param {cellValue} cell
 */
const cellIsO = (cell) => cell === 'O';

/**
 * @param {cellValue} cell
 */
const cellIsClaimed = (cell) => cell !== '';

/**
 * @param {gameModel} game
 * @param {object} options
 * @param {boolean} [options.omitPlayerIds]
 * @param {id} [options.playerId] If an API client knows a player ID,
 *  show them which player it belongs to. Helpful for inferring a player’s state.
 */
const toPublicGame = (game, { omitPlayerIds = true, playerId } = {}) => {
	const publicBoard = Array.from(game.board.cells.values());
	const publicGame = JSON.parse(JSON.stringify(game));
	const [playerO, playerX] = publicGame.players;

	publicGame.board.cells = publicBoard;

	if (omitPlayerIds && !playerId) {
		delete playerO.id;
		delete playerO.nextId;
		delete playerX.id;
		delete playerX.nextId;
	} else if (omitPlayerIds && playerId === playerO.id) {
		delete playerX.id;
		delete playerX.nextId;
	} else if (omitPlayerIds && playerId === playerX.id) {
		delete playerO.id;
		delete playerO.nextId;
	}

	return publicGame;
};

/**
 * @returns {gameModel}
 */
export const create = () => {
	/**
	 * @type {gameModel} game
	 */
	const game = {
		board: {
			cells: new Map([
				[0, ''],
				[1, ''],
				[2, ''],
				[3, ''],
				[4, ''],
				[5, ''],
				[6, ''],
				[7, ''],
				[8, '']
			]),
			winningIndexTrio: null
		},
		hasEnded: false,
		nextId: null,
		players: [
			{
				id: createId(),
				isTurn: true,
				isWinner: null,
				name: 'Player O',
				nextId: null
			},
			{
				id: createId(),
				isTurn: false,
				isWinner: null,
				name: 'Player X',
				nextId: null
			}
		],
		id: createId()
	};

	games.push(game);

	return toPublicGame(game, { omitPlayerIds: false });
};

/**
 * @param {id} idToRead
 * @param {{playerId?: id}} options
 * @returns {gameModel | undefined}
 */
export const read = (idToRead, { playerId } = {}) => {
	const game = games.find(({ id }) => id === idToRead);
	const options = {};

	if (!game) {
		return;
	}

	if (
		typeof playerId === 'string' &&
		// TODO: Will need some thought if it ever becomes important to preserve
		// backwards compatibility with varying ID lengths, for any in-progress games
		playerId.length === config.ID_LENGTH
	) {
		options.playerId = playerId;
	}

	return toPublicGame(game, options);
};

/**
 * @param {id} idToUpdate
 * @param {turnModel} turnData
 * @returns {responseFromUpdate}
 */
export const update = (idToUpdate, { cellToClaim, playerId }) => {
	const game = games.find(({ id }) => id === idToUpdate);

	if (!game) {
		return { isUpdated: false, message: 'Game not found' };
	}

	const { board, players } = game;
	const player = players.find((player) => player.id === playerId);
	const { hasEnded } = judgeBoard(board);
	const isValidCellNumber =
		typeof cellToClaim === 'number' && cellToClaim >= 0 && cellToClaim <= 8;
	const isAlreadyClaimedCell = board.cells.get(cellToClaim) !== '';

	const errorMessages = [];

	if (hasEnded) {
		errorMessages.push('This game has already ended');
	}

	if (!player) {
		errorMessages.push('Player not found');
	} else if (!player.isTurn) {
		errorMessages.push('It is not this player’s turn');
	}

	if (!isValidCellNumber) {
		errorMessages.push('cellToClaim should be a number from 0 through 8');
	} else if (isAlreadyClaimedCell) {
		errorMessages.push('This cell has already been claimed');
	}

	if (errorMessages.length) {
		return { isUpdated: false, message: errorMessages.join('; ') };
	}

	board.cells.set(cellToClaim, playerId === players[0].id ? 'O' : 'X');
	players[0].isTurn = !players[0].isTurn;
	players[1].isTurn = !players[1].isTurn;

	const { hasEnded: hasEndedNow, winningIndexTrio } = judgeBoard(game.board);

	if (hasEndedNow) {
		game.hasEnded = hasEndedNow;
		const nextGame = create();

		game.nextId = nextGame.id;
		game.players[0].nextId = nextGame.players[0].id;
		game.players[1].nextId = nextGame.players[1].id;
	}

	if (player && winningIndexTrio?.length) {
		game.board.winningIndexTrio = winningIndexTrio || null;
		player.isWinner = true;
	}

	return { game: toPublicGame(game, { playerId }), isUpdated: true };
};

/**
 * @param {id} idToRemove
 * @returns {boolean} True if removed, otherwise false
 */
export const remove = (idToRemove) => {
	const gameIndex = games.findIndex(({ id }) => id === idToRemove);

	if (gameIndex > -1) {
		games.splice(gameIndex, 1);
		return true;
	}

	return false;
};

/**
 * All the combinations of a 9 cell tic-tac-toe board that would
 * mean a player had won the game, if they claimed all 3 cells in a trio
 *
 * @type {cellNumber[][]}
 */
const winnableIndexTrios = [
	[0, 3, 6], // column 1
	[1, 4, 7], // column 2
	[2, 5, 8], // column 3
	[0, 4, 8], // diagonal 1
	[2, 4, 6], // diagonal 2
	[0, 1, 2], // row 1
	[3, 4, 5], // row 2
	[6, 7, 8] // row 3
];

/**
 * @param {{ cells: cellValue[], winnableIndexTrio: cellNumber[] }} settings
 */
const getCellsByIndexTrio = ({ cells, winnableIndexTrio }) => {
	const [index0, index1, index2] = winnableIndexTrio;
	return [cells[index0], cells[index1], cells[index2]];
};

/**
 * @param {boardModel} board
 */
const judgeBoard = (board) => {
	const cells = Array.from(board.cells.values());
	const winningIndexTrio = winnableIndexTrios.find((winnableIndexTrio) => {
		const cellContentsTrio = getCellsByIndexTrio({
			cells,
			winnableIndexTrio
		});
		return cellContentsTrio.every(cellIsO) || cellContentsTrio.every(cellIsX);
	});
	const hasWinner = Boolean(winningIndexTrio);
	const hasEnded = hasWinner || cells.every(cellIsClaimed);

	return { hasEnded, winningIndexTrio };
};

/**
 * @typedef {0|1|2|3|4|5|6|7|8} cellNumber
 * @typedef {'X'|'O'|''} cellValue
 * @typedef {string} id
 *
 * @typedef boardModel
 * @property {Map<cellNumber, cellValue>} cells
 * @property {cellNumber[] | null} winningIndexTrio
 *
 * @typedef playerModel
 * @property {boolean} isTurn
 * @property {boolean | null} isWinner
 * @property {string} name
 * @property {id | null} nextId
 * @property {id} id
 *
 * @typedef {playerModel[]} playersModel
 *
 * @typedef gameModel
 * @property {boardModel} board
 * @property {boolean} hasEnded
 * @property {id | null} nextId
 * @property {id} id
 * @property {playersModel} players
 *
 * @typedef turnModel
 * @property {cellNumber} cellToClaim
 * @property {id} playerId
 *
 * @typedef responseFromUpdate
 * @property {gameModel} [game]
 * @property {boolean} isUpdated
 * @property {string} [message]
 */

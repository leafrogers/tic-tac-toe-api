import { randomUUID } from 'crypto';

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
 * @param {{ omitPlayerUuids?: boolean }} options
 */
const toPublicGame = (game, { omitPlayerUuids = true } = {}) => {
	const publicBoard = Array.from(game.board.cells.values());
	const publicGame = JSON.parse(JSON.stringify(game));

	publicGame.board.cells = publicBoard;

	if (omitPlayerUuids) {
		delete publicGame.players[0].uuid;
		delete publicGame.players[1].uuid;
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
		players: [
			{
				isTheirTurn: true,
				isWinner: null,
				name: 'Player O',
				uuid: randomUUID()
			},
			{
				isTheirTurn: false,
				isWinner: null,
				name: 'Player X',
				uuid: randomUUID()
			}
		],
		uuid: randomUUID()
	};

	games.push(game);

	return toPublicGame(game, { omitPlayerUuids: false });
};

/**
 * @param {uuid} uuidToRead
 * @returns {gameModel | undefined}
 */
export const read = (uuidToRead) => {
	const game = games.find(({ uuid }) => uuid === uuidToRead);

	if (!game) {
		return;
	}

	return toPublicGame(game);
};

/**
 * @param {uuid} uuidToUpdate
 * @param {turnModel} turnData
 * @returns {responseFromUpdate}
 */
export const update = (uuidToUpdate, { cellToClaim, playerUuid }) => {
	const game = games.find(({ uuid }) => uuid === uuidToUpdate);

	if (!game) {
		return { isUpdated: false, message: 'Game not found' };
	}

	const { board, players } = game;
	const player = players.find((player) => player.uuid === playerUuid);
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
	} else if (!player.isTheirTurn) {
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

	board.cells.set(cellToClaim, playerUuid === players[0].uuid ? 'O' : 'X');
	players[0].isTheirTurn = !players[0].isTheirTurn;
	players[1].isTheirTurn = !players[1].isTheirTurn;

	const { hasEnded: hasEndedNow, winningIndexTrio } = judgeBoard(game.board);

	if (hasEndedNow) {
		game.hasEnded = hasEndedNow;
	}

	if (player && winningIndexTrio?.length) {
		game.board.winningIndexTrio = winningIndexTrio || null;
		player.isWinner = true;
	}

	return { game: toPublicGame(game), isUpdated: true };
};

/**
 * @param {uuid} uuidToRemove
 * @returns {boolean} True if removed, otherwise false
 */
export const remove = (uuidToRemove) => {
	const gameIndex = games.findIndex(({ uuid }) => uuid === uuidToRemove);

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
 * @typedef {string} uuid
 *
 * @typedef boardModel
 * @property {Map<cellNumber, cellValue>} cells
 * @property {cellNumber[] | null} winningIndexTrio
 *
 * @typedef playerModel
 * @property {boolean} isTheirTurn
 * @property {boolean | null} isWinner
 * @property {string} name
 * @property {uuid} uuid
 *
 * @typedef {playerModel[]} playersModel
 *
 * @typedef gameModel
 * @property {boardModel} board
 * @property {boolean} hasEnded
 * @property {playersModel} players
 * @property {uuid} uuid
 *
 * @typedef turnModel
 * @property {cellNumber} cellToClaim
 * @property {uuid} playerUuid
 *
 * @typedef responseFromUpdate
 * @property {gameModel} [game]
 * @property {boolean} isUpdated
 * @property {string} [message]
 */

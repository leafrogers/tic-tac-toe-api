import { uniqueString } from "https://deno.land/x/unique-string@1.0.0/index.js";
import config from "../config.ts";

const createId = () => uniqueString(config.ID_LENGTH);

const games: gameModel[] = [];

const cellIsX = (cell: cellValue) => cell === "X";

const cellIsO = (cell: cellValue) => cell === "O";

const cellIsClaimed = (cell: cellValue) => cell !== "";

type PublicOptions = {
  omitPlayerIds?: boolean;
  playerId?: playerModel["id"];
};

const toPublicGame = (
  game: gameModel,
  { omitPlayerIds = true, playerId }: PublicOptions = {},
) => {
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

export const create = (): gameModel => {
  const game: gameModel = {
    board: {
      cells: new Map([
        [0, ""],
        [1, ""],
        [2, ""],
        [3, ""],
        [4, ""],
        [5, ""],
        [6, ""],
        [7, ""],
        [8, ""],
      ]),
      winningIndexTrio: null,
    },
    hasEnded: false,
    nextId: null,
    players: [
      {
        id: createId(),
        isTurn: true,
        isWinner: null,
        name: "Player O",
        nextId: null,
      },
      {
        id: createId(),
        isTurn: false,
        isWinner: null,
        name: "Player X",
        nextId: null,
      },
    ],
    id: createId(),
  };

  games.push(game);

  return toPublicGame(game, { omitPlayerIds: false });
};

export const read = (
  idToRead?: id,
  { playerId }: { playerId?: id } = {},
): gameModel | undefined => {
  const game = games.find(({ id }) => id === idToRead);
  const options = { playerId: "" };

  if (!game || !idToRead) {
    return;
  }

  if (
    typeof playerId === "string" &&
    // TODO: Will need some thought if it ever becomes important to preserve
    // backwards compatibility with varying ID lengths, for any in-progress games
    playerId.length === config.ID_LENGTH
  ) {
    options.playerId = playerId;
  }

  return toPublicGame(game, options);
};

export const update = (
  idToUpdate: id,
  { cellToClaim, playerId }: turnModel,
): responseFromUpdate => {
  const game = games.find(({ id }) => id === idToUpdate);

  if (!game || !idToUpdate) {
    return { isUpdated: false, message: "Game not found" };
  }

  const { board, players } = game;
  const player = players.find((player) => player.id === playerId);
  const { hasEnded } = judgeBoard(board);
  const isValidCellNumber = typeof cellToClaim === "number" &&
    cellToClaim >= 0 && cellToClaim <= 8;
  const isAlreadyClaimedCell = board.cells.get(cellToClaim) !== "";

  const errorMessages = [];

  if (hasEnded) {
    errorMessages.push("This game has already ended");
  }

  if (!player) {
    errorMessages.push("Player not found");
  } else if (!player.isTurn) {
    errorMessages.push("It is not this player’s turn");
  }

  if (!isValidCellNumber) {
    errorMessages.push("cellToClaim should be a number from 0 through 8");
  } else if (isAlreadyClaimedCell) {
    errorMessages.push("This cell has already been claimed");
  }

  if (errorMessages.length) {
    return { isUpdated: false, message: errorMessages.join("; ") };
  }

  board.cells.set(cellToClaim, playerId === players[0].id ? "O" : "X");
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

export const remove = (idToRemove: id): boolean => {
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
const winnableIndexTrios: cellNumber[][] = [
  [0, 3, 6], // column 1
  [1, 4, 7], // column 2
  [2, 5, 8], // column 3
  [0, 4, 8], // diagonal 1
  [2, 4, 6], // diagonal 2
  [0, 1, 2], // row 1
  [3, 4, 5], // row 2
  [6, 7, 8], // row 3
];

const getCellsByIndexTrio = (
  { cells, winnableIndexTrio }: {
    cells: cellValue[];
    winnableIndexTrio: cellNumber[];
  },
) => {
  const [index0, index1, index2] = winnableIndexTrio;
  return [cells[index0], cells[index1], cells[index2]];
};

const judgeBoard = (board: boardModel) => {
  const cells = Array.from(board.cells.values());
  const winningIndexTrio = winnableIndexTrios.find((winnableIndexTrio) => {
    const cellContentsTrio = getCellsByIndexTrio({
      cells,
      winnableIndexTrio,
    });
    return cellContentsTrio.every(cellIsO) || cellContentsTrio.every(cellIsX);
  });
  const hasWinner = Boolean(winningIndexTrio);
  const hasEnded = hasWinner || cells.every(cellIsClaimed);

  return { hasEnded, winningIndexTrio };
};

type cellNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type cellValue = "X" | "O" | "";
type id = string;
type boardModel = {
  cells: Map<cellNumber, cellValue>;
  winningIndexTrio: cellNumber[] | null;
};

type playerModel = {
  isTurn: boolean;
  isWinner: boolean | null;
  name: string;
  nextId: id | null;
  id: id;
};

type playersModel = playerModel[];

type gameModel = {
  board: boardModel;
  hasEnded: boolean;
  nextId: id | null;
  id: id;
  players: playersModel;
};

type turnModel = {
  cellToClaim: cellNumber;
  playerId: id;
};

type responseFromUpdate = {
  game?: gameModel;
  isUpdated: boolean;
  message?: string;
};

# Tic-tac-toe API

[![CircleCI](https://circleci.com/gh/leafrogers/tic-tac-toe-api.svg?style=svg)](https://circleci.com/gh/leafrogers/tic-tac-toe-api)

An API for creating and managing games of Tic-tac-toe.

- [:thinking: Why does this repo exist?](#thinking-why-does-this-repo-exist)
- [:key: API keys](#key-api-keys)
- [:dart: Endpoints](#dart-endpoints)
- [:warning: Requirements](#warning-requirements)
- [:running: Running on a local machine](#running-running-on-a-local-machine)
- [:information_source: Technical constraints](#information_source-technical-constraints)
- [:pager: Contact](#pager-contact)
- [Licence](#licence)

## :thinking: Why does this repo exist?

This repo exists so that the [the author](https://github.com/leafrogers) can
use it as a playground for learning different web stacks, and for general tinkering.

Please do feel free to use this code, add GitHub issues, or open PRs, but know
that you may not get a timely response.

## :key: API keys

In order to call any of this API’s endpoints, you’ll need to have an API key and to send it via an
`API-Key` header with all your HTTP requests.

If you’re running this repo’s code in an environment you control:

1. Generate an API key that is likely to be unique, like a v4 UUID. A simple way to do this is by
   running `npx uuid` and copying the output
2. Add the generated key to an `API_KEYS` environment variable, as a comma-separated string. For
   example, if
   `API_KEYS` already exists with a value of `example-key-1`, and you’ve generated a new key as
   `example-key-2`, change the `API_KEYS` value to be `example-key-1,example-key-2`.

If you’re not in control of the environment running this repo’s code, find out who has access and
ask them to generate an API key for you.

## :dart: Endpoints

### `POST /api/games`

Send a POST request to `/api/games` and a new Tic-tac-toe game will be created.
No request body is required or supported. The response body will be in JSON format.

#### Example response

`201 Created`

```json
{
	"board": {
		"cells": ["", "", "", "", "", "", "", "", ""],
		"winningIndexTrio": null
	},
	"hasEnded": false,
	"id": "00000",
	"nextId": null,
	"players": [{
		"isTurn": true,
		"isWinner": null,
		"name": "Player O",
		"nextId": null,
		"id": "11111"
	}, {
		"isTurn": false,
		"isWinner": null,
		"name": "Player X",
		"nextId": null,
		"id": "22222"
	}],
}
```

Make note of the players’ IDs from the POST response: you’ll need these to validate a turn later,
because player IDs are omitted from any subsequent responses. This mechanism is intended to provide
rudementary authentication of turns, while keeping the API simple. Think of a player ID as an
API key for that player. The downside is that whoever creates the game must be trusted to know
both players’ IDs!

### `GET /api/games/:gameId`

Send a GET request to `/api/games/:gameId` to receive the current state of your Tic-tac-toe game.
Accepts an optional header, `Player-ID`, if you want to include the ID of a player in the
response. This header is useful for inferring the state of a player, for example: if you want to
serve an HTML page to the player, in order to infer if it’s their turn in the game, you need to know
which of the players in the players array is actually them. In other words, sending the `Player-ID` header lets you identify a player within the response’s players array.

#### Example response of a request with no optional `Player-ID` header

`200 OK`

```json
{
	"board": {
		"cells": ["", "", "", "", "", "", "", "", ""],
		"winningIndexTrio": null
	},
	"hasEnded": false,
	"id": "00000",
	"nextId": null,
	"players": [{
		"isTurn": true,
		"isWinner": null,
		"name": "Player O",
		"nextId": null,
	}, {
		"isTurn": false,
		"isWinner": null,
		"name": "Player X",
		"nextId": null
	}],
}
```

#### Example response of a request with a `Player-ID` header of `22222`

`200 OK`

```json
{
	"board": {
		"cells": ["", "", "", "", "", "", "", "", ""],
		"winningIndexTrio": null
	},
	"hasEnded": false,
	"id": "00000",
	"nextId": null,
	"players": [{
		"isTurn": true,
		"isWinner": null,
		"name": "Player O",
		"nextId": null
	}, {
		"id": "22222",
		"isTurn": false,
		"isWinner": null,
		"name": "Player X",
		"nextId": null
	}],
}
```

### `POST /api/games/:gameId/turn`

Calls to `/api/games/:gameId/turn` will change the state of the game board by taking the requested player’s turn in the game. Requests must include a `Content-Type` header with a value of `application/json`. If a successful response is returned, it will then be the other player’s turn unless you win, or there are no more spaces left on the board.

:information_source: When a game ends, a new game is created automatically and its IDs are shared in
any subsequent responses via a `nextId` property, with the same mechanism in place that omits player IDs unless you specify one with a `Player-ID` header in the request. This approach of perpetually creating subsequent games makes it possible for two players to continue playing each other across multiple games,
without having to share new URLs between each other.

#### Example request


```json
{
	"cellToClaim": 3,
	"playerId": "11111"
}
```

`cellToClaim` should be an integer from 0 through 8, where cells `0`, `1`, and `2` are the first row, `3`, `4`, and `5` are the second, and `6`, `7`, and `8` represent cells from the third row.

`playerId` should be the ID of the player taking a turn. Player IDs were given on creation of the game.

#### Example response

`200 OK`

```json
{
	"board": {
		"cells": ["", "", "", "O", "", "", "", "", ""],
		"winningIndexTrio": null
	},
	"hasEnded": false,
	"id": "00000",
	"nextId": null,
	"players": [{
		"isTurn": false,
		"isWinner": null,
		"name": "Player O",
		"nextId": null
	}, {
		"isTurn": true,
		"isWinner": null,
		"name": "Player X"
		"nextId": null
	}]
}
```

## :warning: Requirements

This code has only been tested on macOS locally and Linux via CI, but it _should_ also work on Windows.

This API requires the following to be installed in order to be able to run it on your local machine.

- [Node](https://www.nodejs.org) (version 16.x.x)

## :running: Running on a local machine

Steps:

- Clone this repo to a local directory
- In your terminal, navigate to the directory and run `npm install`
- After that’s finished, run `npm start`
- Using the URL that’s logged in the console output, you should be able to make requests via something like Postman, Insomnia, cURL, or similar tools.

## :information_source: Technical constraints

This API stores games in memory rather than in a dedicated database, in order to keep the architecture simple. It was designed to run on a free [Heroku](https://www.heroku.com/home) dyno with the assumption that when hosted, the service running this code will be periodically restarted. If you’re hosting this API somewhere other than Heroku and that service doesn’t periodically restart your app, be aware that your games array will grow until NodeJS runs out of memory.

## :pager: Contact

If you have any questions or comments about this app, or need help using it,
please [raise an issue](https://github.com/leafrogers/tic-tac-toe-api/issues).

---

## Licence

This software is published by the Leaf Rogers under the [MIT licence](http://opensource.org/licenses/MIT).
 

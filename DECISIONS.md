# Decisions (oldest first)

1. [Initial notes (2022-03-20)](#initial-notes-2022-03-20)
2. [Changes to API for playing games in succession (2022-04-07)](#changes-to-api-for-playing-games-in-succession-2022-04-07)

## Initial notes (2022-03-20)

### Main goals

- Low barrier to fun, high potential audience
	- Progressively enhanced
		- Leverage www and browser conventions for resilience and predictable behaviour
		- Should work without client-side JavaScript, in case of client-side failure or user choice
	- Lightly tested for accessibility
		- At least AA compliant
		- Tested with VoiceOver
	- Minimal manual work for players
- Simple to maintain or change
	- Minimal dependencies: if the number of production dependencies ever reaches beyond say, 10, something’s gone wrong
	- Each game is ephemeral: it should only live in memory, and only for ~24 hours
	- Minimal file structure: as a rough rule, no more than 2 levels of directory nesting
	- No mechanism for user accounts: if you have the URL for a player’s game state, you can play as that player
	- Only runs client-side JavaScript for modern browsers
	- High test coverage
- Simple to debug and observe
	- Logging: logs are structured and can be threaded together to represent an entire journey from user interaction to data
	- Monitoring
	- Alerts

### Out of scope for now

- User testing beyond a small sample size
	- This is likely to mean missing some a11y issues, such as possible annoyances or cognitive barriers
- Testing of JAWs and other screen readers other than VoiceOver
- Ability to scale horizontally
	- Initially designed to only run in on one server instance, assuming Heroku, with its ephemeral free web dynos

## Changes to API for playing games in succession (2022-04-07)

### Problem

A test user mentioned it was a bit annoying to have to go through the URL sharing process again after already playing a game. These notes are an attempt to think through whether or not this feedback could be used to make improvements, without compromising the initial goals.

### Potential solutions

Solution|Detail|Pros|Cons|Pros/Cons score|Changes needed
---|---|---|---|---|---
*No change:* new game created manually, and manually navigated with new URL sharing||✅ No technical changes needed|❌❌ User friction: sharing new URLs for each game is less fun, negatively affects main goal |-1|
*Reset current game* | Game ends -> a player starts a “new game” -> other player informed| ✅ Technically simpler to reset a game than create and share via the old game’s data model?, ✅ URLs stay the same | ❌ Confusing UX: opponent would have to be informed why the old game had disappeared, ❌ Complicates planned ephemeral nature of games| 0 | 1️⃣ New API endpoing to resetting game model, 2️⃣ Mechanism to show messages to players
🏆 *New game created automatically:* players shown links to new URLs | Example: game ends -> Player X: taps “Play again”-> Player X: Client calls API via UI to create new game -> Player O: Client starts polling -> Player X: Client receives new game URL, shows link to player -> Player O: Client receives new game URL, shows link to player -> Clients stop polling| ✅✅ Most elegant UX solution, directly improves main goal, ✅ Aligns with the goal of ephemeral games (URLs should expire rather than be perpetually renewed) | ❌ Most technical work, ❌ What if creation fails? Would need messaging | 🏆 1 | 1️⃣ Data model change, 2️⃣ New API endpoint (or automatic creation), 3️⃣ Client-side polling changes, 4️⃣ Mechanism to show messages to players

### Chosen solution

> *New game created automatically:* players shown links to new URLs.

Choosing the most elegant UX solution seems best in this case. The technical changes needed aren’t trivial but would make the game much more fun to play, which is the whole point of a game like this, no?
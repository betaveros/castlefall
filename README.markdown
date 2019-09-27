Castlefall
==========

Castlefall ([Castle of the Devil](https://boardgamegeek.com/boardgame/25951/castle-devil) + [Spyfall](https://boardgamegeek.com/boardgame/166384/spyfall)) is a party word game for usually six to ten people, preferably an even number, although it's playable with a few more, somewhat playable with four or five, and playable in some theoretical sense with three. I am informed that it was invented some time in 2017 by some folks at [Epsilon Theta (ET)](http://web.mit.edu/thetans/www/), an independent living group at MIT.

It's hosted (mildly sketchily) at [http://www.bpchen.com/castlefall/](http://www.bpchen.com/castlefall/). You can specify the name of the room you want to be in by appending a hash, e.g. using the link [http://www.bpchen.com/castlefall/#example](http://www.bpchen.com/castlefall/#example) to join the room called "example", or change which room you're in by clicking the "change room" button and typing in the name. (Note that there is no way to discover rooms with other players, as Castlefall is mostly meant to be played by people using the app but primarily coordinating and communicating out of band, most often in real life. There is a basic chat feature, but I think Castlefall is more fun in real life.)

Gameplay
--------

Players should load the site and join the same "room". When somebody starts a round, all players in the round will receive a list of words that was randomly sampled from the larger word list selected when the round was started. This list of words is the same across all players in the round but shuffled differently on each player's device. Each player also receives one of the specific words in this list as "their word". The web app will randomly assign the players to two equally-sized teams (or almost-equally-sized if there are an odd number of players), such that each player on a team has the same word, and the two teams have different words, but players don't know who else is on their team.

(Note: After consulting the original implementation that this was based on, I realized it's possible to play with more than two teams, but I have never played with this rule. Maybe it'll be implemented some day...)

Players begin communicating in a freeform manner, with the goal of trying to figure out either (1) who else is on their team, or (2) what the other team's word is, while trying not to reveal their own word to the other team. You should not show other people your screen or attempt to see another person's screen. If someone asks you to repeat what you've said, it is polite to do so as best you can remember. It is also polite to avoid excessive cryptography.

This freeform communication happens until somebody **declares victory** (usually announced by clapping loudly, since earlier declarations take precedence and there can be a race to be the first to declare). There are two ways to declare victory, which may or may not be successful:

1.  **Choose N players** (including yourself) and claim that they are all on your team. N is usually 3 for 6- to 8-player games and 4 for 9- and 10-player games, although players should feel free to adjust N themselves depending on their experience level. For theoretical smaller games N can be "your entire team", so you must name exactly the set of people on your team, including correctly guessing whether you are on the smaller or larger team if you are in a 3- or 5-player game. *Nobody else can declare victory with this method after you have done so.* Start a one-minute timer, and continue discussing as desired; if nobody declares victory using method 2 after one minute has elapsed, the round ends, and you and your team win if and only if your declaration was correct (otherwise, your team loses and the other team wins).

    During this minute-long phase, it is polite for players to repeat clues they've given to other players that led to the declaration, so that the victory is achieved through clever clues instead of just happening to hear something that others didn't.

    Some detailed suggestions for N:

    - For 6 or fewer players: N = the size of your team, i.e. you must claim exactly the correct team. This means that if there are an odd number of people, you must also guess if you are on the smaller or larger team.
    - For 7 players: For easier games, N = 3; for harder games, N = the sive of your team.
    - For 8 players: N = 3.
    - For 9 players: N = 4; or, you can call in 5 people including yourself, and 4 of them have to be on your team.
    - For 10 people: N = 4.

2.  **Guess the other team's word.** The round immediately ends (overriding any ongoing victory declaration via method 1, if one exists); you and your team win if and only if your guess was correct (otherwise, your team loses and the other team wins).

    Note that, even while a method 1 victory declaration is ongoing, anybody is allowed to declare victory with method 2, including people named in the declaration and even the original declarer themselves.

Note that no matter who made the victory declaration, which team they were on, which method they used, or whether the victory declaration was successful, **you always win or lose together with your team** (the set of people who had the same word as you did).

Also note that the app does not do anything to record or analyze victory declarations, other than revealing the teams and words after the next round starts; it is expected that players will figure out who won themselves, and also keep track of scores if desired (although in the author's experience, Castlefall is usually just played repeatedly without scoring until everybody gets bored).

Strategy
--------

The usual strategy is to give clues about your word that are recognizable to people on your team who are trying to fit that word with the clue, but not so obvious that your opponents will be able to figure out your word from the 17-or-so other options. Castlefall is all about striking this balance. Note that you can react to clues that you don't actually recognize to trick them into thinking you're on their team. You can also give clues about other words, perhaps words that you suspect are the other team's, and see if anybody else reacts to try to guess the other team's word. This runs the risk, however, of tricking somebody into thinking that that other word is actually your word and declaring victory on it; that somebody may or may not be on your team.

More variants
-------------

Words can be replaced by any finite set of distinguishable objects, e.g. Dixit cards. This is not implemented, although you could conceivably use a trivial word list with integers, and map the integers to Dixit cards out of band.

Implementation Notes
--------------------

The app is designed for people who trust each other to play honestly, so there aren't really any access controls. Anybody in the room can kick anybody else, including themselves. If you join a room with the same name as somebody in the current round, you will kick them and see their word; this is meant so that you can reconnect as yourself and keep playing if your device disconnects for some reason.

Setup/Development
-----------------

The server is just Python 3, with Twisted and Autobahn. (Setup a virtualenv if you'd like, then run `pip install -r requirements.txt` to install dependencies.)

The frontend is in the `frontend` directory, and is Yarn + React + TypeScript + Webpack. In theory if you run `yarn install` you'll be able to install everything and get things working. `yarn run webpack-dev-server` gives you a dev server that will automatically refresh when you change the JavaScript, which is pretty nice. (`npm` will probably also work well enough.)

I need to set up a separate uncommitted config file, but for now, set up the Python websockets server running somewhere (run with `prod` as an argument to actually serve to the world), transpile the JS with `websocketURL` pointed to the server, and serve the HTML and transpiled JS page.

Wordlists, simple newline-separated text files, go in the `wordlists/` directory; as an example I've put [EFF's short diceware wordlist](https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases) ([CC-BY 3.0](http://creativecommons.org/licenses/by/3.0/us/)) there. There are more suitable word lists out there, but the copyrightability of word lists is an interesting murky area of copyright law that I'd rather steer clear of, just in case.


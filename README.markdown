Castlefall
==========

Castlefall ([Castle of the Devil](https://boardgamegeek.com/boardgame/25951/castle-devil) + [Spyfall](https://boardgamegeek.com/boardgame/166384/spyfall)) is a party word game for usually six to ten people, preferably an even number, although it's playable with a few more, somewhat playable with four or five, and playable in some theoretical sense with three. I am informed that it was invented some time in 2017 by some folks at [Epsilon Theta (ET)](http://web.mit.edu/thetans/www/), an independent living group at MIT.

Players should load the site and join the same "room". When somebody starts a round, each player in the round will receive a word list, which is the same across all players in the round but shuffled differently on each, and one word from the list. The players are in two equally-sized teams (or almost-equally-sized if there are an odd number of players); each player on a team has the same word, and the two teams have different words, but players don't know who else is on their team.

Players begin discussing, with the goal of trying to figure out who else is on their team or what the other team's word is, while trying not to reveal their own word to the other team. This happens until somebody declares victory (usually signified by clapping loudly, since earlier declarations take precedence). There are two ways to declare victory, which may or may not be successful:

1.  Choose N players (including yourself) and claim that they are on the same team. N is usually 3 for 6- to 8-player games and 4 for 9- and 10-player games, although there's some player choice here. For theoretical smaller games N can be "your entire team", so you must name exactly the set of people on your team, including correctly guessing whether you are on the smaller or larger team if you are in a 3- or 5-player game. Nobody else can declare victory with this method after you have done so. Start a one-minute timer, and continue discussing; if nobody else declares victory using method 2 after one minute has elapsed, the round ends, and you (and your team) win iff your declaration was correct.

2.  Guess the other team's word. The round immediately ends; you and your team win iff your guess was correct.

Note that no matter what the declaration was, you always win or lose with your team (the set of people who had the same word as you did).

Strategy
========

The usual strategy is to give clues about your word that are recognizable to people on your team who are trying to fit that word with the clue, but not so obvious that your opponents will be able to figure out your word from the 17-or-so other options. Castlefall is all about striking this balance. Note that you can react to clues that you don't actually recognize to trick them into thinking you're on their team. You can also give clues about other words, perhaps words that you suspect are the other team's, and see if anybody else reacts to try to guess the other team's word. This runs the risk, however, of tricking somebody into thinking that that other word is actually your word and declaring victory on it; that somebody may or may not be on your team.

Setup/Development
===========

The server is just Python 3, with Twisted and Autobahn.

The frontend is in the `frontend` directory, and is Yarn + React + TypeScript + Webpack. In theory if you run `yarn install` or something you'll be able to install everything and get things working. `yarn run webpack-dev-server` gives you a dev server that will automatically refresh when you change the JavaScript, which is pretty nice.

I need to set up a separate uncommitted config file, but for now, set up the Python websockets server running somewhere (run with `prod` as an argument to actually serve to the world), transpile the JS with `websocketURL` pointed to the server, and serve the HTML and transpiled JS page.

Wordlists, simple newline-separated text files, go in the `wordlists/` directory; as an example I've put [EFF's short diceware wordlist](https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases) ([CC-BY 3.0](http://creativecommons.org/licenses/by/3.0/us/)) there. There are more suitable word lists out there, but the copyrightability of word lists is an interesting murky area of copyright law that I'd rather steer clear of, just in case.

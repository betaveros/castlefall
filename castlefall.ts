import { websocketURL } from "./castlefall-config";

const clientVersion = "v0.4";

let myName: string|undefined = undefined;

function makeKicker(ws: WebSocket, name: string): Element {
	var button = document.createElement('button');
	button.textContent = 'kick';
	button.addEventListener('click', function() {
		ws.send(JSON.stringify({
			kick: name,
		}));
	});
	return button;
}
function clear(node: Element): void {
	while (node.hasChildNodes()) {
		node.removeChild(node.lastChild);
	}
}
function setPlayers(ws: WebSocket, list: string[]): void {
	var node = document.getElementById('players');
	clear(node);
	for (var i0 = 0; i0 < list.length; i0 += 4) {
		var tr = document.createElement('tr');
		var iend = Math.min(i0 + 4, list.length);
		for (var i = i0; i < iend; i++) {
			var name = list[i];
			var td = document.createElement('td');
			if (myName) {
				td.appendChild(makeKicker(ws, name));
			}
			td.appendChild(document.createTextNode(name));
			tr.appendChild(td);
		}
		node.appendChild(tr);
	}
}
function setContents(node: Element, list: string[]): void {
	clear(node);
	list.forEach(function (text) {
		var div = document.createElement('div');
		div.textContent = text;
		node.appendChild(div);
	});
}
function makeContainer(list: string[]): Element {
	// make a div that contains the words in the list, which will be
	// CSS-formatted to be in 2 to 4 columns
	var container = document.createElement('div');
	container.className = 'container';
	setContents(container, list);
	return container;
}
function makeh3(text: string): Element {
	var h3 = document.createElement('h3');
	h3.textContent = text;
	return h3;
}
var lastRound: number = 0;
function createRound(round: number, players: string[], words: string[], word: string|null) {
	lastRound = round;
	var div = document.createElement('div');
	div.className = 'round';
	var roundh3 = makeh3('Round ' + round);
	div.appendChild(roundh3);

	var bodydiv = document.createElement('div');
	bodydiv.appendChild(makeContainer(players));
	bodydiv.appendChild(makeh3('Words'));
	bodydiv.appendChild(makeContainer(words));
	var worddiv = document.createElement('div');
	worddiv.className = 'container';
	if (word) {
		var wordelt = document.createElement('strong');
		wordelt.textContent = word;
		var button = document.createElement('button');
		button.textContent = "show/hide";
		button.addEventListener('click', function () {
			if (wordelt.textContent === word) {
				wordelt.textContent = '';
			} else {
				wordelt.textContent = word;
			}
		});
		worddiv.appendChild(button);
		worddiv.appendChild(document.createTextNode(' Your word is: '));
		worddiv.appendChild(wordelt);
	} else {
		worddiv.appendChild(document.createTextNode('You are spectating'));
	}
	bodydiv.appendChild(worddiv);
	div.appendChild(bodydiv);

	roundh3.addEventListener('click', function () {
		if (!bodydiv.style.display || bodydiv.style.display === 'block') {
			bodydiv.style.display = 'none';
		} else {
			bodydiv.style.display = 'block';
		}
	});

	var rounds = document.getElementById('rounds');
	if (rounds.firstChild) {
		rounds.insertBefore(div, rounds.firstChild);
	} else {
		rounds.appendChild(div);
	}

}
function pad2(i: number): string {
	return (i < 10 ? "0" : "") + i;
}
function displayMessage(cls: string, msg: string): HTMLElement {
	const wrap = document.getElementById('msgwrap');
	const shouldRescroll = (
		wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight < 1);
	const now = new Date();
	const h = pad2(now.getHours());
	const m = pad2(now.getMinutes());
	const s = pad2(now.getSeconds());
	const tr = document.createElement('tr');
	tr.className = cls;
	const td1 = document.createElement('td');
	const td2 = document.createElement('td');
	td1.textContent = h + ":" + m + ":" + s;
	td2.textContent = msg;
	tr.appendChild(td1);
	tr.appendChild(td2);
	document.getElementById("msg").appendChild(tr);
	if (shouldRescroll) {
		wrap.scrollTop = wrap.scrollHeight;
	}
	return tr;
}
function getName(): string {
	return prompt('Enter your name');
}
window.addEventListener("load", function() {
	document.getElementById('cliv').textContent = clientVersion;
	const room = window.location.hash || '#lobby';
	document.getElementById('room').textContent = room;
	myName = getName();
	if (myName) {
		document.getElementById('name').textContent = myName;
	} else {
		document.getElementById('name').textContent = 'spectating ';
		const reloadSup = document.createElement('sup');
		reloadSup.textContent = '(reload to join) ';
		document.getElementById('name').appendChild(reloadSup);
	}
	document.getElementById('roomhelp').addEventListener('click', function() {
		alert("Append #roomname to the URL and reload to go to a new room. (It's hacky. PRs welcome.)");
	});
	const ws = new WebSocket(websocketURL);
	ws.onopen = function () {
		ws.send(JSON.stringify({
			name: myName,
			room: room,
		}));
	};
	ws.onclose = function (event) {
		displayMessage('error', "Connection closed: " + JSON.stringify(event));
	};
	ws.onerror = function (event) {
		displayMessage('error', "Connection error: " + JSON.stringify(event));
	};
	ws.onmessage = function (event) {
		var data = JSON.parse(event.data);
		if (data.version) {
			document.getElementById("serv").textContent = data.version;
		}
		if (data.players) {
			setPlayers(ws, data.players);
		}
		if (data.spectators) {
			let str = data.spectators + " spectator";
			if (data.spectators > 1) { str += "s"; }
			document.getElementById('spectators').textContent = str;
		} else if (data.spectators === 0) {
			document.getElementById('spectators').textContent = "";
		}
		if (data.round) {
			createRound(data.round, data.playersinround, data.words, data.word);
		}
		if (data.error) {
			displayMessage('error', data.error);
		}
		if (data.chat) {
			displayMessage('chat', data.chat.name + ": " + data.chat.msg);
		}
		if (data.timer) {
			const tmpl = data.timer.name + " started the timer! Time left: ";
			const timer = displayMessage('timer', tmpl + "60.000");
			const startMillis: number = new Date().getTime();
			const update = function () {
				const left = 60 - (new Date().getTime() - startMillis) / 1000;
				// const time = document.getElementById('time');
				if (left > 0) {
					timer.childNodes[1].textContent = tmpl + left.toFixed(1);
					setTimeout(update, 37);
					const fraction = left / 60;
					const percent = (100 * fraction) + "%";
					const hue = fraction * 120;
					timer.style.color = 'white';
					timer.style.backgroundRepeat = 'repeat-x';
					timer.style.backgroundImage = ('linear-gradient(to right, hsl(' + hue +
						', 100%, 20%) 0, hsl(' + hue +
						', 100%, 20%) ' + percent +
						', hsl(' + hue +
						', 40%, 10%) ' + percent +
						')');
				} else if (left > -5) {
					timer.style.color = 'black';
					timer.children[1].textContent = tmpl + 0;
					timer.style.backgroundRepeat = 'repeat';
					timer.style.backgroundImage = '';
					const opacity = 0.1 * (left + 5);
					timer.style.backgroundColor = 'hsl(0, 100%, 50%, ' + opacity + ')';
					setTimeout(update, 123);
				} else {
					timer.style.color = 'black';
					timer.style.backgroundColor = 'transparent';
				}
			};
			update();
		}
		if (data.wordlists) {
			var node = document.getElementById('wordlists');
			while (node.hasChildNodes()) {
				node.removeChild(node.lastChild);
			}
			data.wordlists.forEach(function (wordlist) {
				var option = document.createElement('option');
				option.value = wordlist[0];
				option.textContent = wordlist[0] + " (" + wordlist[1] + " words)";
				node.appendChild(option);
			});
		}
	};
	if (myName) {
		document.getElementById('chatform').addEventListener('submit', function(event) {
			let chatNode = document.getElementById('chat') as HTMLInputElement;
			ws.send(JSON.stringify({
				chat: chatNode.value,
			}));
			chatNode.value = "";
			event.preventDefault();
		});
		document.getElementById('broadcast-timer').addEventListener('click', function(event) {
			ws.send(JSON.stringify({
				broadcastTimer: true,
			}));
			event.preventDefault();
		});
		document.getElementById('newround').addEventListener('click', function() {
			let wordlistNode = document.getElementById('wordlists') as HTMLSelectElement;
			let wordcountNode = document.getElementById('wordcount') as HTMLInputElement;
			const wordlist = wordlistNode.options[wordlistNode.selectedIndex].value;
			ws.send(JSON.stringify({
				start: {
					round: lastRound,
					wordlist: wordlist,
					wordcount: wordcountNode.value,
				},
			}));
		});
	} else {
		document.getElementById('newround').setAttribute('disabled', 'disabled');
		document.getElementById('wordlists').setAttribute('disabled', 'disabled');
		document.getElementById('wordcount').setAttribute('disabled', 'disabled');
		document.getElementById('chat').setAttribute('disabled', 'disabled');
		document.getElementById('broadcast-timer').setAttribute('disabled', 'disabled');
	}
});

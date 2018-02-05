import { websocketURL } from "./castlefall-config";

const clientVersion = "v0.3.1";

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
var startMillis: number = new Date().getTime();
function updateTime() {
	var left = 60 - (new Date().getTime() - startMillis) / 1000;
	var time = document.getElementById('time');
	var timer = document.getElementById('timer');
	if (left > 0) {
		document.getElementById('time').textContent = left.toFixed(3);
		setTimeout(updateTime, 37);
		const fraction = left / 60;
		const percent = (100 * fraction) + "%";
		const hue = fraction * 120;
		timer.style.backgroundRepeat = 'repeat-y, repeat-x';
		timer.style.backgroundImage = ('linear-gradient(to right, hsla(' + hue +
			', 100%, 50%, 0.3) 0, hsla(' + hue +
			', 100%, 50%, 0.3) ' + percent +
			', transparent ' + percent +
			'), linear-gradient(to bottom,#668 0,#224 100%)');
	} else {
		document.getElementById('time').textContent = '0';
		timer.style.backgroundRepeat = '';
		timer.style.backgroundImage = '';
	}
}
function pad2(i: number): string {
	return (i < 10 ? "0" : "") + i;
}
function displayMessage(msg: string): void {
	const now = new Date();
	const h = pad2(now.getHours());
	const m = pad2(now.getMinutes());
	const s = pad2(now.getSeconds());
	const div = document.createElement('div');
	div.textContent = h + ":" + m + ":" + s + ": " + msg;
	document.getElementById("msg").appendChild(div);
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
		displayMessage("Connection closed: " + JSON.stringify(event));
	};
	ws.onerror = function (event) {
		displayMessage("Connection error: " + JSON.stringify(event));
	};
	ws.onmessage = function (event) {
		var data = JSON.parse(event.data);
		if (data.version) {
			document.getElementById("serv").textContent = data.version;
		}
		if (data.players) {
			setPlayers(ws, data.players);
		}
		if (data.round) {
			createRound(data.round, data.playersinround, data.words, data.word);
		}
		if (data.msg) {
			document.getElementById("msg").textContent = data.msg;
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
	}
	document.getElementById('timer').addEventListener('click', function() {
		startMillis = new Date().getTime();
		updateTime();
	});
});

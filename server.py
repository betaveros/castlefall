import sys
import random
import json
import collections
from twisted.web.static import File
from twisted.python import log
from twisted.web.server import Site
from twisted.internet import reactor
import itertools
import codecs
import time
import os
from typing import Dict, List, Iterable, Any, Union, Optional, Tuple

from autobahn.twisted.websocket import WebSocketServerFactory, \
    WebSocketServerProtocol

from autobahn.twisted.resource import WebSocketResource

# clients need to send:
# - on join, a user name and a room name
# - "start round"
# - "next round"
# servers need to send:
# - updated lists of users in the room
# - a round number, a wordlist, and a word

wordlists: Dict[str, List[str]] = {}

version = "v0.5"

wordlist_directory = 'wordlists'

for filename in os.listdir(wordlist_directory):
    with open(os.path.join(wordlist_directory, filename)) as infile:
        key = filename
        if key.endswith('.txt'): key = key[:-4]
        wordlists[key] = [line.strip() for line in infile]

class CastlefallProtocol(WebSocketServerProtocol):
    def onOpen(self) -> None: pass

    def connectionLost(self, reason) -> None:
        self.factory.unregister(self)

    def onMessage(self, payload: Union[str, bytes], isBinary: bool) -> None:
        assert isinstance(self.factory, CastlefallFactory)
        if isinstance(payload, bytes):
            payload = codecs.decode(payload, 'utf-8')
        data = json.loads(payload)
        if 'name' in data:
            room_name = data['room']
            name = data.get('name')
            print('{}: registering as {}'.format(self.peer, name))
            self.factory.register(room_name, name, self)
        if 'start' in data:
            start_val = data['start']
            print('{}: start {}'.format(self.peer, start_val))
            self.factory.start_round(self, start_val)
        if 'kick' in data:
            kick_target = data['kick']
            print('{}: kicking {}'.format(self.peer, kick_target))
            self.factory.kick(self, kick_target)
        if 'chat' in data:
            chat_message = data['chat']
            print('{} says: {}'.format(self.peer, chat_message))
            self.factory.chat(self, chat_message)
        if 'broadcastTimer' in data:
            print('{} starts the timer'.format(self.peer))
            self.factory.broadcast_timer(self)

def json_to_bytes(obj: dict) -> bytes:
    return codecs.encode(json.dumps(obj), 'utf-8')

class ClientStatus:
    def __init__(self, room: str, name: Optional[str]) -> None:
        self.room = room
        self.name = name

class Room:
    def __init__(self) -> None:
        self.d: Dict[str, CastlefallProtocol] = {}
        self.spectators: Dict[str, CastlefallProtocol] = {}
        self.round = 0
        self.round_starter = ""
        self.last_start = time.time()
        self.players_in_round: List[str] = []
        self.assigned_words: Dict[str, str] = {}
        self.words: List[str] = []
        self.words_left: Dict[str, List[str]] = collections.defaultdict(list)

    def has_player(self, name: str) -> bool:
        return name in self.d

    def get_player_names(self) -> List[str]:
        return list(sorted(self.d.keys()))

    def get_player_client(self, name: str) -> CastlefallProtocol:
        return self.d[name]

    def set_player_client(self, name: str, p: CastlefallProtocol) -> None:
        self.d[name] = p

    def get_clients(self) -> Iterable[CastlefallProtocol]:
        return itertools.chain(self.d.values(), self.spectators.values())

    def add_spectator(self, client: CastlefallProtocol) -> None:
        self.spectators[client.peer] = client

    def get_num_spectators(self) -> int:
        return len(self.spectators)

    def delete_spectator(self, client: CastlefallProtocol) -> None:
        if client.peer in self.spectators:
            del self.spectators[client.peer]

    def get_named_player_clients(self) -> Iterable[Tuple[str, CastlefallProtocol]]:
        return self.d.items()

    def get_named_all_clients(self) -> Iterable[Tuple[Optional[str], CastlefallProtocol]]:
        return itertools.chain(self.d.items(), zip(itertools.repeat(None), self.spectators.values()))

    def delete_player_client(self, name: str) -> None:
        del self.d[name]

    def clear_assigned_words(self):
        self.assigned_words = {}

    def get_assigned_word(self, name: str) -> Optional[str]:
        return self.assigned_words.get(name)

    def set_assigned_word(self, name: str, word: str) -> None:
        self.assigned_words[name] = word

    def select_words(self, key: str, num: int) -> List[str]:
        left = self.words_left[key]
        if len(left) < num:
            print('(Re)shuffling words for {} {}'.format(key, num))
            left = list(wordlists[key])
            random.shuffle(left)
        self.words_left[key] = left[num:]
        return left[:num]

    def start_round(self, starter: str, val: dict) -> None:
        if self.round != val.get('round'):
            raise Exception('Start fail: round out of sync')
        if time.time() < self.last_start + 2:
            raise Exception('Start fail: too soon')
        self.round += 1
        self.round_starter = starter
        self.last_start = time.time()
        try:
            wordcount = int(val.get('wordcount', 18))
        except ValueError as e:
            wordcount = 18

        words = self.select_words(val['wordlist'], wordcount)
        named_clients = list(self.get_named_player_clients())
        random.shuffle(named_clients)
        half = len(named_clients) // 2
        word1, word2 = random.sample(words, 2)
        self.players_in_round = list(self.get_player_names())
        self.clear_assigned_words()
        self.words = words
        print(', '.join(words))
        for i, (name, client) in enumerate(named_clients):
            word = word2 if i >= half else word1
            self.set_assigned_word(name, word)

    def get_words_shuffled(self) -> List[str]:
        copy = list(self.words)
        random.shuffle(copy)
        return copy

class CastlefallFactory(WebSocketServerFactory):
    def __init__(self, *args, **kwargs):
        super(CastlefallFactory, self).__init__(*args, **kwargs)
        # room -> (name -> client)
        self.rooms: Dict[str, Room] = collections.defaultdict(Room)
        self.status_for_peer: Dict[str, ClientStatus] = {} # peer -> status

    def players_in_room(self, room: str) -> List[str]:
        return list(sorted(self.rooms[room].get_player_names()))

    def register(self, room_name: str, name: Optional[str],
            client: CastlefallProtocol) -> None:
        room = self.rooms[room_name]
        if name:
            if room.has_player(name):
                old_client = room.get_player_client(name)
                self.send(old_client, {
                    'error': 'Disconnected: your name was taken.',
                })
                del self.status_for_peer[old_client.peer]
                # del room_dict[name] # will get overwritten

            room.set_player_client(name, client)
            self.status_for_peer[client.peer] = ClientStatus(room_name, name)
            self.broadcast(room, {'players': room.get_player_names()})
        else:
            # spectator
            room.add_spectator(client)
            self.status_for_peer[client.peer] = ClientStatus(room_name, None)
            self.broadcast(room, {'spectators': room.get_num_spectators()})

        self.send(client, {
            'players': room.get_player_names(),
            'spectators': room.get_num_spectators(),
            'room': room_name,
            'round': room.round,
            'starter': room.round_starter,
            'playersinround': room.players_in_round,
            'words': room.get_words_shuffled(),
            'word': room.get_assigned_word(name) if name else None,
            'wordlists': [[k, len(v)] for k, v in sorted(wordlists.items())],
            'version': version,
        })

    def unregister(self, client: CastlefallProtocol) -> None:
        if client.peer in self.status_for_peer:
            status = self.status_for_peer[client.peer]
            del self.status_for_peer[client.peer]
            room = self.rooms[status.room]
            if status.name:
                if room.has_player(status.name):
                    room.delete_player_client(status.name)
                else:
                    print("client's peer had name, but its name wasn't there :(")
            else:
                # spectator
                room.delete_spectator(client)
            self.broadcast(room, {
                'players': room.get_player_names(),
                'spectators': room.get_num_spectators(),
            })

    def kick(self, client: CastlefallProtocol, name: str):
        _, room = self.name_and_room_playing_in(client)
        if not room: return
        if room.has_player(name):
            client = room.get_player_client(name)
            self.send(client, {
                'error': 'Disconnected: you were kicked.',
            })
            room.delete_player_client(name)
            if client.peer in self.status_for_peer:
                del self.status_for_peer[client.peer]
            else:
                print("name had client, but the peer wasn't there :(")
        self.broadcast(room, {'players': room.get_player_names()})

    def chat(self, client: CastlefallProtocol, chat_message: str):
        name, room = self.name_and_room_playing_in(client)
        if room:
            self.broadcast(room, {'chat': {
                'name': name,
                'msg': chat_message,
            }})
        else:
            print("client's peer had name, but its name wasn't there :(")

    def broadcast_timer(self, client: CastlefallProtocol):
        name, room = self.name_and_room_playing_in(client)
        if room:
            self.broadcast(room, {'timer': {
                'name': name,
            }})

    def broadcast(self, room: Room, obj: dict) -> None:
        payload = json_to_bytes(obj)
        for client in room.get_clients():
            client.sendMessage(payload)

    def send(self, client: CastlefallProtocol, obj: dict) -> None:
        client.sendMessage(json_to_bytes(obj))

    def name_and_room_playing_in(self, client: CastlefallProtocol) -> Tuple[Optional[str], Optional[Room]]:
        """The name and room the client is playing in.

        If the client is not playing in a room, including if the client is
        spectating, return None, None."""
        if client.peer in self.status_for_peer:
            status = self.status_for_peer[client.peer]
            name = status.name
            room = self.rooms[status.room]
            if name:
                if room.has_player(name):
                    return name, room
                else:
                    print("client's peer had name, but its name wasn't there :(")
            # else, is spectating
        return None, None

    def start_round(self, orig_client: CastlefallProtocol, val: dict) -> None:
        client_name, room = self.name_and_room_playing_in(orig_client)
        if client_name and room:
            try:
                room.start_round(client_name, val)
                for name, client in room.get_named_all_clients():
                    self.send(client, {
                        'round': room.round,
                        'starter': room.round_starter,
                        'playersinround': room.players_in_round,
                        'words': room.get_words_shuffled(),
                        'word': room.get_assigned_word(name) if name else None,
                    })
            except Exception as e:
                self.send(orig_client, {
                    'error': str(e),
                })

if __name__ == "__main__":
    log.startLogging(sys.stdout)

    if len(sys.argv) > 1 and sys.argv[1] == "prod":
        print("Prod server")
        factory = CastlefallFactory("ws://127.0.0.1:8372")
    else:
        print("Dev server")
        factory = CastlefallFactory("ws://localhost:8372")

    factory.protocol = CastlefallProtocol
    resource = WebSocketResource(factory)

    reactor.listenTCP(8372, factory)
    reactor.run()

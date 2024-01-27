import React, { Component, PureComponent } from "react";
import ReactDOM from "react-dom";
import { WEBSOCKET_URL } from "./config";

const CLIENT_VERSION = "v0.9.2";

type PlayerStatus = "active" | "disconnected";
type Player = {
  name: string;
  status: PlayerStatus;
};

const Kicker = ({ ws, name }: { ws: WebSocket; name: string }) => {
  const handleClick = () => {
    ws.send(JSON.stringify({ kick: name }));
  };
  return <button onClick={handleClick}>kick</button>;
};

const PlayerTable = ({
  canKick,
  ws,
  players
}: {
  canKick: boolean;
  ws: WebSocket | undefined;
  players: Player[];
}) => {
  let playerRows = [];

  for (let i0 = 0; i0 < players.length; i0 += 4) {
    const iend = Math.min(i0 + 4, players.length);
    let row = [];
    for (let i = i0; i < iend; i++) {
      row.push(players[i]);
    }
    playerRows.push(row);
  }

  return (
    <table>
      <tbody>
        {playerRows.map((row, i) => (
          <tr key={i}>
            {row.map(({ name, status }) => (
              <td key={name} className={status}>
                {canKick && !!ws && <Kicker ws={ws} name={name} />}
                {name}
                {status === "disconnected" && " (disconnected)"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const ColumnContainer = ({ list }: { list: React.ReactNode[] }) => {
  return (
    <div className="container">
      {list.map((node, i) => (
        <div key={i}>{node}</div>
      ))}
    </div>
  );
};

type RoundPlayer = {
  name: string;
  word: string | undefined;
};
type Round = {
  roundNumber: number;
  players: RoundPlayer[];
  wordlist: string;
  words: string[];
  word: string | undefined;
  status: "active" | "spoiled";
  secondsAgo?: number;
};

type RoundComponentProps = {
  round: Round;
  myName: string | undefined;
};

class RoundComponent extends Component<
  RoundComponentProps,
  { shown: boolean }
> {
  constructor(props: RoundComponentProps) {
    super(props);
    this.state = { shown: true };
  }

  toggleShown = () => {
    console.log("yay");
    this.setState(({ shown }) => ({
      shown: !shown
    }));
  };

  renderWordDiv = () => {
    const { word } = this.props.round;
    const { shown } = this.state;

    if (word) {
      return (
        <div className="container">
          <button onClick={this.toggleShown}>show/hide</button> Your word is:{" "}
          <strong style={{ display: shown ? "inline" : "none" }}>{word}</strong>
        </div>
      );
    } else {
      return <div className="container">You are spectating</div>;
    }
  };

  renderTeamDescription(playerCount: number) {
    let countDescription = playerCount === 1 ? "1 player" : `${playerCount} players`;
    let teamDescription = (playerCount <= 2 ? "¯\\_(ツ)_/¯" :
        `= ${Math.ceil(playerCount / 2)} vs ${Math.floor(playerCount / 2)}`);
    return `(${countDescription} ${teamDescription})`;
  }

  render() {
    const {
      round: { roundNumber, players, words, word: roundWord, wordlist, status },
      myName
    } = this.props;

    return (
      <div className={`round ${status}`}>
        <h3>
          Round {roundNumber}{" "}
          <span className="round-stats">
            {this.renderTeamDescription(players.length)}
          </span>
        </h3>
        <ColumnContainer
          list={players.map(({ name, word }) => {
            if (word) {
              return (
                <div className={word === roundWord ? "same" : undefined}>
                  {name}: {word}
                </div>
              );
            } else {
              return (
                <div className={name === myName ? "same" : undefined}>
                  {name}
                </div>
              );
            }
          })}
        />
        <h3>Words {wordlist && <span className="wordlist-name">({words.length} from {wordlist})</span>}</h3>
        <ColumnContainer list={words} />
        {this.renderWordDiv()}
      </div>
    );
  }
}

const pad2 = (i: number): string => {
  return (i < 10 ? "0" : "") + i;
};

class DateTd extends PureComponent<{ date: Date }> {
  render() {
    const { date } = this.props;
    const h = pad2(date.getHours());
    const m = pad2(date.getMinutes());
    const s = pad2(date.getSeconds());
    return (
      <td>
        {h}:{m}:{s}
      </td>
    );
  }
}

const TIMER_FADE_OUT_SECONDS = 5;

type TimerProps = {
  template: string;
  date: Date;
  totalSeconds: number;
};

class TimerRow extends Component<TimerProps, { currentDate: Date }> {
  interval: number | undefined;

  constructor(props: TimerProps) {
    super(props);

    this.state = {
      currentDate: props.date
    };
    this.interval = undefined;
  }

  componentDidMount() {
    this.interval = window.setInterval(this.update, 37);
  }

  componentWillUnmount() {
    if (this.interval !== undefined) {
      window.clearInterval(this.interval);
    }
  }

  update = () => {
    const { date, totalSeconds } = this.props;
    const currentDate = new Date();
    const secondsLeft =
      totalSeconds - (currentDate.getTime() - date.getTime()) / 1000;

    this.setState({ currentDate });

    if (secondsLeft < -TIMER_FADE_OUT_SECONDS && this.interval !== undefined) {
      window.clearInterval(this.interval);
    }
  };

  render() {
    const { template, date, totalSeconds } = this.props;
    const { currentDate } = this.state;
    const secondsLeft =
      totalSeconds - (currentDate.getTime() - date.getTime()) / 1000;

    if (secondsLeft > 0) {
      const fraction = secondsLeft / totalSeconds;
      const percent = 100 * fraction + "%";
      const hue = fraction * 120;
      return (
        <tr
          style={{
            color: "white",
            backgroundRepeat: "repeat-x",
            backgroundImage: `linear-gradient(to right, hsl(${hue}, 100%, 20%) 0, hsl(${hue}, 100%, 20%) ${percent}, hsl(${hue}, 40%, 10%) ${percent})`
          }}
        >
          <DateTd date={date} />
          <td>
            {template} {secondsLeft.toFixed(1)}
          </td>
        </tr>
      );
    } else if (secondsLeft > -TIMER_FADE_OUT_SECONDS) {
      const opacity = 0.1 * (secondsLeft + TIMER_FADE_OUT_SECONDS);
      return (
        <tr
          style={{
            color: "black",
            backgroundRepeat: "repeat",
            backgroundColor: `hsl(0, 100%, 50%, ${opacity})`
          }}
        >
          <DateTd date={date} />
          <td>{template} 0</td>
        </tr>
      );
    } else {
      return (
        <tr>
          <DateTd date={date} />
          <td>{template} 0</td>
        </tr>
      );
    }
  }
}

type MessageType = "roundstart" | "roundstartpast" | "connect" | "error" | "chat" | "timer" | "setting";
type ConnectType = "load" | "changeroom" | "unspectate";

type Message = {
  type: MessageType;
  content: string;
  timerLength?: number;
  date: Date;
};

class MessageComponent extends Component<{ message: Message }> {
  render() {
    const { message } = this.props;

    if (message.type === "timer" && message.timerLength) {
      return (
        <TimerRow
          template={`${message.content} started the timer! Time left:`}
          date={message.date}
          totalSeconds={message.timerLength}
        />
      );
    } else {
      return (
        <tr className={message.type}>
          <DateTd date={message.date} />
          <td>{message.content}</td>
        </tr>
      );
    }
  }
}

class MessageTable extends Component<{ messages: Message[] }> {
  render() {
    return (
      <table className="msg">
        <tbody>
          {this.props.messages.map((message: Message, index: number) => (
            <MessageComponent message={message} key={index} />
          ))}
        </tbody>
      </table>
    );
  }
}

type ChatFormProps = { disabled: boolean; ws: WebSocket | undefined };

class ChatForm extends Component<ChatFormProps, { value: string }> {
  constructor(props: ChatFormProps) {
    super(props);
    this.state = { value: "" };
  }

  handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ value: event.target.value });
  };

  handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { ws } = this.props;
    const { value } = this.state;

    if (ws) {
      ws.send(
        JSON.stringify({
          chat: value
        })
      );
    }

    this.setState({ value: "" });
  };

  render() {
    const { disabled, ws } = this.props;

    return (
      <form className="chatform" onSubmit={this.handleSubmit}>
        <input
          type="text"
          className="text chatbox"
          placeholder="Chat..."
          size={40}
          value={this.state.value}
          onChange={this.handleChange}
          disabled={disabled || !ws}
        />
      </form>
    );
  }
}

type WordlistInfo = [string, number];

type NewRoundFormProps = {
  disabled: boolean;
  lastRound: number;
  wordlists: WordlistInfo[];
  ws: WebSocket | undefined;
};

type NewRoundFormState = {
  wordlist: string;
  wordcount: string;
};

class NewRoundForm extends React.Component<
  NewRoundFormProps,
  NewRoundFormState
> {
  constructor(props: NewRoundFormProps) {
    super(props);
    const { wordlists } = props;
    this.state = {
      wordlist: wordlists.length ? wordlists[0][0] : "",
      wordcount: "18"
    };
  }

  handleNewRound = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { lastRound, ws } = this.props;
    const { wordlist, wordcount } = this.state;

    console.log(this.state);

    if (ws && lastRound !== undefined) {
      ws.send(
        JSON.stringify({
          start: {
            round: lastRound,
            wordlist,
            wordcount
          }
        })
      );
    }
  };

  componentDidUpdate(prevProps: NewRoundFormProps) {
    const { wordlists } = this.props;
    if (wordlists !== prevProps.wordlists) {
      this.setState({ wordlist: wordlists.length ? wordlists[0][0] : "" });
    }
  }

  handleWordlistChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    this.setState({ wordlist: event.target.value });
  };

  handleWordcountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ wordcount: event.target.value.replace(/[^0-9]/g, "") });
  };

  render() {
    const { disabled, wordlists } = this.props;
    const { wordcount, wordlist } = this.state;

    return (
      <form onSubmit={this.handleNewRound} className="newroundform">
        <button className="newround" disabled={disabled} type="submit">
          <strong>+</strong> New Round
        </button>
        with{" "}
        <input
          type="text"
          id="wordcount"
          className="text wordcount"
          value={wordcount}
          onChange={this.handleWordcountChange}
          size={2}
          disabled={disabled}
        />
        <label htmlFor="wordcount"> words from</label>{" "}
        <select
          className="wordlists"
          value={wordlist}
          onChange={this.handleWordlistChange}
          disabled={disabled}
        >
          {wordlists.map(([name, len]: [string, number]) => (
            <option value={name} key={name}>
              {name} ({len} words)
            </option>
          ))}
        </select>
      </form>
    );
  }
}

type CastlefallState = {
  myName: string | undefined;
  room: string | undefined;
  players: Player[];
  spectators: number;
  serverVersion: string | undefined;
  lastRound: number;
  wordlists: WordlistInfo[];
  messages: Message[];
  rounds: Round[];
  timerLength: number;
  autokick: boolean;
};

const formatTimeInterval = (seconds: number) => {
  if (seconds < 60) return `${seconds.toFixed(1)} seconds`;
  if (seconds < 60 * 60) return `${(seconds / 60).toFixed(1)} minutes`;
  if (seconds < 24 * 60 * 60) return `${(seconds / 60 / 60).toFixed(1)} hours`;
  return `${(seconds / 24 / 60 / 60).toFixed(1)} days`;
};

class CastlefallApp extends Component<{}, CastlefallState> {
  ws: WebSocket | undefined;
  msgWrapRef: any; // React.Ref<HTMLDivElement>;

  constructor(props: {}) {
    super(props);
    this.state = {
      myName: undefined,
      room: undefined,
      players: [],
      spectators: 0,
      serverVersion: undefined,
      lastRound: 0,
      wordlists: [],
      messages: [],
      rounds: [],
      timerLength: 60,
      autokick: true,
    };

    this.ws = undefined;
    this.msgWrapRef = React.createRef();
  }

  handleUnspectate = () => {
    // TODO: this is pretty hacky but it's probably better than reloading
    this.connect(this.state.room || "#lobby", "unspectate");
  }

  handleChangeRoom = () => {
    const newRoom = prompt("Enter new room") || undefined;
    if (newRoom) {
      this.connect(newRoom, "changeroom");
    }
  }

  renderYouAre() {
    const { myName, room } = this.state;
    if (myName) {
      return (
        <span>
          You are {myName} in {room}
        </span>
      );
    } else {
      return (
        <span className="spectating">
          You are spectating in {room}
            <button className="unspectate" onClick={this.handleUnspectate}>
              join
            </button>
        </span>
      );
    }
  }

  addMessage(type: MessageType, content: string, timerLength?: number) {
    try {
      if (this.msgWrapRef.current) {
        const wrap = this.msgWrapRef.current;
        const shouldRescroll =
          wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight < 1;
        if (shouldRescroll) {
          // TODO: This is sketchy
          window.requestAnimationFrame(() => {
            wrap.scrollTop = wrap.scrollHeight;
          });
        }
      }
    } catch (ex) {
      console.error("Rescroll failed!");
      // just scrolling animation, it's ok if it doesn't work
    }

    const message: Message = {
      type,
      date: new Date(),
      content,
      timerLength,
    };

    this.setState(state => ({
      messages: [...state.messages, message]
    }));
  }

  connect(room: string, type: ConnectType) {
    if (!room.startsWith("#")) {
      room = "#" + room;
    }
    window.location.hash = room;

    const myName = prompt("Enter your name") || undefined;
    this.setState({ room, myName, rounds: [] });

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }

    switch (type) {
      case "changeroom":
        this.addMessage("connect", `Changing to room ${room} as player ${myName}`);
        break;
      case "unspectate":
        this.addMessage("connect", `Joining room ${room} as player ${myName}`);
        break;
    }

    const ws = new WebSocket(WEBSOCKET_URL);
    this.ws = ws;
    ws.onopen = function() {
      ws.send(
        JSON.stringify({
          name: myName || null,
          room: room
        })
      );
    };
    ws.onclose = event => {
      this.addMessage("error", "Connection closed: " + JSON.stringify(event));
    };
    ws.onerror = event => {
      this.addMessage("error", "Connection error: " + JSON.stringify(event));
    };
    ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        console.log(data);
        if (data.version) {
          this.setState({ serverVersion: data.version });
        }
        if (data.players) {
          this.setState({ players: data.players });
        }
        if (data.spectators) {
          this.setState({ spectators: data.spectators });
        }
        if (data.round) {
          const {
            number: roundNumber,
            starter,
            players,
            words,
            word,
            wordlist,
            secondsAgo,
          } = data.round;

          const round: Round = {
            roundNumber,
            players,
            words,
            word,
            wordlist,
            status: "active"
          };

          if (roundNumber) {
            if (secondsAgo) {
              this.addMessage(
                "roundstartpast",
                `${starter} started Round ${roundNumber} (${formatTimeInterval(secondsAgo)} ago)`
              );
            } else {
              this.addMessage(
                "roundstart",
                `${starter} has started Round ${roundNumber}`
              );
            }
            this.setState((state: CastlefallState) => ({
              rounds: [round, ...state.rounds],
              lastRound: roundNumber
            }));
          } else if (roundNumber === 0) {
            this.setState({ lastRound: 0 });
          }
        }
        if (data.error) {
          this.addMessage("error", data.error);
        }
        if (data.chat) {
          const { name, msg } = data.chat;

          this.addMessage("chat", `${name}: ${msg}`);
        }
        if (data.timer) {
          this.addMessage("timer", data.timer.name, data.timer.timerLength);
        }
        if (data.wordlists) {
          this.setState({ wordlists: data.wordlists });
        }
        if (data.timerLength) {
          const { name, value } = data.timerLength;
          if (name) {
            this.addMessage(
              "setting",
              `${name} has set timer length to ${value} seconds`
            );
          } else {
            this.addMessage(
              "setting",
              `Timer length is ${value} seconds`
            );
          }
          this.setState({ timerLength: value });
        }
        if (data.autokick) {
          const { name, value } = data.autokick;
          if (name) {
            this.addMessage(
              "setting",
              `${name} has ${
                value ? "enabled" : "disabled"
              } autokicking disconnected players`
            );
          } else {
            this.addMessage(
              "setting",
              `Autokicking disconnected players is ${
                value ? "enabled" : "disabled"
              }`
            );
          }
          this.setState({ autokick: value });
        }
        if (data.spoiler) {
          const { number: roundNumber, players } = data.spoiler;

          this.setState((state: CastlefallState) => ({
            rounds: state.rounds.map(round => {
              if (round.roundNumber === roundNumber) {
                return {
                  ...round,
                  players,
                  status: "spoiled"
                };
              } else {
                return round;
              }
            })
          }));
        }
      } catch (ex) {
        this.addMessage(
          "error",
          "Error while handling server message: " + ex.message
        );
      }
    };
  }

  componentDidMount() {
    this.connect(window.location.hash || "#lobby", "load");
  }

  componentWillUnmount() {
    if (this.ws) {
      this.ws.close();
    }
  }

  handleBroadcastTimer = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (this.ws) {
      this.ws.send(
        JSON.stringify({
          broadcastTimer: true
        })
      );
    } else {
      this.addMessage("error", "Can't broadcast timer: no websocket");
    }
  };

  renderSpectators() {
    const { spectators } = this.state;

    switch (spectators) {
      case 0:
        return "";
      case 1:
        return "1 spectator";
      default:
        return `${spectators} spectators`;
    }
  }

  handleChangeAutokick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (this.ws) {
      console.log(event);
      this.ws.send(
        JSON.stringify({
          autokick: event.target.checked
        })
      );
    }
  };

  handleChangeTimerLength = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (this.ws) {
      console.log(event);
      this.ws.send(
        JSON.stringify({
          timerLength: event.target.value
        })
      );
    }
  };

  renderRounds() {
    const { rounds, myName } = this.state;

    if (rounds.length) {
      return rounds.map(round => (
        <RoundComponent
          round={round}
          key={round.roundNumber}
          myName={myName}
        />
      ));
    } else {
      return "No rounds have been started yet!";
    }
  }

  render() {
    const {
      myName,
      serverVersion,
      players,
      messages,
      lastRound,
      wordlists,
      timerLength,
      autokick,
    } = this.state;

    return (
      <div>
        <div className="top">
          <h1><img className="icon" src="castlefall.png" alt="Castlefall logo"/>Castlefall</h1>
          <aside>
            <div><a href="rules.html" target="_blank">Castlefall rules</a></div>
            <div>client {CLIENT_VERSION}</div>
            <div>server {serverVersion}</div>
            <div><a href="https://github.com/betaveros/castlefall">PRs welcome</a></div>
            <p>
                Related app on{' '}
                <a href="https://play.google.com/store/apps/details?id=glydergames.cipher.ios&hl=en_US&gl=US">Google Play</a>{' '}
                and{' '}
                <a href="https://apps.apple.com/us/app/shibboleth/id6472225686">App Store</a>!
            </p>
          </aside>
        </div>
        <div>
          {this.renderYouAre()}
          <button className="change-room" onClick={this.handleChangeRoom}>
            change room
          </button>
          <form>
            <label htmlFor="timer-length">Timer length:</label>
            <select
              id="timer-length"
              className="timer-length"
              value={timerLength}
              onChange={this.handleChangeTimerLength}
              disabled={!myName}
            >
              <option value="30">30 sec</option>
              <option value="45">45 sec</option>
              <option value="60">60 sec</option>
            </select>
            <input
              type="checkbox"
              checked={autokick}
              onChange={this.handleChangeAutokick}
              id="autokick"
              disabled={!myName}
            />
            <label htmlFor="autokick"> autokick?</label>
          </form>
        </div>
        <div className="msgwrap" ref={this.msgWrapRef}>
          <MessageTable messages={messages} />
        </div>
        <div className="chatwrap">
          <ChatForm disabled={!myName} ws={this.ws} />
          <button
            disabled={!myName}
            onClick={this.handleBroadcastTimer}
          >
            Broadcast timer
          </button>
        </div>
        <h2>Players</h2>
        <PlayerTable canKick={!!myName} ws={this.ws} players={players} />
        <span>{this.renderSpectators()}</span>
        <NewRoundForm
          disabled={!myName}
          lastRound={lastRound}
          ws={this.ws}
          wordlists={wordlists}
        />
        <h2>Rounds</h2>
        <div id="rounds">
          {this.renderRounds()}
        </div>
      </div>
    );
  }
}

class CastlefallErrorBoundary extends Component<
  {},
  { error: Error | undefined; info: {} | undefined }
> {
  constructor(props: {}) {
    super(props);
    this.state = { error: undefined, info: undefined };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
  }

  render() {
    const { error, info } = this.state;

    if (error) {
      return (
        <pre className="full-error">
          <h2>Error</h2>
          <strong>{error.message}</strong>
          {"\n"}
          {info && info.componentStack}
        </pre>
      );
    } else {
      return <CastlefallApp />;
    }
  }
}

ReactDOM.render(<CastlefallErrorBoundary />, document.getElementById("root"));

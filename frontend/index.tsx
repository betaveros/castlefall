import React, { Component, PureComponent } from "react";
import ReactDOM from "react-dom";

// FIXME
export const websocketURL = "ws://localhost:8372/";
const CLIENT_VERSION = "v0.6";

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
  words: string[];
  word: string | undefined;
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

  render() {
    const {
      round: { roundNumber, players, words, word: roundWord },
      myName
    } = this.props;

    return (
      <div className="round">
        <h3>Round {roundNumber}</h3>
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
        <h3>Words</h3>
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

type TimerProps = {
  template: string;
  date: Date;
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
    this.setState({
      currentDate: new Date()
    });
  };

  render() {
    const { template, date } = this.props;
    const { currentDate } = this.state;
    const secondsLeft = 60 - (currentDate.getTime() - date.getTime()) / 1000;

    if (secondsLeft > 0) {
      const fraction = secondsLeft / 60;
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
    } else if (secondsLeft > -5) {
      const opacity = 0.1 * (secondsLeft + 5);
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

type MessageType = "roundstart" | "error" | "chat" | "timer" | "setting";

type Message = {
  type: MessageType;
  content: string;
  date: Date;
};

class MessageComponent extends Component<{ message: Message }> {
  render() {
    const { message } = this.props;

    if (message.type === "timer") {
      return (
        <TimerRow
          template={`${message.content} started the timer! Time left:`}
          date={message.date}
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
      <table id="msg">
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
      <form id="chatform" onSubmit={this.handleSubmit}>
        <input
          type="text"
          id="chat"
          className="text"
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
      <form onSubmit={this.handleNewRound}>
        <button id="newround" disabled={disabled} type="submit">
          <strong>+</strong> New Round
        </button>
        with{" "}
        <input
          type="text"
          id="wordcount"
          className="text"
          value={wordcount}
          onChange={this.handleWordcountChange}
          size={2}
          disabled={disabled}
        />
        <label htmlFor="wordcount"> words from</label>{" "}
        <select
          id="wordlists"
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
  autokick: boolean;
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
      autokick: true
    };

    this.ws = undefined;
    this.msgWrapRef = React.createRef();
  }

  handleRoomHelp = () =>
    alert(
      "Append #roomname to the URL and reload to go to a new room. (It's hacky. PRs welcome.)"
    );

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
          You are spectating in {room} <sup>(reload to join)</sup>
        </span>
      );
    }
  }

  addMessage(type: MessageType, content: string) {
    console.error("addMessage todo: " + type + content);

    // TODO: This is sketchy
    if (this.msgWrapRef.current) {
      const wrap = this.msgWrapRef.current;
      const shouldRescroll =
        wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight < 1;
      console.log(shouldRescroll);
      if (shouldRescroll) {
        window.requestAnimationFrame(() => {
          wrap.scrollTop = wrap.scrollHeight;
        });
      }
    }

    const message: Message = {
      type,
      content,
      date: new Date()
    };

    this.setState(state => ({
      messages: [...state.messages, message]
    }));
  }

  componentDidMount() {
    const room = window.location.hash || "#lobby";
    const myName = prompt("Enter your name") || undefined;
    this.setState({ room, myName });

    const ws = new WebSocket(websocketURL);
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
      const data = JSON.parse(event.data);
      console.log(data);
      if (data.version) {
        this.setState({ serverVersion: data.serverVersion });
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
          word
        } = data.round;

        const round: Round = {
          roundNumber,
          players,
          words,
          word
        };
        this.addMessage(
          "roundstart",
          `${starter} has started Round ${roundNumber}`
        );

        this.setState((state: CastlefallState) => ({
          rounds: [round, ...state.rounds],
          lastRound: roundNumber
        }));
      }
      if (data.error) {
        this.addMessage("error", data.error);
      }
      if (data.chat) {
        const { name, msg } = data.chat;

        this.addMessage("chat", `${name}: ${msg}`);
      }
      if (data.timer) {
        this.addMessage("timer", data.timer.name);
      }
      if (data.wordlists) {
        this.setState({ wordlists: data.wordlists });
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
        this.setState({ autokick: data.autokick.value });
      }
      if (data.spoiler) {
        const { number: roundNumber, players } = data.spoiler;

        this.setState((state: CastlefallState) => ({
          rounds: state.rounds.map(round => {
            if (round.roundNumber === roundNumber) {
              return {
                ...round,
                players
              };
            } else {
              return round;
            }
          })
        }));
      }
    };
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

  render() {
    const {
      myName,
      serverVersion,
      players,
      messages,
      rounds,
      lastRound,
      wordlists,
      autokick
    } = this.state;

    return (
      <div>
        <div>
          {this.renderYouAre()}
          <sup>
            <button className="room-help" onClick={this.handleRoomHelp}>
              ?
            </button>
          </sup>{" "}
          (client {CLIENT_VERSION} / server {serverVersion} /{" "}
          <a href="https://github.com/betaveros/castlefall">PRs welcome</a>){" "}
          <a href="rules.html" target="_blank">
            Castlefall rules
          </a>
        </div>
        <form>
          <input
            type="checkbox"
            checked={autokick}
            onChange={this.handleChangeAutokick}
            id="autokick"
            disabled={!myName}
          />
          <label htmlFor="autokick"> autokick?</label>
        </form>
        <div id="msgwrap" ref={this.msgWrapRef}>
          <MessageTable messages={messages} />
        </div>
        <div id="chatwrap">
          <ChatForm disabled={!myName} ws={this.ws} />
          <button
            id="broadcast-timer"
            disabled={!myName}
            onClick={this.handleBroadcastTimer}
          >
            Broadcast timer
          </button>
        </div>
        <h2>Players</h2>
        <PlayerTable canKick={!!myName} ws={this.ws} players={players} />
        <span id="spectators">{this.renderSpectators()}</span>
        <NewRoundForm
          disabled={!myName}
          lastRound={lastRound}
          ws={this.ws}
          wordlists={wordlists}
        />
        <h2>Rounds</h2>
        <div id="rounds">
          {rounds.map(round => (
            <RoundComponent
              round={round}
              key={round.roundNumber}
              myName={myName}
            />
          ))}
        </div>
      </div>
    );
  }
}

ReactDOM.render(<CastlefallApp />, document.getElementById("root"));

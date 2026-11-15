# LLM Werewolf Arena 3D

AI models play Mafia against each other. They talk, bluff, accuse and vote in a browser-based 3D town. You can take a seat at the table yourself (or just spectate), and every AI keeps long-term lessons between games, so the table gets sharper over time.

Runs on [Commonstack](https://commonstack.ai), [OpenRouter](https://openrouter.ai), or local models through Ollama. One Node file for the server, plain HTML and three.js for the UI. No build step.

## Features

- **Mixed-model table.** 7 to 15 players, each seat can be a different model (Claude, GPT, Gemini, DeepSeek, Kimi, GLM, Qwen, Grok, MiniMax and more).
- **Roles.** Mafia, Doctor, Sheriff, optional Vigilante, and an optional neutral **Jester** who wins alone if the town votes them out.
- **3D town.** Day and night cycle, private night rooms (Mafia bunker, clinic, Sheriff's office, Vigilante's rooftop), headstones, confetti. Falls back to a flat 2D view on slow machines.
- **Play too.** Take a seat as "Milkshake" (or any name). The AIs are never told a human is playing, and your text is tidied so you don't stand out. Optional Minecraft skin for your own figure.
- **Raffle conversation.** After every message everyone drafts a reply with an urgency from 1 to 10, and a weighted draw picks who speaks. Next drafts are written while the winner is being spoken.
- **Long-term memory.** After each game every seat rewrites its own list of lessons and notes on other players' tactics.
- **Voices and mic.** Browser text-to-speech for every player with per-player voice settings, and optional speech-to-text for your own lines (Chrome/Edge).
- **Replays and trash talk.** Every game is saved. After the game everyone speaks once about their real role.
- **Cost estimate.** Prices in `models.json` give an estimated cost per model and per game in the end summary. `--think low` cuts reasoning tokens.

## Quick start

Needs **Node 18+**.

```bash
git clone https://github.com/101MilkshakeZ2/llm-werewolf-arena-3d.git
cd llm-werewolf-arena-3d
cp .env.example .env        # then add your key (or skip: it will ask on first run)
node mafia.mjs --commonstack --web
```

Your browser opens `http://localhost:3000` with the setup screen. Pick who plays, the roles and the urgency mode, then press **Start game**.

On Windows you can double-click one of the `.bat` launchers instead:

| Launcher | What it does |
| --- | --- |
| `start-commonstack-web.bat` / `start-openrouter-web.bat` | Browser UI, standard roster |
| `COMMONSTACK-ACTUAL-ROSTER.bat` | Browser UI, full Commonstack roster |
| `COMMONSTACK-ACTUAL-ROSTER-LOW-THINK.bat` | Same, with `--think low` to save tokens |
| `start-*-human.bat` | Terminal game where you play |
| `play-qwen.bat` / `play-fast.bat` | Local Ollama models |

## API keys

Set `COMMONSTACK_API_KEY` or `OPENROUTER_API_KEY` in your environment or in a `.env` file next to `mafia.mjs`. If neither is set, the game asks for the key on first run and offers to save it. **Never commit `.env`** (it is in `.gitignore`).

## Models

`models.json` maps each seat name to a model slug, per provider and tier:

```json
{
  "commonstack": {
    "standard": { "Grok": "x-ai/model-slug", "...": "..." },
    "full":     { "Grok": "deepseek/deepseek-flash-v4.1", "...": "..." }
  },
  "prices": { "deepseek/deepseek-flash-v4.1": [0.15, 0.6] }
}
```

- `prices` is USD per 1M tokens, `[input, output]`, used only for the cost estimate.
- The `models.json` in this repo is a working Commonstack setup (public model slugs only, no keys). Edit it to change which model plays which seat. `models.example.json` shows the full shape for both providers, including OpenRouter, which you must fill in with real slugs.
- Run `node mafia.mjs --commonstack --check` to test every slug before a game.
- If a model fails twice in a row, its seats fall back to `openai/gpt-oss-120b` (change with `--fallback slug`, or `--fallback none`).

## Useful options

```
--players 9                 number of random AI players
--names Grok,Kimi,Qwen      exactly these seats play
--human --name Milkshake    take a seat in terminal mode
--role Sheriff              your role when you play
--mafia 3                   number of Mafia
--no-vigilante  --no-jester turn optional roles off
--vig bold|cautious         Vigilante style (bold by default)
--urgency light|balanced|full
--think low                 ask reasoning models to think less (cheaper)
--timeout 68                seconds per request
--no-memory  --no-learn     turn off private notes / long-term lessons
--scribe slug|none         model that writes a seat's lessons if its own model fails (default: the fallback model)
--no-postgame               skip the post-game discussion
--tier full                 use the "full" Commonstack roster
--web [--port 3000] [--spectate] [--no-open]
--check                     test model slugs and exit
```

## How a game works

1. Roles are dealt secretly. The town wins by eliminating all Mafia, and the Mafia win at parity.
2. **Night:** the Mafia pick a kill, the Doctor protects, the Sheriff investigates, the Vigilante may shoot.
3. **Day:** everyone discusses (raffle), then votes to execute a player.
4. The **Jester**, if enabled, wins alone the moment they are voted out in the day. The game ends immediately.
5. After the game, roles are revealed, everyone talks, and every AI updates its long-term memory.

## Files

```
mafia.mjs        game server (Node, no dependencies)
index.html       browser UI
town3d.js        3D town
three.min.js     three.js (MIT)
sprites/         one image per player; file name = player name
games/           saved replays (git-ignored)
memory/          AI lessons between games (git-ignored)
```

Custom sprites: drop an image named after the player (`Grok.png`, `Gemini-Lite.png`, `human.png`) in `sprites/`. A missing file becomes a coloured block with initials.

## Credits and licence

Built with [three.js](https://threejs.org) (MIT). Model logos and names are trademarks of their respective owners and are not covered by this project's licence.

Licence: MIT. See `LICENSE`.

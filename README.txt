AI MAFIA  (v15)

Needs Node 18 or newer. Keep all files in one folder. To update: extract over the old folder (not in the middle of a game).

===== BROWSER (recommended) =====
Double-click  start-commonstack-web.bat  or  start-openrouter-web.bat.
First run asks for your API key in the terminal window (and offers to save it to a private .env file).
Your browser opens http://localhost:3000 with the SETUP SCREEN:
  You           take a seat (name: Milkshake by default) or just watch an AI-only game
  Disguise me   the AIs are never told a human is playing, and they read your text tidied up
                (capital letter, "I", full stop). Your screen shows what you really typed.
  Who plays     tick exactly which AIs play (7 to 15 players in total), or press "random".
                Each AI can get its own model ("auto" = rotate the models in the box below;
                "other..." = a slug for that one seat only).
  My role       (when you take a seat) random, or pick Mafia / Doctor / Sheriff / Vigilante / Jester / Villager; everyone else is still dealt randomly.
                Picking Vigilante or Jester turns that role on. Terminal: --role Sheriff
  Roles         2 or 3 Mafia (auto = 3 from 11 players), Vigilante on/off, Jester on/off. Doctor and Sheriff are always on.
  Talking       discussion length (messages per day = number x players alive), urgency mode
                (light / balanced / full), AI private notes, hide night activity.
Press START GAME. Your choices are remembered for next time.

During the game
  - Type any time; your line goes out as your next message. Click a name to vote
    (type a reason first and it is sent with the vote).
  - URGENCY slider: 0 = muted (you only speak when you type), 10 = pick me now.
  - Right side: who is alive, plus every role you are allowed to see
    (yours, your Mafia partners; everything once you are dead, spectating, or the game is over).
  - You can also answer in the terminal window; both work.
After the game: NEW GAME goes back to the setup screen. REPLAYS lists every saved game.
Replays without starting anything: double-click index.html and open a file from the games folder.

===== MINECRAFT SKIN FOR YOU (3D town) =====
Top bar: "Upload skin" picks a Minecraft skin PNG (64x64, or the old 64x32; classic and slim "Alex" arms both work).
Your player then has a Minecraft-shaped body wearing that skin (including the hat/jacket/sleeve/pants layers), and your face on
the headstone, ghost and Sheriff board comes from the skin too. "Skin: on / off" switches between your skin and the normal AI body
at any time, even mid-game. Only your own player is affected; the flat drawing (Town: flat) still shows your sprite.
The skin is saved as skin.png (plus skin.json for on/off) next to mafia.mjs, so clearing the browser loses nothing.

===== COST: --think low AND PRICES (v14.9) =====
--think low  asks reasoning models to think less (cheaper and faster). Off by default; COMMONSTACK-ACTUAL-ROSTER-LOW-THINK.bat is the
  full roster with it on. It sends reasoning_effort (and thinking / enable_thinking for GLM, Kimi, Qwen); a model that rejects the
  settings is simply retried without them. Whether a model OBEYS depends on Commonstack: run the .bat's command with --check, then again
  with --check --think low, and compare the "tokens out" printed for each model. A big drop = it works for that model.
"prices" in models.json (USD per 1M tokens, [in, out]) makes the end-of-game summary show an estimated cost per model and in total,
  because Commonstack does not report cost itself. Models without a price are listed as "no price listed".

===== END-OF-GAME RELIABILITY (v14.8) =====
The memory updates (nightly notes and the end-of-game lessons) now run 3 AIs at a time instead of all at once, which was flooding the
API right when the game ends (--learn-parallel 5 to change). Lessons must be finished sentences: cut-off or garbled ones are refused,
and any old garbled lessons already in memory/ are dropped automatically when the game loads them. A message that was cut off by the
token limit ("...but Qwen's request looks like") is no longer posted; that AI just sits that turn out.

===== FASTER RAFFLE (full urgency) =====
While the winner of a raffle is being spoken (Voices on in the browser), the next round of drafts is already being written, so
slow models no longer add their thinking time on top of the speech. If anything is said in between (for example you jump in)
those early drafts are thrown away and redone. Turn it off with --no-overlap.

===== VIGILANTE STYLE =====
Setup screen, next to the Vigilante box: "bold shooter" (default) or "cautious (old)"; terminal: --vig cautious.
Cautious was so careful the AI Vigilante almost never fired (it needed confidence 8/10, and was only allowed to pick players with votes
or mentions against them). Bold: any player can be a target, the AI always names its top suspect with a confidence, and it fires at
7/10 on Night 2, 6/10 on Night 3 and 5/10 from Night 4 (the longer the game, the less the shot is worth waiting on). When it holds
fire, the night log says why ("holds fire: top suspect X, confidence 5/10, needed 7"), visible to you once you are dead or the game is over.

===== JESTER =====
A neutral role (one player, on nobody's team, no night power). The Jester wins ONLY by being voted out during the day:
the moment the town executes the Jester the game ends and the Jester wins alone (town and Mafia both lose).
Killed at night (by the Mafia or the Vigilante) = the Jester just dies and loses. The Sheriff sees the Jester as "Not Mafia".
If all Mafia die while the Jester is alive, the town still wins; if the Mafia reach parity, they win (the Jester counts as one of the rest).
Everyone is told a Jester exists (like the other roles). The AI Jester is told to act believably suspicious, never to admit it,
and the town AIs are warned that executing a player who seems to want it may end the game.
Turn it off: untick Jester on the setup screen, or --no-jester. Pick it for yourself with My role / --role Jester.

===== 3D TOWN (three.js) =====
The town is now a real 3D scene: a cobbled square with a fountain, houses, a clock tower, a market stall, trees and street
lamps. Day blends into night (the lamps and windows light up, moon and stars come out). The players are blocky 3D figures
with their sprite on the front AND back of the head. Whoever speaks steps forward, hops and waves; the others turn to look;
voters point at who they vote for. A dead player's soul floats up and a headstone with their face rises in their place.
The night rooms are 3D too: red Mafia bunker, Doctor's clinic (the protected player is on the light box), Sheriff's office
(everyone pinned to the cork board, the checked player framed in yellow), Vigilante's rooftop (wanted poster).
Confetti falls for the winners. Names, roles, subtitles and vote arrows are drawn on top as before.
  CAMERA: "Cam: follow speaker" (top bar) = the camera glides to whoever is talking and they turn to face it; it goes back to the
  wide shot for votes, night and narration. Click it again for "Cam: wide (default)" = the old slow drifting wide shot. Remembered.
  Needs the two new files next to index.html:  three.min.js  and  town3d.js  (no internet needed).
  "Town: 3D / flat" in the top bar switches back to the old flat drawing. It also falls back by itself if 3D cannot start.
  Slow computer? It lowers the quality by itself (sharpness first, then shadows). If it still lags, use "Town: flat".
  Replays opened by double-clicking index.html show initials instead of sprites on the heads (a browser rule for local files);
  open replays with the REPLAYS button in a running game to see the sprites.

===== TOWN VIEW + SPRITES =====
The browser shows the game as a town: blocky figures in a square, the speaker's line as a subtitle,
vote arrows with counts, and fallen figures when someone dies. At night it cuts to private rooms:
red Mafia bunker (Mafia chat), Doctor's clinic, Sheriff's cork board, Vigilante's rooftop.
You only see the rooms you are allowed to (spectators and dead players see all). "Log view" in the top bar
switches to the plain text log and back.
Sprites: put images in the  sprites  folder. The FILE NAME is the player name (Grok.png, Gemini-Lite.png ...),
case and spaces/dashes ignored. human.png is used for the human seat (or name a file after your player name).
Any image works (png, jpg, webp, gif, svg), so you can drop anything in as a stand-in. A missing file = a coloured
block with initials. The body colour is the average of the image's four corners. Images are re-read every game.
Player names in game are the file names; the browser shows the full names (ChatGPT-6 Luna, Gemini 3.5 Lite, ...).

===== TERMINAL =====
  COMMONSTACK-ACTUAL-ROSTER.bat (browser) / start-commonstack-full.bat / -full-human.bat  Commonstack with the FULL roster (see MODELS)
  start-commonstack.bat / start-openrouter.bat               AIs only
  start-commonstack-human.bat / start-openrouter-human.bat   you play
  play-qwen.bat / play-fast.bat                              local Ollama models
When playing in the terminal: type any time; vote with a name, or "Name: reason".

===== OPTIONS (add to any .bat line or command) =====
  --players 9                 number of players (random AIs)
  --names Grok,Kimi,Qwen,...  exactly these AIs play (names are the model names; see sprites)
  --no-postgame               skip the post game discussion / trash talk
  --mafia 3   --no-vigilante   --no-jester   --role Sheriff (your role when you play)
  --human   --name Milkshake  take a seat (terminal mode) / your name
  --models slugA,slugB        models rotated across the seats      --check  test the slugs and exit
  --helper slug               model used for the small "who speaks next" ratings
  --urgency light|balanced|full        (default balanced)
  --discussion 1.75           messages per day = this x players alive
  --memory / --no-memory      AI private notes (default: on for cloud, off for local models)
  --hide-night                hide "X is thinking" and timings at night (they reveal who has a night role)
  --no-disguise               AIs read your text exactly as typed
  --verbose / --quiet         more / fewer status lines          --timeout 68  seconds per request (default 68)   --draft-wait 68  raffle drafting limit (default 68)
  --web  [--port 3000] [--no-setup] [--spectate] [--no-open]     browser UI

===== MODELS =====
Default cloud pair: Claude Haiku 5.5 + Gemini 3.1 Flash Lite.
  Commonstack: anthropic/claude-haiku-5-5, google/gemini-3.1-flash-lite-preview
  OpenRouter:  anthropic/claude-haiku-5.5, google/gemini-3.1-flash-lite-preview   (run --check to confirm)
If a model fails, its call goes to the fallback model openai/gpt-oss-120b (after 2 fails in a row its seats stay on it for the rest of the game).
  --fallback slug   use another fallback      --fallback none   turn it off      --check also tests the fallback slug.
Commonstack has two rosters in models.json: "standard" (the cheap rotation, default) and "full" (COMMONSTACK-ACTUAL-ROSTER.bat, start-commonstack-full*.bat, --tier full):
  Sonnet=claude-sonnet-5-5, Haiku=claude-haiku-5-5, Terra=gpt-6.1-terra, Luna=deepseek-v4-flash, Flash=gemini-3.7-flash, Lite+Gemma=gemini-3.1-flash-lite-preview,
  DeepSeek=deepseek-flash-v4.1, Kimi=kimi-k3.1-pro, Qwen=qwen3.8-27b, GLM=glm-5.3, Grok=grok-4.7, Muse+Mistral=minimax-m3.  (run with --check to test the slugs)
Optional per-AI models file: copy models.example.json to models.json (--tier discount picks the discount set).
Local: qwen2.5:1.5b + qwen3:1.7b (play-qwen.bat), or tiny models + LFM formatter (play-fast.bat).

===== NOTES =====
AI private notes: after each day every living AI rewrites its own short notes (who it suspects, its plan)
and gets them back in later prompts. Costs one extra call per AI per day. Spectators and replays can read them.
Saved games are in the games folder. Commonstack does not report cost per call, so check its dashboard.
Keep .env private (do not share it or zip it).

VOICE SETTINGS (top bar: "Voice settings")
  Pick the voice, pitch and speed of every player, and of YOU (first row). The play button plays a test line, "default" puts one
  player back to the automatic voice, "reset all" puts everyone back, "shuffle voices" hands out random different voices, "hear
  everyone" plays them all in a row. Saved in this browser. The list is the voices installed on your computer / browser
  (Windows: Settings > Time & language > Speech > add voices; Edge also has the nicest online ones).
  SAVED IN A FILE: your picks are written to voice-settings.json next to mafia.mjs (so clearing the browser cache loses nothing; the
  file wins when the page loads). Keep that file when you update: extracting a new zip over the folder does not touch it.
  MICROPHONE: click the microphone button next to the message box, speak, and your words land in the message box; check or edit
  them, then press Enter to send (tick "send automatically" in Voice settings if you want it sent when you stop talking). Pick the language in Voice settings. Chrome / Edge only, needs internet,
  and the browser asks once for microphone permission. The others' voices are paused while you talk.
  YOUR lines are now spoken aloud too, in your voice (when "Voices" is on), and the game waits for you to finish before moving on.

VOICES
  Click "Voices: off" in the top bar to have the browser read messages aloud (Web Speech API). Each player gets a stable voice/pitch/rate from your installed browser voices. Your own lines are not spoken. Needs a click each page load.

RAFFLE (urgency "full")
  After every message, everyone (AIs and you) drafts their next message plus an urgency 1-10. Urgency = raffle tickets; one random draw picks who actually speaks. The ticket line is shown (log and status bar). Your typed text + slider enter the raffle and wait there until you win. If you are named, or have not spoken yet, you are still asked directly. --draft-wait 30 = seconds a slow model gets before it sits a raffle out. Costs more: every player makes a full call per message.

POST GAME DISCUSSION / TRASH TALK
  When the game ends and the roles are revealed, EVERYONE (dead or alive, AIs and you) speaks exactly once, in random order. No raffle, no urgency. The AIs are told it is a "post game discussion" and may talk about their real roles; you see it as "TRASH TALK" (spectators see "Post game discussion"). The messages are saved in the replay and the AIs read them when they update their long-term memory. Your turn: type your piece, or press Enter on an empty box to pass (lines typed while waiting are used too). SKIP TRASH TALK: a button in the top bar (or type  skip  in the terminal) ends it early; whoever has not spoken yet stays silent. In the 3D town everyone stands up again for the post game discussion (nobody is a headstone, the sidebar still shows who died).
  Costs one extra call per AI. Untick "Post-game discussion" on the setup screen or use --no-postgame to skip it.

LONG-TERM MEMORY (learning between games)
  Each AI SEAT (not the model behind it) keeps up to 19 lessons plus notes on other players' tactics, saved in the memory folder. After every game the AI sees all roles and the end of the log, then EDITS its list: add new lessons, drop old ones, or merge several into one (it must drop/merge to stay at 19). Everyone else learns too, so a trick that won before may now be recognised. Roles reshuffle each game, so the notes are about tactics, not alignment.
  On by default for cloud games. Untick "Long-term memory" on the setup screen or use --no-learn. --memory-limit N changes 19. --reset-memory wipes everything (or delete the memory folder). Costs one extra call per AI per game. (Mock/local runs need --learn.)

MEMORY & THERAPY (top bar: Memory)
  Read any seat's memories (you cannot edit them: the AI decides). Chat with a seat on a dark stage: name on top, what they say as subtitles. Up to 12 messages per session. Click "End session & let them remember" and the seat decides what, if anything, from the chat goes into its memory (marked "from a chat"). Therapy works from the setup screen or between games, not during a game.

VOICES
  Each seat always gets the same browser voice (assigned by alphabetical seat order); if you have fewer voices than seats, the repeats get a different pitch.

VOICE PACING
  With Voices on, the game waits after each spoken message until your browser has finished reading it aloud, then moves on (live games and replay playback). With Voices off nothing waits. Old messages after a page refresh and "show all" in a replay are never read aloud.

NIGHT ACTIONS ARE REVEALED
  While you are alive, other players' night actions (Doctor saves, Sheriff checks, Vigilante shots) are hidden from you. They are no longer lost: the moment you die, and again when the game ends, they all appear under "what happened during the nights" in the terminal and the browser. Spectators still see them live.

DEATH
  A dead player's soul floats up out of the scene and a headstone with their face carved into it rises where they stood.

WHAT YOU TYPE WHILE WAITING
  Each line you type is its own message, kept in order, and said one at a time when your turn comes. They are never joined together. A "✕ N waiting" button appears next to the input when lines are still waiting; click it to throw them away.

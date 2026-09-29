---
id: casino
title: The casino
topic: community
keywords: casino, casino stats, win rate, house edge, gamble, gambling, bet, roulette, blackjack, slots, slot machine, hilo, hi-lo, coinflip, coin flip, dice, odds, win money, explainer
questions: How does the casino work? | How do I see casino stats? | What are the odds for slots? | How do I play roulette? | How do I bet money? | How do I play blackjack?
commands: casino
related: earning-money, games
---
`/casino` holds the games. Every bet comes straight out of your wallet, and every win goes straight back in. `/casino info` shows what each game pays and the bet limits in your server.

- `/casino roulette`: opens a single-zero table, public by default so anybody in the channel can join; choose `private` to keep it to yourself, and press **Spin now** whenever you are ready. Press a button to put a chip on red, black, odd, even, a dozen, a column or a number; the 🪙 buttons set each chip to 100, 500, 1,000, 2,500, 5,000 or any other amount, and tell you what your wallet covers. A number pays 35 to 1, a dozen or column 2 to 1, the rest evens. The wheel spins 30 seconds after the first bet. The result shows each player's stake, winnings and every bet, and **New round** starts another on the same message. The table shows its last five spins, newest first.
- `/casino blackjack`: beat the dealer without going over 21. A natural pays 3 to 2, and you can double down on your first two cards.
- `/casino slots`: three reels. Three diamonds pay {fact:casino.slotsTop}, and the machine returns {fact:casino.slotsReturn} of what it takes over time.
- `/casino hilo`: call each next card higher or lower. Every right call grows the pot, less a {fact:casino.hiloCut} cut, and you can cash out whenever you like, up to {fact:casino.hiloCap} your bet.
- `/casino coinflip`: call heads or tails for {fact:casino.coinflipReturn} your bet.
- `/casino dice`: two dice. Under 7 or over 7 pays double, and exactly 7 pays {fact:casino.diceSeven}.

`/casino stats` shows what your server has gambled, paid out and kept, the win rate, the largest single win and bet, the players furthest ahead and behind, and your own record. Pick a `game` to see one game on its own.

Bet a number, `half` or `all`. A blackjack or hi-lo hand left alone for {fact:casino.handIdle} is played out for you and paid, so walking away never costs you the pot.

### Running the casino in your server
Anybody with Manage Server can close the casino, switch single games off, and set the smallest and largest bet with `/casino settings`, or on the dashboard's casino screen. A hand already dealt can still finish when the casino closes.

> **Tip:** Only bet what is in your wallet and you are happy to lose. Every game keeps a small edge for the house.

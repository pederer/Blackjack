# Blackjack Implementation Review

## Ruleset

The target is a single-player blackjack game with 3:2 blackjack, dealer stands on soft 17, one split, Double Down on opening hard totals of 9, 10, or 11, and no insurance or surrender. Double after splitting is outside this selected ruleset. The user-facing description is in [Rules.html](Rules.html).

## Feature review

| Area | Status | Implemented behavior |
|---|---|---|
| Cards and shoe | Complete | Builds 1–8 decks, creates independent card objects, shuffles between rounds, and returns cards to the shoe after each round. |
| Hand totals | Complete | Scores aces as 1 or 11, prevents actions on completed hands, and ends a hand on 21 or bust. |
| Naturals and dealer | Complete | Resolves dealer blackjack before player actions, pushes two naturals, pays player natural 3:2, and makes dealer draw below 17 and stand on soft 17. |
| Hit, stand, and double | Complete | Each hand has explicit action state. Double is available on original opening hard totals of 9, 10, or 11 when the additional stake is affordable; it deals one card and stands. |
| Split and settlement | Complete | Allows one same-rank pair split; plays and settles each hand separately; split 21 is ordinary 21; split aces receive one card each and stand. Double after splitting is not offered under this baseline. |
| Wagers and bankroll | Complete | Accepts positive whole-dollar wagers up to bankroll; commits the opening bet, split bet, and double stake when placed; pays wins, pushes, losses, and blackjack per hand. New Game resets the bankroll to $1,000. |
| Empty bankroll and transitions | Complete | Disables betting below the $1 minimum and directs the player to New Game. Closing a results dialog leaves a clear Place Next Bet path. |
| Rules and about | Complete | Rules and About are real pages linked from the main navigation; the insurance claim has been removed from the table. |
| Responsive and keyboard access | Implemented; browser review pending | Responsive hand layout, labeled numeric fields, semantic controls, live status, card descriptions, native modal dialogs, visible focus, and action focus movement are present. |
| Maintenance | Complete | Removed the unused alternate game and player class, diagnostic deck display, temporary markup, unused deck inspection methods, Bootstrap, and jQuery. |

## Implementation decisions

- A natural is settled immediately after checking for dealer blackjack. Two naturals push; otherwise a player natural wins 3:2.
- A busted hand loses immediately. When all player hands are complete, the dealer plays once if at least one player hand remains live.
- Each hand tracks its own total stake. Opening wager, split, and double stakes are debited when committed; win returns 2× stake, push returns stake, loss returns nothing, and blackjack returns 2.5× stake.
- New Game starts a fresh shoe and resets the practice bankroll to $1,000. Deck count and card-back options take effect on New Game.

## Verification

- `node --check js/blackjack.js` and `node --check js/deck.js` pass; a deck smoke check passed for deck size, independent card instances, exhaustion, and invalid deck count.
- Source review covered natural-versus-natural, ordinary 21 versus dealer blackjack, soft 17, multiple aces, bust completion, split-hand ordering and settlement, split aces, double eligibility and affordability, wager bounds, bankroll depletion, modal close paths, and New Game reset behavior.
- Responsive layout and keyboard/screen-reader behavior are implemented in markup and CSS but were not visually exercised in a browser during this pass.

## Remaining work

- Perform hands-on browser QA across current desktop and mobile browsers, especially card sprite sizing at narrow widths and Bootstrap modal focus restoration.
- Perform browser QA of the native dialogs and mobile navigation before publishing.

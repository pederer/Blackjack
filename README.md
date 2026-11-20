# Blackjack

Single-player blackjack using the rules documented on the [Rules page](Rules.html): 3:2 blackjack, dealer stands on soft 17, one split, Double Down on opening hard totals of 9, 10, or 11, and no insurance or surrender.

Play the hosted game at [pederer.github.io/Blackjack](https://pederer.github.io/Blackjack/Blackjack.html). Read [About](About.html) for credits and license information.

## Run locally

This is a static site; it has no build step or package install. From the repository root, run:

```sh
python3 -m http.server 8000
```

Then open [http://localhost:8000/Blackjack.html](http://localhost:8000/Blackjack.html). A local HTTP server keeps relative image, style, and script paths working consistently.

The site targets current desktop and mobile versions of Firefox, Chrome, Safari, and Edge. It uses bundled jQuery 1.10.1 and Bootstrap 3 for navigation and modal behavior.

## Project evaluation

See [GAP_ANALYSIS.md](GAP_ANALYSIS.md) for the original prioritized gap list, implementation status, and behavior scenarios used for review.

## License

Code released under [the MIT license](https://github.com/pederer/Blackjack/blob/master/LICENSE).

## Attribution

This project uses the Vectorized Playing Cards 1.3 graphics library:  
Vectorized Playing Cards 1.3- http://code.google.com/p/vectorized-playing-cards/  
Copyright 2011 - Chris Aguilar  
Licensed under LGPL 3 - www.gnu.org/copyleft/lesser.html

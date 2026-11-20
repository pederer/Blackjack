/** Card and shoe primitives used by the blackjack table. */
function Card(suit, label, value, color) {
	this.suit = suit;
	this.label = label;
	this.value = value.slice(0);
	this.style_large = 'large-' + label + '-' + suit;
	this.style_medium = 'medium-' + label + '-' + suit;
	this.style_small = 'small-' + label + '-' + suit;
	this.style_hidden_large = 'large-' + color;
	this.style_hidden_medium = 'medium-' + color;
	this.style_hidden_small = 'small-' + color;
}

function Deck() {
	var cards = [];

	this.add_cards = function(newCards) {
		if (!newCards || !newCards.length) {
			return false;
		}
		cards = cards.concat(newCards);
		return true;
	};

	this.shuffle = function() {
		var i;
		var j;
		var temp;
		for (i = cards.length - 1; i > 0; i -= 1) {
			j = Math.floor(Math.random() * (i + 1));
			temp = cards[i];
			cards[i] = cards[j];
			cards[j] = temp;
		}
		return cards.length > 1;
	};

	this.deal = function(number) {
		var dealt = [];
		var i;
		if (number < 1 || number > cards.length || Math.floor(number) !== number) {
			return dealt;
		}
		for (i = 0; i < number; i += 1) {
			dealt.push(cards.shift());
		}
		return dealt;
	};

	this.build_blackjack_deck = function(number, color) {
		var suits = ['clubs', 'hearts', 'spades', 'diamonds'];
		var labels = [
			['ace', [1, 11]], ['2', [2]], ['3', [3]], ['4', [4]], ['5', [5]],
			['6', [6]], ['7', [7]], ['8', [8]], ['9', [9]], ['10', [10]],
			['jack', [10]], ['queen', [10]], ['king', [10]]
		];
		var deckColor = color || 'blue';
		var s;
		var rank;
		var copy;
		if (!isFinite(number) || Math.floor(number) !== number || number < 1 || number > 8) {
			return false;
		}
		for (s = 0; s < suits.length; s += 1) {
			for (rank = 0; rank < labels.length; rank += 1) {
				for (copy = 0; copy < number; copy += 1) {
					cards.push(new Card(suits[s], labels[rank][0], labels[rank][1], deckColor));
				}
			}
		}
		return true;
	};
}

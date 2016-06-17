/**
 * Author: Patrick Ederer
 * Date: 14 June 13
 */

function Card(suit, label, value, color) {
	// TODO: have a default style and style_hidden based on deck size
	this.suit = suit;
	this.label = label;
	this.value = value;
	this.style_large = 'large-' + label + '-' + suit;
	this.style_medium = 'medium-' + label + '-' + suit;
	this.style_small = 'small-' + label + '-' + suit;
	this.style_hidden_large = 'large-' + color;
	this.style_hidden_medium = 'medium-' + color;
	this.style_hidden_small = 'small-' + color;
};

function Deck() {
	var _cards = [];
	var _trump = null;
	
	// Temporary trouble-shooting measure
	this.cards = function() { return _cards; }

	this.get_trump = function() { return _trump; };
	
	this.set_trump = function(trump) {
		// Set a trump suit
		if (trump === 'clubs' || trump === 'hearts' || 
			trump === 'spades' || trump === 'diamonds') {
			_trump = trump;
			return false;
		} else {
			alert('"' + trump + '" is not an acceptable trump suit.');
			return false;
		}
	};

	this.add_cards = function(cards) {
		// Add cards to the bottom of the deck
		if (cards && cards.length !== 0) {
			_cards = _cards.concat(cards);
			return true;
		} else {
			return false;
		}
	};
	
	this.shuffle = function() {
		// Shuffle all cards in the deck
		// Source: http://sedition.com/perl/javascript-fy.html
		var i = _cards.length;
		if (i == 0) {
			return false;
		}
	
		while (--i) {
			var j = Math.floor(Math.random() * (i + 1 ));
			var tempi = _cards[i];
			var tempj = _cards[j];
			_cards[i] = tempj;
			_cards[j] = tempi;
		}
		return true;
	};
	
	this.deal = function(number) {
		// Deal out a card or cards
		if (number < 1 || number > _cards.length) {
			return false;
		}
	
		var card;
		var top_cards = [];
		for (var n = 0; n < number; n++) {
			// Take cards from the TOP of the deck
			card = _cards.shift();
			top_cards.push(card);
		}
	
		if (top_cards.length !== number) {
			alert('Deal function is broken');
		}
	
		return top_cards;
	};
};

Deck.prototype.build_blackjack_deck = function(number, color) {
	// Create 52-card playing card deck without jokers
	// number: the number of decks to build
	// color: (optional) deck color; defaults to blue
	var cards = [];
	if (number < 1) {
		return false;
	}
	var SUITS = ['clubs', 'hearts', 'spades', 'diamonds'];
	var LABEL_AND_VALUE = {
		'ace' : [1, 11],
		'2' : [2],
		'3' : [3],
		'4' : [4],
		'5' : [5],
		'6' : [6],
		'7' : [7],
		'8' : [8],
		'9' : [9],
		'10' : [10],
		'jack' : [10],
		'queen' : [10],
		'king' : [10]
	};
	
	var _color = color ? color : 'blue';
	var card;
	for (var s in SUITS) {
		for (var label in LABEL_AND_VALUE) {
			card = new Card(SUITS[s], label, LABEL_AND_VALUE[label], _color);
			for (var n = 0; n < number; n++) {
				cards.push(card);
			}
		}
	}
	
	this.add_cards(cards);
	return true;
};
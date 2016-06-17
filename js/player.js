/**
 * Author: Patrick Ederer
 * Date: 14 June 13
 */

function Player( name ) {
	
	var _name = name;
	var _cards = [];
	
	this.name = function() { return _name; };
	this.cards = function() { return _cards; };
	
	this.draw = function( cards ) {
		_cards = _cards.concat(cards);
		return _cards;
	};
	
	this.discard_set = function( indeces ) {
		var discards = []
		var card;
		for (var i in indeces) {
			card = _cards.splice(indeces[i], 1);
			discards.push(card);
		}
		return discards;
	};
	
	this.discard_all = function() {
		var cards = _cards;
		_cards = [];
		return cards;
	};
};


/**
 * Author: Patrick Ederer
 * Date: 10 June 13
 */

var _deck;
var _dealer;
var _players = [];
var set_deck = function( deck ) {
	deck.build_blackjack_deck(1, 'red');
	_deck = deck;
};
var get_deck = function() {
	return _deck;
};
var set_dealer = function( dealer ) {
	var name = dealer.name();
	$('#dealer_row').append('<span class="player-name-' + name + '"></span>');
	$('.player-name-' + name).append('<span class="player-cards-' + name + '"></span>');
	_dealer = dealer;
};
var get_dealer = function() {
	return _dealer;
};
var add_player = function( player ) {
	var name = player.name();
	var span = $('<span style="display: inline-block;"></span>');
	var ul = $('<ul class="player-name-' + name + '" style="list-style: none outside none;"></ul>');
	var li = $('<li class="player-cards-' + name + '"></li>');
	ul.append(li);
	
	li = $('<li class="player-action-' + name + ' hide"></li>');
	var div = $('<div class="btn-group"></div>');
	div.append('<span class="btn btn-double">Double Down</span>');
	div.append('<span class="btn btn-split">Split</span>');
	div.append('<span class="btn btn-hit">Hit</span>');
	div.append('<span class="btn btn-stand">Stand</span>');
	li.append(div);
	ul.append(li);
	span.append(ul);
	$('#player_row').append(span);
	
	$('.player-action-' + name + ' .btn-double').click(function() {
		double_down(player);
	});
	$('.player-action-' + name + ' .btn-split').click(function() {
		split(player);
	});
	$('.player-action-' + name + ' .btn-hit').click(function() {
		hit(player);
	});
	$('.player-action-' + name + ' .btn-stand').click(function() {
		stand(player);
	});
	
	_players.push(player);
};
var remove_player = function( player ) {
	var name = player.name();
	$('.player-action-' + name + ' .btn-double').unbind();
	$('.player-action-' + name + ' .btn-split').unbind();
	$('.player-action-' + name + ' .btn-hit').unbind();
	$('.player-action-' + name + ' .btn-stand').unbind();
	$('.player-name-' + name).parent().remove();
	for (var i in _players) {
		if (_players[i].name() === name) {
			_players.splice(i, 1);
			delete player;
			break;
		}
	}
};
var get_players = function() {
	return _players;
};

function setup() {
	var name = $('.welcome-screen input').val();
	name = name.replace(/[^a-zA-Z0-9]/g, '_');
	if (!name || name === 'dealer') {
		alert('"' + name + '" is not an acceptable name.\nPlease try a new name.');
		return false;
	}
	
	$('.sidebar').removeClass('hide');
	$('.welcome-screen').addClass('hide');
	
	var dealer = new Player('dealer');
	set_dealer(dealer);
	
	var player = new Player(name);
	add_player(player);
	
	var deck = new Deck();
	set_deck(deck);
	
	// $('#deal_btn').text('Re-Deal');
	$('#deal_btn').click(deal);
};

var collect_cards = function() {
	// Receive cards from players and re-shuffle the deck
	var deck = get_deck();
	var dealer = get_dealer();
	var players = get_players();
	// for (var p in players) {
	for (var p = players.length - 1; p >= 0; p--) {
		deck.add_cards(players[p].discard_all());
		var partial_name = players[p].name().substr(-4);
		if (partial_name === '_alt') {
			remove_player(players[p]);
		}
	}
	deck.add_cards(dealer.discard_all());
	deck.shuffle();
	return true;
}

var deal = function() {
	
	var deck = get_deck();
	var dealer = get_dealer();
	var players = get_players();
	
	collect_cards();
	
	var card;
	for (p in players) {
		card = deck.deal(1);
		players[p].draw(card);
	}
	
	card = deck.deal(1);
	dealer.draw(card);
	
	var card;
	for (p in players) {
		card = deck.deal(1);
		players[p].draw(card);
	}
	
	card = deck.deal(1);
	dealer.draw(card);
	
	show_cards();
	
	return true;
};

var show_cards = function() {
	
	var dealer = get_dealer();
	var players = get_players();
	
	// Player cards
	// var player = players[0];
	for (var p in players) {
		var player = players[p];
		var cards = player.cards();
		var name = player.name();
		$('.player-cards-' + name + ' span').remove();
		for (var c in cards) {
			$('.player-cards-' + name).append('<span class="'+ cards[c].style_medium + '"></span>');
		}
		$('.player-action-' + player.name()).removeClass('hide');
	}
	
	// Dealer cards
	cards = dealer.cards();
	name = dealer.name();
	if (cards.length !== 2) {
		alert(name + ' has too many cards!');
	}
	$('.player-cards-' + name + ' span').remove();
	$('.player-cards-' + name).append('<span class="'+ cards[0].style_medium + '"></span>');
	$('.player-cards-' + name).append('<span class="'+ cards[1].style_hidden_medium + '"></span>');
	
	return true;
};

var hit = function( player ) {
	var deck = get_deck();
	var card = deck.deal(1);
	var value = hand_value(player.cards());
	
	if (value[0] < 21 && value[1] !== 21) {
		player.draw(card);
		show(player);
	} else {
		alert('You cannot "Hit" without going over 21.');
		return false;
	}
	
	return true;
};

var show = function( player ) {
	
	// Clean-up
	$('.player-cards-' + player.name() + ' span').remove();
	var cards = player.cards();
	for (var c in cards) {
		$('.player-cards-' + player.name()).append('<span class="'+ cards[c].style_medium + '"></span>');
	}
	return true;
};

var hand_value = function( cards ) {
	var value = 0;
	var ace = false;
	for (var c in cards) {
		if (cards[c].label === 'ace') {
			ace = true;
		}
		value += cards[c].value[0];
	}
	
	if (ace) {
		return [value, value + 10];
	}
	return [value, value];
};

var stand = function( player ) {
	$('.player-action-' + player.name()).addClass('hide');
	
	var dealer = get_dealer();
	show(dealer);
	
	var value;
	var done = false;
	while (!done) {
		value = hand_value(dealer.cards());
		if (value[0] > 16 || ( value[1] > 16 && value[1] <= 21) ) {
			done = true;
		} else {
			hit(dealer);
		}
	}
	score();
};

var split = function( player ) {
	if (player.cards().length !== 2 || player.cards()[0].label !== player.cards()[1].label) {
		return false;
	}
	var deck = get_deck();
	var card = player.discard_set([1])[0];
	var alt_player = new Player(player.name() + '_alt');
	add_player(alt_player);
	alt_player.draw(card);
	card = deck.deal(1);
	alt_player.draw(card);
	$('.player-action-' + alt_player.name()).removeClass('hide');
	show(alt_player);
	
	card = deck.deal(1);
	player.draw(card);
	show(player);
	
	return true;
};

var double_down = function( player ) {
	hit(player);
	stand(player);
	// var deck = get_deck();
	// var card = player.discard_set([1])[0];
	// var alt_player = new Player(player.name() + '_alt');
	// add_player(alt_player);
	// alt_player.draw(card);
	// card = deck.deal(1);
	// alt_player.draw(card);
	// $('.player-action-' + alt_player.name()).removeClass('hide');
	// show(alt_player);
// 	
	// card = deck.deal(1);
	// player.draw(card);
	// show(player);
// 	
	// return true;
};

var score = function() {
	
	var text = '';
	var dealer = get_dealer();
	var players = get_players();
	var wins = parseInt($('#wins').text());
	var losses = parseInt($('#losses').text());
	
	var dealer_score = hand_value(dealer.cards());
	dealer_score = dealer_score[0] > 16 ? dealer_score[0] : dealer_score[1];
	if (dealer_score > 21) {
		dealer_score = 0;
	}
	
	var player_score;
	for (var p in players) {
		player_score = hand_value(players[p].cards());
		player_score = player_score[1] <= 21 ? player_score[1] : player_score[0];
		if (player_score > 21) {
			player_score = 0;
		}
		if (player_score > dealer_score) {
			wins += 1;
		} else if (player_score === dealer_score && player_score !== 0){
			// Push
		} else {
			losses += 1;
		}
	}
	var win_percentage = 100 * wins / ( wins + losses );
	$('#win_percentage').text(win_percentage + '%');
	$('#losses').text(losses);
	$('#wins').text(wins);
	// alert(text)
	return true;
}

function rules() {
	// TODO
	alert('TODO')
};

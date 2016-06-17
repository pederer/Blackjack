/**
 * Author: Patrick Ederer
 * Date: 10 June 13
 */

(function() {
	
	// Deck options
	var deck_color = 'red',
		number_of_decks = 1;
	
	var _bankroll = 1000;
	var _wager = 100;
	var _double_down = 1;
	
	var deck = new Deck(),
		dealer = new Player('dealer'),
		player = new Player('player'),
		player_split = new Player('player-split');
	
	var setup = function() {
		collect_cards(function() {
			deck = new Deck();
			deck.build_blackjack_deck(number_of_decks, deck_color);
			wager();
			// deal();
		});
	};
	
	var wager = function() {
		$('#wagerModal h3').text('$' + String(_bankroll));
		$('#wagerModal input').val(_wager);
		
		$('#wagerModal').modal('show');
	};
	
	var deal = function() {
		collect_cards(function() {
			player.draw(deck.deal(1));
			dealer.draw(deck.deal(1));
			player.draw(deck.deal(1));
			dealer.draw(deck.deal(1));
			
			show_cards();
			
			// Based on hand, enable/disable action options
			var value = hand_value(player.cards())[0];
			if (value === 9 || value === 10 || value === 11) {
				$('.player-action .btn-double.hide').removeClass('hide');
			} else {
				$('.player-action .btn-double').addClass('hide');
			}
			if (player.cards()[0].label === player.cards()[1].label) {
				$('.player-action .btn-split.hide').removeClass('hide');
			} else {
				$('.player-action .btn-split').addClass('hide');
			}
		});
	};
	
	var collect_cards = function( callback ) {
		_double_down = 1;
		
		// Receive cards from players and re-shuffle the deck
		if (player_split.cards().length !== 0) {
			$('.player-split').addClass('hide');
			$('.player-split-action.hide').removeClass('hide');
			deck.add_cards(player_split.discard_all());
		}
		$('.player-action.hide').removeClass('hide');
		deck.add_cards(player.discard_all());
		deck.add_cards(dealer.discard_all());
		deck.shuffle();
		
		callback();
	};
	
	var show_cards = function() {
		player.show();
		
		var cards = dealer.cards();
		if (cards.length !== 2) {
			alert(name + ' has too many cards!');
		}
		$('.dealer-cards span').remove();
		$('.dealer-cards').append('<span class="'+ cards[0].style_medium + '"></span>');
		$('.dealer-cards').append('<span class="'+ cards[1].style_hidden_medium + '"></span>');
	};
	
	Player.prototype.hit = function() {
		var value = hand_value(this.cards());
		if (value[0] < 21 && value[1] !== 21) {
			this.draw(deck.deal(1));
			this.show();
		} else {
			alert('You cannot "Hit" without going over 21.');
		}
	};
	
	Player.prototype.show = function() {
		var name = this.name(),
			cards = this.cards();
			
		$('.' + name + '-cards span').remove();
		for (var index in cards) {
			$('.' + name + '-cards').append('<span class="'+ cards[index].style_medium + '"></span>');
		}
		// Temporary trouble-shooting measure
		show_deck();
	};
	
	// Temporary trouble-shooting measure
	var show_deck = function() {
		var deck_cards = deck.cards();
		var deck_copy = [];
		
		for (var index in deck_cards) {
			deck_copy.push(new Card(deck_cards[index].suit, deck_cards[index].label, deck_cards[index].value, deck_cards[index].color));
		}
		
		deck_copy.sort(function(a, b) {
			if (a.value[0] < b.value[0]){
				return -1;
			} else if (a.value[0] > b.value[0]){
				return 1;
			} else {
				if (a.label < b.label){
					return -1;
				} else if (a.label > b.label){
					return 1;
				} else {
					return 0;
				}
			}
		});
		
		$('.deck-cards span').remove();
		for (index in deck_copy) {
			$('.deck-cards').append('<span class="'+ deck_copy[index].style_medium + '"></span>');
		}
	};
	
	Player.prototype.stand = function() {
		$('.' + this.name() + '-action').addClass('hide');
		
		if (player_split.cards().length !== 0) {
			if (!$('.player-action').hasClass('hide') || !$('.player-split-action').hasClass('hide')) {
				return false;
			}
		}
		
		var value = 0;
		var done = false;
		
		dealer.show();
		
		while (!done) {
			value = hand_value(dealer.cards());
			if (value[0] > 16 || ( value[1] > 16 && value[1] <= 21) ) {
				done = true;
			} else {
				dealer.hit();
			}
		}
		results();
	};
	
	Player.prototype.double_down = function() {
		_double_down = 2;
		this.hit();
		this.stand();
	};
	
	Player.prototype.split = function() {
		$('.player-split.hide').removeClass('hide');
		$('.player-split-action.hide').removeClass('hide');
		player_split.draw(this.discard_set([1])[0]);
		player_split.draw(deck.deal(1));
		player_split.show();
		
		$('.player-action .btn-split').addClass('hide');
		$('.player-action .btn-double').addClass('hide');
		this.draw(deck.deal(1));
		this.show();
		
		// After splitting aces, no other actions are allowed
		if (this.cards()[0].label === 'ace') {
			this.stand();
			player_split.stand();
		}
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
	
	var results = function() {
		var player_victory = true;
		var player_split_victory = true;
		var value = 0;
		
		$('#resultsModal .results span').remove();
		var resultsModal = $('#resultsModal .results');
		
		var dealer_score = hand_value(dealer.cards());
		dealer_score = dealer_score[0] > 16 ? dealer_score[0] : dealer_score[1];
		if (dealer_score > 21) {
			dealer_score = 0;
			resultsModal.append('<span>Dealer goes bust!<br /></span>');
		} else {
			resultsModal.append('<span>Dealer scores ' + dealer_score + '<br /></span>');
		}
		
		var player_score = hand_value(player.cards());
		player_score = player_score[1] <= 21 ? player_score[1] : player_score[0];
		if (player_score > 21) {
			player_score = 0;
			resultsModal.append('<span>Player goes bust!<br /></span>');
		} else {
			resultsModal.append('<span>Player scores ' + player_score + '<br /></span>');
		}
		
		if (player_score === 21 && player.cards().length === 2 && player_split.cards().length === 0) {
			value = ((_wager * 3) / 2);
		} else if (player_score > dealer_score) {
			value += (_wager * _double_down);
		} else if (player_score === dealer_score && player_score !== 0){
			// Push
		} else {
			value -= (_wager * _double_down);
		}
		
		if (player_split.cards().length) {
			player_score = hand_value(player_split.cards());
			player_score = player_score[1] <= 21 ? player_score[1] : player_score[0];
			if (player_score > 21) {
				player_score = 0;
				resultsModal.append('<span>Player\'s split goes bust!<br /></span>');
			} else {
				resultsModal.append('<span>Player\'s split scores ' + player_score + '<br /></span>');
			}
			
			if (player_score > dealer_score) {
				value += (_wager * _double_down);
			} else if (player_score === dealer_score && player_score !== 0){
				// Push
			} else {
				value -= (_wager * _double_down);
			}
		}
		
		resultsModal.append('<span><br />Net gain: ' + value + '<br /></span>');
		
		_bankroll += value;
		
		$('#resultsModal h3').text('$' + String(_bankroll));
		$('#resultsModal input').val(_wager);
		$('#resultsModal').modal('show');
	};
	
	
	
	//////////////////////////////////////////////////////////////////////////
	// 							Game Control Buttons						//
	//////////////////////////////////////////////////////////////////////////
	$('.jumbotron .btn').click(setup);
	
	$('#new_game_btn').click(function() {
		// This hack allows me to navigate without setting "active" classes in the navbar
		$('.jumbotron .btn').click();
	});
	
	$('#betting_mat').click(function() {
		// alert('here')
	});
	
	
	
	//////////////////////////////////////////////////////////////////////////
	// 							Modal Buttons								//
	//////////////////////////////////////////////////////////////////////////
	$('#game_options_btn').click(function() {
		if (deck_color === 'red') {
			$('#blue_deck_btn').removeClass('btn-primary');
			$('#red_deck_btn').addClass('btn-danger');
		} else {
			$('#blue_deck_btn').addClass('btn-primary');
			$('#red_deck_btn').removeClass('btn-danger');
		}
		
		$('#deck_count_input').val(number_of_decks);
		
		$('#optionsModal').modal('show');
	});
	
	$('#blue_deck_btn').click(function() {
		$('#blue_deck_btn').addClass('btn-primary');
		$('#red_deck_btn').removeClass('btn-danger');
	});
	
	$('#red_deck_btn').click(function() {
		$('#blue_deck_btn').removeClass('btn-primary');
		$('#red_deck_btn').addClass('btn-danger');
	});
	
	$('#optionsModal .modal-footer .btn-primary').click(function() {
		number_of_decks = $('#deck_count_input').val();
		var intRegex = /^\d{1,2}$/;
		if (!intRegex.test(number_of_decks)) {
			number_of_decks = 1;
		}
		if ($('#blue_deck_btn').hasClass('btn-primary')) {
			deck_color = 'blue';
		} else {
			deck_color = 'red';
		}
	});
	
	$('#resultsModal .btn-primary').on('click', function() {
		_wager = parseInt($('#resultsModal input').val());
		deal();
	});
	
	$('#wagerModal .btn-primary').on('click', function() {
		_wager = parseInt($('#wagerModal input').val());
		deal();
	});
	
	
	
	//////////////////////////////////////////////////////////////////////////
	// 							Action-Bar Buttons							//
	//////////////////////////////////////////////////////////////////////////
	$('.player-split-action .btn-hit').click(function() { player_split.hit(); });
	
	$('.player-split-action .btn-stand').click(function() { player_split.stand(); });
	
	$('.player-action .btn-hit').click(function() { player.hit(); });
	
	$('.player-action .btn-stand').click(function() { player.stand(); });
	
	$('.player-action .btn-double').click(function() { player.double_down(); });
	
	$('.player-action .btn-split').click(function() { player.split(); });
	
})();
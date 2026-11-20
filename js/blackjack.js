/**
 * Browser controller for the single-player blackjack table.
 */
(function($) {
	'use strict';

	var STARTING_BANKROLL = 1000;
	var MAX_DECKS = 8;
	var bankroll = STARTING_BANKROLL;
	var previousWager = 100;
	var selectedDeckColor = 'red';
	var selectedDeckCount = 1;
	var deck = null;
	var dealerCards = [];
	var hands = [];
	var phase = 'welcome';
	var splitUsed = false;
	var roundStartBankroll = STARTING_BANKROLL;

	var $welcome = $('#welcome_screen');
	var $game = $('#game_screen');
	var $wagerModal = $('#wagerModal');
	var $resultsModal = $('#resultsModal');
	var $optionsModal = $('#optionsModal');

	function handValue(cards) {
		var hardTotal = 0;
		var hasAce = false;
		var i;
		for (i = 0; i < cards.length; i += 1) {
			hardTotal += cards[i].value[0];
			if (cards[i].label === 'ace') {
				hasAce = true;
			}
		}
		return hasAce && hardTotal + 10 <= 21 ? hardTotal + 10 : hardTotal;
	}

	function isBlackjack(cards) {
		return cards.length === 2 && handValue(cards) === 21;
	}

	function hardHandValue(cards) {
		var total = 0;
		var i;
		for (i = 0; i < cards.length; i += 1) {
			total += cards[i].value[0];
		}
		return total;
	}

	function canDouble(hand) {
		var total = hardHandValue(hand.cards);
		return !hand.splitHand && hand.cards.length === 2 && !isBlackjack(hand.cards) &&
			(total === 9 || total === 10 || total === 11);
	}

	function cardName(card) {
		var label = card.label === 'ace' ? 'ace' : card.label;
		return label + ' of ' + card.suit;
	}

	function renderCards(cards, hiddenHoleCard) {
		var classes = [];
		var spoken = [];
		var i;
		for (i = 0; i < cards.length; i += 1) {
			if (hiddenHoleCard && i === 1) {
				classes.push('<span class="' + cards[i].style_hidden_medium + '" aria-hidden="true"></span>');
				spoken.push('one card face down');
			} else {
				classes.push('<span class="' + cards[i].style_medium + '" aria-hidden="true"></span>');
				spoken.push(cardName(cards[i]));
			}
		}
		return '<div class="hand-cards" role="img" aria-label="' + spoken.join(', ') + '">' + classes.join('') + '</div>';
	}

	function updateTable() {
		var dealerHidden = phase === 'player';
		var dealerTotal = '';
		var dealerLabel = 'Dealer cards: ';
		var i;

		$('#bankroll_display').text('Bankroll: $' + bankroll);
		$('#dealer_cards').html(renderCards(dealerCards, dealerHidden));
		if (dealerCards.length) {
			if (dealerHidden) {
				dealerLabel += cardName(dealerCards[0]) + ' and one card face down';
				dealerTotal = 'Showing ' + handValue([dealerCards[0]]);
			} else {
				dealerLabel += dealerCards.map(cardName).join(', ');
				dealerTotal = 'Total ' + handValue(dealerCards);
			}
			$('#dealer_cards .hand-cards').attr('aria-label', dealerLabel);
		}
		$('#dealer_total').text(dealerTotal);

		$('#game_status').text(statusText());
		$('#player_hands').empty();
		for (i = 0; i < hands.length; i += 1) {
			$('#player_hands').append(renderHand(i, hands[i]));
		}
		if (phase === 'player') {
			$('#player_hands .active-hand [data-action="hit"]').trigger('focus');
		}

		var canWager = phase === 'ready' || phase === 'settled';
		$('#betting_mat').prop('disabled', !canWager || bankroll < 1);
		if (bankroll < 1 && canWager) {
			$('#betting_mat').text('Below minimum wager — start a New Game');
		} else if (phase === 'player') {
			$('#betting_mat').text('Round in progress');
		} else if (phase === 'settled') {
			$('#betting_mat').text('Place Next Bet');
		} else {
			$('#betting_mat').text('Place Bet');
		}
	}

	function statusText() {
		if (phase === 'ready') {
			return bankroll >= 1 ? 'Place a wager to begin.' : 'Your bankroll is below the minimum wager. Start a New Game to reset it.';
		}
		if (phase === 'player') {
			var index = currentHandIndex();
			return index === -1 ? 'Resolving the round…' : 'Hand ' + (index + 1) + ': choose Hit, Stand, Double Down, or Split when available.';
		}
		if (phase === 'settled') {
			return bankroll >= 1 ? 'Round complete. Place another wager or start a New Game.' : 'Round complete. Your bankroll is below the minimum wager; start a New Game to reset it.';
		}
		return 'Start a New Game to play.';
	}

	function currentHandIndex() {
		var i;
		for (i = 0; i < hands.length; i += 1) {
			if (!hands[i].done) {
				return i;
			}
		}
		return -1;
	}

	function renderHand(index, hand) {
		var current = phase === 'player' && index === currentHandIndex();
		var title = hands.length > 1 ? 'Hand ' + (index + 1) : 'Your Hand';
		var value = handValue(hand.cards);
		var html = '<section class="player-hand' + (current ? ' active-hand' : '') + '" aria-labelledby="hand-title-' + index + '">';
		html += '<h3 id="hand-title-' + index + '">' + title + '</h3>';
		html += renderCards(hand.cards, false);
		html += '<p class="hand-total">Total ' + value + ' · Wager $' + hand.wager + '</p>';
		if (current) {
			html += '<div class="hand-actions" role="group" aria-label="Actions for ' + title + '">';
			html += actionButton('hit', 'Hit');
			html += actionButton('stand', 'Stand');
			if (canDouble(hand)) {
				html += actionButton('double', 'Double Down', bankroll < hand.wager, 'Additional wager requires $' + hand.wager + '.');
				if (bankroll < hand.wager) {
					html += '<p class="hand-status">Double Down needs an additional $' + hand.wager + '.</p>';
				}
			}
			if (!splitUsed && hand.cards.length === 2 && hand.cards[0].label === hand.cards[1].label) {
				html += actionButton('split', 'Split', bankroll < hand.wager, 'Additional wager requires $' + hand.wager + '.');
				if (bankroll < hand.wager) {
					html += '<p class="hand-status">Splitting needs an additional $' + hand.wager + '.</p>';
				}
			}
			html += '</div>';
		} else if (hand.done) {
			html += '<p class="hand-status">Hand complete</p>';
		} else {
			html += '<p class="hand-status">Waiting for the previous hand</p>';
		}
		return html + '</section>';
	}

	function actionButton(action, label, disabled, hint) {
		return '<button type="button" class="btn btn-default" data-action="' + action + '"' +
			(disabled ? ' disabled aria-describedby="bankroll_display" title="' + hint + '"' : '') + '>' + label + '</button>';
	}

	function showGameScreen() {
		$welcome.addClass('hidden');
		$game.removeClass('hidden');
	}

	function buildShoe() {
		deck = new Deck();
		deck.build_blackjack_deck(selectedDeckCount, selectedDeckColor);
		deck.shuffle();
	}

	function newGame() {
		hideVisibleModals(function() {
			bankroll = STARTING_BANKROLL;
			previousWager = Math.min(previousWager, bankroll);
			dealerCards = [];
			hands = [];
			splitUsed = false;
			phase = 'ready';
			buildShoe();
			showGameScreen();
			updateTable();
			openWagerModal();
		});
	}

	function hideVisibleModals(callback) {
		var $visible = $('.modal.in');
		if (!$visible.length) {
			callback();
			return;
		}
		var remaining = $visible.length;
		$visible.one('hidden.bs.modal', function() {
			remaining -= 1;
			if (!remaining) {
				callback();
			}
		}).modal('hide');
	}

	function openWagerModal() {
		if (bankroll < 1) {
			updateTable();
			return;
		}
		$('#wager_bankroll').text('$' + bankroll);
		$('#wager_input').attr('max', bankroll).val(Math.max(1, Math.min(previousWager, bankroll)));
		validateWagerInput($('#wager_input'), $('#wager_error'), $('#start_round_btn'));
		$wagerModal.modal('show');
	}

	function validateWagerInput($input, $error, $button) {
		var raw = $input.val();
		var amount = /^\d+$/.test(raw) ? Number(raw) : NaN;
		var valid = isFinite(amount) && amount >= 1 && amount <= bankroll;
		$button.prop('disabled', !valid);
		$error.text(valid ? '' : 'Enter a whole-dollar wager from $1 to $' + bankroll + '.');
		return valid ? amount : null;
	}

	function collectRoundCards() {
		var i;
		if (!deck) {
			buildShoe();
		}
		for (i = 0; i < dealerCards.length; i += 1) {
			deck.add_cards([dealerCards[i]]);
		}
		for (i = 0; i < hands.length; i += 1) {
			deck.add_cards(hands[i].cards);
		}
		deck.shuffle();
	}

	function startRound(amount) {
		if ((phase !== 'ready' && phase !== 'settled') || !isFinite(amount) || amount < 1 || Math.floor(amount) !== amount || amount > bankroll) {
			return;
		}
		collectRoundCards();
		roundStartBankroll = bankroll;
		previousWager = amount;
		bankroll -= amount;
		splitUsed = false;
		dealerCards = [];
		hands = [{ cards: [], wager: amount, done: false, splitHand: false, natural: false }];
		hands[0].cards.push(deck.deal(1)[0]);
		dealerCards.push(deck.deal(1)[0]);
		hands[0].cards.push(deck.deal(1)[0]);
		dealerCards.push(deck.deal(1)[0]);
		phase = 'player';
		showGameScreen();

		var dealerNatural = isBlackjack(dealerCards);
		hands[0].natural = isBlackjack(hands[0].cards);
		if (dealerNatural || hands[0].natural) {
			revealDealer();
			settleRound(dealerNatural, false);
			return;
		}
		updateTable();
	}

	function revealDealer() {
		$('#dealer_cards .hand-cards').attr('aria-label', 'Dealer cards: ' + dealerCards.map(cardName).join(', '));
	}

	function hit(index) {
		if (phase !== 'player' || index !== currentHandIndex()) {
			return;
		}
		var hand = hands[index];
		if (handValue(hand.cards) >= 21) {
			hand.done = true;
			advanceHands();
			return;
		}
		hand.cards.push(deck.deal(1)[0]);
		if (handValue(hand.cards) >= 21) {
			hand.done = true;
		}
		advanceHands();
	}

	function stand(index) {
		if (phase !== 'player' || index !== currentHandIndex()) {
			return;
		}
		hands[index].done = true;
		advanceHands();
	}

	function doubleDown(index) {
		if (phase !== 'player' || index !== currentHandIndex()) {
			return;
		}
		var hand = hands[index];
		if (!canDouble(hand) || bankroll < hand.wager) {
			return;
		}
		bankroll -= hand.wager;
		hand.wager *= 2;
		hand.cards.push(deck.deal(1)[0]);
		hand.done = true;
		advanceHands();
	}

	function split(index) {
		if (phase !== 'player' || index !== currentHandIndex() || splitUsed || bankroll < hands[index].wager) {
			return;
		}
		var original = hands[index];
		if (original.cards.length !== 2 || original.cards[0].label !== original.cards[1].label) {
			return;
		}
		bankroll -= original.wager;
		var left = { cards: [original.cards[0]], wager: original.wager, done: false, splitHand: true, natural: false };
		var right = { cards: [original.cards[1]], wager: original.wager, done: false, splitHand: true, natural: false };
		left.cards.push(deck.deal(1)[0]);
		right.cards.push(deck.deal(1)[0]);
		splitUsed = true;
		hands = [left, right];
		left.done = handValue(left.cards) >= 21;
		right.done = handValue(right.cards) >= 21;
		if (left.cards[0].label === 'ace') {
			left.done = true;
			right.done = true;
		}
		advanceHands();
	}

	function advanceHands() {
		if (currentHandIndex() !== -1) {
			updateTable();
			return;
		}
		playDealerAndSettle();
	}

	function playDealerAndSettle() {
		var anyLiveHand = hands.some(function(hand) { return handValue(hand.cards) <= 21; });
		if (anyLiveHand) {
			while (handValue(dealerCards) < 17) {
				dealerCards.push(deck.deal(1)[0]);
			}
			settleRound(false, true);
		} else {
			settleRound(false, false);
		}
	}

	function settleRound(dealerNatural, dealerPlayed) {
		var dealerTotal = handValue(dealerCards);
		var dealerBust = dealerTotal > 21;
		var resultLines = [];
		var i;
		var hand;
		var total;
		var outcome;
		var returned;

		phase = 'settled';
		revealDealer();
		if (dealerNatural) {
			resultLines.push('<p><strong>Dealer has blackjack.</strong></p>');
		} else if (hands.some(function(item) { return item.natural; })) {
			resultLines.push('<p>Dealer does not have blackjack.</p>');
		} else if (dealerPlayed) {
			resultLines.push('<p>' + (dealerBust ? 'Dealer busts.' : 'Dealer stands at ' + dealerTotal + '.') + '</p>');
		} else {
			resultLines.push('<p>Dealer reveals the hole card; all player hands have busted.</p>');
		}

		for (i = 0; i < hands.length; i += 1) {
			hand = hands[i];
			total = handValue(hand.cards);
			returned = 0;
			if (dealerNatural) {
				if (hand.natural) {
					outcome = 'Push';
					returned = hand.wager;
				} else {
					outcome = 'Loss';
				}
			} else if (hand.natural) {
				outcome = 'Blackjack — win pays 3:2';
				returned = hand.wager * 2.5;
			} else if (total > 21) {
				outcome = 'Bust — loss';
			} else if (dealerBust || total > dealerTotal) {
				outcome = 'Win';
				returned = hand.wager * 2;
			} else if (total === dealerTotal) {
				outcome = 'Push';
				returned = hand.wager;
			} else {
				outcome = 'Loss';
			}
			bankroll += returned;
			resultLines.push('<p><strong>' + (hands.length > 1 ? 'Hand ' + (i + 1) : 'Your hand') + ':</strong> ' + total + ' — ' + outcome + '.</p>');
		}

		resultLines.push('<p><strong>Net for round:</strong> $' + (bankroll - roundStartBankroll) + '</p>');
		$('#results_content').html(resultLines.join(''));
		$('#results_bankroll').text('$' + bankroll);
		$('#next_wager').attr('max', bankroll).val(Math.max(1, Math.min(previousWager, bankroll)));
		if (bankroll >= 1) {
			$('#empty_bankroll_message').text('');
			validateWagerInput($('#next_wager'), $('#next_wager_error'), $('#play_again_btn'));
		} else {
			$('#next_wager_error').text('');
			$('#play_again_btn').prop('disabled', true);
			$('#empty_bankroll_message').text('Your bankroll is below the $1 minimum wager. Start a New Game to reset it.');
		}
		updateTable();
		$resultsModal.modal('show');
	}

	function handleAction(action) {
		var index = currentHandIndex();
		if (index === -1) {
			return;
		}
		if (action === 'hit') {
			hit(index);
		} else if (action === 'stand') {
			stand(index);
		} else if (action === 'double') {
			doubleDown(index);
		} else if (action === 'split') {
			split(index);
		}
	}

	$('#welcome_new_game, #new_game_btn').on('click', newGame);
	$('#betting_mat').on('click', openWagerModal);
	$('#game_options_btn').on('click', function() {
		$('#deck_count_input').val(selectedDeckCount);
		$('#blue_deck_btn').toggleClass('btn-primary', selectedDeckColor === 'blue');
		$('#red_deck_btn').toggleClass('btn-danger', selectedDeckColor === 'red');
		$optionsModal.modal('show');
	});
	$('#blue_deck_btn').on('click', function() {
		$('#blue_deck_btn').addClass('btn-primary');
		$('#red_deck_btn').removeClass('btn-danger');
		$('#blue_deck_btn').attr('aria-pressed', 'true');
		$('#red_deck_btn').attr('aria-pressed', 'false');
	});
	$('#red_deck_btn').on('click', function() {
		$('#red_deck_btn').addClass('btn-danger');
		$('#blue_deck_btn').removeClass('btn-primary');
		$('#red_deck_btn').attr('aria-pressed', 'true');
		$('#blue_deck_btn').attr('aria-pressed', 'false');
	});
	$('#save_options_btn').on('click', function() {
		var rawCount = $('#deck_count_input').val();
		var count = /^\d+$/.test(rawCount) ? Number(rawCount) : NaN;
		if (!isFinite(count) || count < 1 || count > MAX_DECKS) {
			$('#deck_count_error').text('Choose a whole number of decks from 1 to ' + MAX_DECKS + '.');
			return;
		}
		selectedDeckCount = count;
		selectedDeckColor = $('#blue_deck_btn').hasClass('btn-primary') ? 'blue' : 'red';
		$('#blue_deck_btn').attr('aria-pressed', selectedDeckColor === 'blue' ? 'true' : 'false');
		$('#red_deck_btn').attr('aria-pressed', selectedDeckColor === 'red' ? 'true' : 'false');
		$('#deck_count_error').text('');
		$optionsModal.modal('hide');
	});

	$('#wager_input').on('input', function() {
		validateWagerInput($('#wager_input'), $('#wager_error'), $('#start_round_btn'));
	});
	$('#next_wager').on('input', function() {
		validateWagerInput($('#next_wager'), $('#next_wager_error'), $('#play_again_btn'));
	});
	$('#start_round_btn').on('click', function() {
		var amount = validateWagerInput($('#wager_input'), $('#wager_error'), $('#start_round_btn'));
		if (amount === null) {
			return;
		}
		hideVisibleModals(function() { startRound(amount); });
	});
	$('#play_again_btn').on('click', function() {
		var amount = validateWagerInput($('#next_wager'), $('#next_wager_error'), $('#play_again_btn'));
		if (amount === null) {
			return;
		}
		hideVisibleModals(function() { startRound(amount); });
	});
	$('#player_hands').on('click', '[data-action]', function() {
		handleAction($(this).attr('data-action'));
	});
	$('#resultsModal').on('hidden.bs.modal', function() {
		if (phase === 'settled' && bankroll > 0) {
			$('#betting_mat').trigger('focus');
		}
	});
	$('#wagerModal').on('hidden.bs.modal', function() {
		if (phase === 'ready') {
			$('#betting_mat').trigger('focus');
		}
	});

	$('#welcome_screen').removeClass('hidden');
	$('#game_screen').addClass('hidden');
	updateTable();
}(jQuery));

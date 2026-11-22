/** Browser controller for the single-player blackjack table. */
(function() {
	'use strict';

	var STARTING_BANKROLL = 1000;
	var MAX_DECKS = 8;
	var CARD_REVEAL_MS = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 100;
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
	var interactionToken = 0;
	var actionTimer = null;
	var pendingAnimationIds = [];

	function byId(id) {
		return document.getElementById(id);
	}

	var welcomeScreen = byId('welcome_screen');
	var gameScreen = byId('game_screen');
	var wagerDialog = byId('wagerModal');
	var resultsDialog = byId('resultsModal');
	var optionsDialog = byId('optionsModal');

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
		return card.label + ' of ' + card.suit;
	}

	function renderCards(cards, hiddenHoleCard, animationIds) {
		var classes = [];
		var spoken = [];
		var isAnimated;
		var slotClass;
		var faceClass;
		var i;
		for (i = 0; i < cards.length; i += 1) {
			isAnimated = animationIds.indexOf(cards[i].id) !== -1;
			slotClass = 'card-slot' + (isAnimated ? ' card-dealing' : '');
			if (hiddenHoleCard && i === 1) {
				faceClass = cards[i].style_hidden_medium;
				classes.push('<span class="' + slotClass + '" aria-hidden="true"><span class="' + faceClass + '"></span></span>');
				spoken.push('one card face down');
			} else {
				faceClass = cards[i].style_medium;
				classes.push('<span class="' + slotClass + '" aria-hidden="true"><span class="' + faceClass + '"></span></span>');
				spoken.push(cardName(cards[i]));
			}
		}
		return '<div class="hand-cards" role="img" aria-label="' + spoken.join(', ') + '">' + classes.join('') + '</div>';
	}

	function updateTable() {
		var dealerHidden = phase === 'player' || phase === 'dealing' || phase === 'revealing';
		var dealerTotal = '';
		var dealerLabel = 'Dealer cards: ';
		var i;
		var dealerCardsNode;
		var animationIds = pendingAnimationIds.slice(0);
		pendingAnimationIds = [];

		byId('bankroll_display').textContent = 'Bankroll: $' + bankroll;
		byId('dealer_cards').innerHTML = renderCards(dealerCards, dealerHidden, animationIds);
		if (dealerCards.length) {
			if (dealerHidden) {
				dealerLabel += cardName(dealerCards[0]) + ' and one card face down';
				dealerTotal = 'Showing ' + handValue([dealerCards[0]]);
			} else {
				dealerLabel += dealerCards.map(cardName).join(', ');
				dealerTotal = 'Total ' + handValue(dealerCards);
			}
			dealerCardsNode = byId('dealer_cards').querySelector('.hand-cards');
			dealerCardsNode.setAttribute('aria-label', dealerLabel);
		}
		byId('dealer_total').textContent = dealerTotal;
		byId('game_status').textContent = statusText();

		var playerHands = byId('player_hands');
		playerHands.innerHTML = '';
		for (i = 0; i < hands.length; i += 1) {
			playerHands.insertAdjacentHTML('beforeend', renderHand(i, hands[i], animationIds));
		}
		if (phase === 'player') {
			var firstAction = playerHands.querySelector('.active-hand [data-action="hit"]');
			if (firstAction) {
				firstAction.focus();
			}
		}

		var canWager = phase === 'ready' || phase === 'settled';
		var bettingMat = byId('betting_mat');
		bettingMat.disabled = !canWager || bankroll < 1;
		if (bankroll < 1 && canWager) {
			bettingMat.textContent = 'Below minimum wager — start a New Game';
		} else if (phase === 'player') {
			bettingMat.textContent = 'Round in progress';
		} else if (phase === 'settled') {
			bettingMat.textContent = 'Place Next Bet';
		} else {
			bettingMat.textContent = 'Place Bet';
		}
	}

	function statusText() {
		if (phase === 'ready') {
			return bankroll >= 1 ? 'Place a wager to begin.' : 'Your bankroll is below the minimum wager. Start a New Game to reset it.';
		}
		if (phase === 'dealing') {
			return 'Dealing cards…';
		}
		if (phase === 'revealing') {
			return 'Card revealed…';
		}
		if (phase === 'dealer') {
			return 'Dealer is playing…';
		}
		if (phase === 'player') {
			var index = currentHandIndex();
			return index === -1 ? 'Resolving the round…' : (hands.length > 1 ? 'Playing Hand ' + (index + 1) + ' of ' + hands.length + ': choose an available action.' : 'Your hand: choose an available action.');
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

	function renderHand(index, hand, animationIds) {
		var current = phase === 'player' && index === currentHandIndex();
		var title = hands.length > 1 ? 'Hand ' + (index + 1) : 'Your Hand';
		var value = handValue(hand.cards);
		var html = '<section class="player-hand' + (current ? ' active-hand' : '') + '" aria-labelledby="hand-title-' + index + '">';
		html += '<h3 id="hand-title-' + index + '">' + title + '</h3>';
		html += renderCards(hand.cards, false, animationIds);
		html += '<p class="hand-total">Total ' + value + ' · Wager $' + hand.wager + '</p>';
		if (current) {
			if (hands.length > 1) {
				html += '<p class="hand-status action-help">Playing Hand ' + (index + 1) + ' of ' + hands.length + '.</p>';
			}
			html += '<div class="hand-actions" role="group" aria-label="Actions for ' + title + '">';
			html += actionButton('hit', 'Hit');
			html += actionButton('stand', 'Stand');
			if (canDouble(hand)) {
				html += actionButton('double', 'Double Down', bankroll < hand.wager, 'Additional wager requires $' + hand.wager + '.');
				if (bankroll < hand.wager) {
					html += '<p class="hand-status">Double Down needs an additional $' + hand.wager + '.</p>';
				}
			} else if (hand.splitHand) {
				html += '<p class="hand-status action-help">Double Down is unavailable after splitting.</p>';
			} else {
				html += '<p class="hand-status action-help">Double Down is available only on an opening hard total of 9, 10, or 11.</p>';
			}
			if (!splitUsed && hand.cards.length === 2 && hand.cards[0].label === hand.cards[1].label) {
				html += actionButton('split', 'Split', bankroll < hand.wager, 'Additional wager requires $' + hand.wager + '.');
				if (bankroll < hand.wager) {
					html += '<p class="hand-status">Splitting needs an additional $' + hand.wager + '.</p>';
				}
			}
			html += '</div>';
		} else if (hand.done) {
			html += '<p class="hand-status">' + (hand.splitHand && hand.cards[0].label === 'ace' ? 'Split aces receive one card each; this hand stands.' : 'Hand complete') + '</p>';
		} else {
			html += '<p class="hand-status">Waiting for Hand ' + index + ' to finish.</p>';
		}
		return html + '</section>';
	}

	function actionButton(action, label, disabled, hint) {
		return '<button type="button" class="button button-secondary" data-action="' + action + '"' +
			(disabled ? ' disabled aria-describedby="bankroll_display" title="' + hint + '"' : '') + '>' + label + '</button>';
	}

	function showGameScreen() {
		welcomeScreen.classList.add('hidden');
		gameScreen.classList.remove('hidden');
	}

	function buildShoe() {
		deck = new Deck();
		deck.build_blackjack_deck(selectedDeckCount, selectedDeckColor);
		deck.shuffle();
	}

	function cancelScheduledAction() {
		interactionToken += 1;
		if (actionTimer !== null) {
			window.clearTimeout(actionTimer);
			actionTimer = null;
		}
		pendingAnimationIds = [];
	}

	function closeOpenDialogs(callback) {
		var openDialogs = document.querySelectorAll('dialog[open]');
		for (var i = 0; i < openDialogs.length; i += 1) {
			openDialogs[i].close();
		}
		if (callback) {
			callback();
		}
	}

	function newGame() {
		cancelScheduledAction();
		closeOpenDialogs(function() {
			bankroll = STARTING_BANKROLL;
			previousWager = Math.min(previousWager, bankroll);
			dealerCards = [];
			hands = [];
			splitUsed = false;
			phase = 'ready';
			buildShoe();
			showGameScreen();
			updateTable();
			openWagerDialog();
		});
	}

	function openDialog(dialog, initialFocus) {
		if (!dialog.open) {
			dialog.showModal();
		}
		if (initialFocus) {
			initialFocus.focus();
		}
	}

	function openWagerDialog() {
		if (bankroll < 1) {
			updateTable();
			return;
		}
		byId('wager_bankroll').textContent = '$' + bankroll;
		byId('wager_input').max = bankroll;
		byId('wager_input').value = Math.max(1, Math.min(previousWager, bankroll));
		validateWagerInput(byId('wager_input'), byId('wager_error'), byId('start_round_btn'));
		openDialog(wagerDialog, byId('wager_input'));
	}

	function validateWagerInput(input, error, button) {
		var raw = input.value;
		var amount = /^\d+$/.test(raw) ? Number(raw) : NaN;
		var valid = isFinite(amount) && amount >= 1 && amount <= bankroll;
		button.disabled = !valid;
		error.textContent = valid ? '' : 'Enter a whole-dollar wager from $1 to $' + bankroll + '.';
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
		cancelScheduledAction();
		var token = interactionToken;
		collectRoundCards();
		roundStartBankroll = bankroll;
		previousWager = amount;
		bankroll -= amount;
		splitUsed = false;
		dealerCards = [];
		hands = [{ cards: [], wager: amount, done: false, splitHand: false, natural: false }];
		phase = 'dealing';
		showGameScreen();
		updateTable();

		var cards = deck.deal(4);
		var steps = [
			{ target: 'player', card: cards[0] },
			{ target: 'dealer', card: cards[1] },
			{ target: 'player', card: cards[2] },
			{ target: 'dealer', card: cards[3] }
		];
		revealOpeningCard(token, steps, 0);
	}

	function revealOpeningCard(token, steps, index) {
		if (token !== interactionToken || phase !== 'dealing') {
			return;
		}
		var step = steps[index];
		if (step.target === 'player') {
			hands[0].cards.push(step.card);
		} else {
			dealerCards.push(step.card);
		}
		pendingAnimationIds = [step.card.id];
		updateTable();
		if (index + 1 < steps.length) {
			actionTimer = window.setTimeout(function() {
				actionTimer = null;
				revealOpeningCard(token, steps, index + 1);
			}, CARD_REVEAL_MS);
		} else {
			actionTimer = window.setTimeout(function() {
				actionTimer = null;
				completeOpeningDeal(token);
			}, CARD_REVEAL_MS);
		}
	}

	function completeOpeningDeal(token) {
		if (token !== interactionToken || phase !== 'dealing') {
			return;
		}
		var dealerNatural = isBlackjack(dealerCards);
		hands[0].natural = isBlackjack(hands[0].cards);
		if (dealerNatural || hands[0].natural) {
			settleRound(dealerNatural, false);
			return;
		}
		phase = 'player';
		updateTable();
	}

	function revealDealer() {
		var cardsNode = byId('dealer_cards').querySelector('.hand-cards');
		if (cardsNode) {
			cardsNode.setAttribute('aria-label', 'Dealer cards: ' + dealerCards.map(cardName).join(', '));
		}
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
		var card = deck.deal(1)[0];
		hand.cards.push(card);
		pendingAnimationIds = [card.id];
		if (handValue(hand.cards) >= 21) {
			hand.done = true;
		}
		showPlayerRevealThenAdvance();
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
		var card = deck.deal(1)[0];
		hand.cards.push(card);
		pendingAnimationIds = [card.id];
		hand.done = true;
		showPlayerRevealThenAdvance();
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
		var leftCard = deck.deal(1)[0];
		var rightCard = deck.deal(1)[0];
		left.cards.push(leftCard);
		right.cards.push(rightCard);
		pendingAnimationIds = [leftCard.id, rightCard.id];
		splitUsed = true;
		hands = [left, right];
		left.done = handValue(left.cards) >= 21;
		right.done = handValue(right.cards) >= 21;
		if (left.cards[0].label === 'ace') {
			left.done = true;
			right.done = true;
		}
		showPlayerRevealThenAdvance();
	}

	function showPlayerRevealThenAdvance() {
		var token = interactionToken;
		phase = 'revealing';
		updateTable();
		actionTimer = window.setTimeout(function() {
			if (token !== interactionToken || phase !== 'revealing') {
				return;
			}
			actionTimer = null;
			phase = 'player';
			advanceHands();
		}, CARD_REVEAL_MS);
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
			phase = 'dealer';
			updateTable();
			continueDealerTurn(interactionToken);
		} else {
			settleRound(false, false);
		}
	}

	function continueDealerTurn(token) {
		if (token !== interactionToken || phase !== 'dealer') {
			return;
		}
		if (handValue(dealerCards) < 17) {
			var card = deck.deal(1)[0];
			dealerCards.push(card);
			pendingAnimationIds = [card.id];
			updateTable();
			actionTimer = window.setTimeout(function() {
				actionTimer = null;
				continueDealerTurn(token);
			}, CARD_REVEAL_MS);
			return;
		}
		settleRound(false, true);
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
		byId('results_content').innerHTML = resultLines.join('');
		byId('results_bankroll').textContent = '$' + bankroll;
		byId('next_wager').max = bankroll;
		byId('next_wager').value = Math.max(1, Math.min(previousWager, bankroll));
		if (bankroll >= 1) {
			byId('empty_bankroll_message').textContent = '';
			validateWagerInput(byId('next_wager'), byId('next_wager_error'), byId('play_again_btn'));
		} else {
			byId('next_wager_error').textContent = '';
			byId('play_again_btn').disabled = true;
			byId('empty_bankroll_message').textContent = 'Your bankroll is below the $1 minimum wager. Start a New Game to reset it.';
		}
		updateTable();
		openDialog(resultsDialog, byId('next_wager'));
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

	byId('welcome_new_game').addEventListener('click', newGame);
	byId('new_game_btn').addEventListener('click', newGame);
	byId('betting_mat').addEventListener('click', openWagerDialog);
	byId('game_options_btn').addEventListener('click', function() {
		byId('deck_count_input').value = selectedDeckCount;
		byId('blue_deck_btn').classList.toggle('is-selected', selectedDeckColor === 'blue');
		byId('red_deck_btn').classList.toggle('is-selected', selectedDeckColor === 'red');
		byId('blue_deck_btn').setAttribute('aria-pressed', selectedDeckColor === 'blue' ? 'true' : 'false');
		byId('red_deck_btn').setAttribute('aria-pressed', selectedDeckColor === 'red' ? 'true' : 'false');
		openDialog(optionsDialog, byId('deck_count_input'));
	});

	byId('blue_deck_btn').addEventListener('click', function() {
		byId('blue_deck_btn').classList.add('is-selected');
		byId('red_deck_btn').classList.remove('is-selected');
		byId('blue_deck_btn').setAttribute('aria-pressed', 'true');
		byId('red_deck_btn').setAttribute('aria-pressed', 'false');
	});
	byId('red_deck_btn').addEventListener('click', function() {
		byId('red_deck_btn').classList.add('is-selected');
		byId('blue_deck_btn').classList.remove('is-selected');
		byId('red_deck_btn').setAttribute('aria-pressed', 'true');
		byId('blue_deck_btn').setAttribute('aria-pressed', 'false');
	});
	byId('save_options_btn').addEventListener('click', function() {
		var rawCount = byId('deck_count_input').value;
		var count = /^\d+$/.test(rawCount) ? Number(rawCount) : NaN;
		if (!isFinite(count) || count < 1 || count > MAX_DECKS) {
			byId('deck_count_error').textContent = 'Choose a whole number of decks from 1 to ' + MAX_DECKS + '.';
			return;
		}
		selectedDeckCount = count;
		selectedDeckColor = byId('blue_deck_btn').classList.contains('is-selected') ? 'blue' : 'red';
		byId('deck_count_error').textContent = '';
		optionsDialog.close();
	});

	byId('wager_input').addEventListener('input', function() {
		validateWagerInput(byId('wager_input'), byId('wager_error'), byId('start_round_btn'));
	});
	byId('next_wager').addEventListener('input', function() {
		validateWagerInput(byId('next_wager'), byId('next_wager_error'), byId('play_again_btn'));
	});
	byId('start_round_btn').addEventListener('click', function() {
		var amount = validateWagerInput(byId('wager_input'), byId('wager_error'), byId('start_round_btn'));
		if (amount === null) {
			return;
		}
		closeOpenDialogs(function() { startRound(amount); });
	});
	byId('play_again_btn').addEventListener('click', function() {
		var amount = validateWagerInput(byId('next_wager'), byId('next_wager_error'), byId('play_again_btn'));
		if (amount === null) {
			return;
		}
		closeOpenDialogs(function() { startRound(amount); });
	});
	byId('player_hands').addEventListener('click', function(event) {
		var button = event.target.closest('[data-action]');
		if (button && byId('player_hands').contains(button) && !button.disabled) {
			handleAction(button.getAttribute('data-action'));
		}
	});

	document.querySelectorAll('[data-close-dialog]').forEach(function(button) {
		button.addEventListener('click', function() {
			button.closest('dialog').close();
		});
	});

	wagerDialog.addEventListener('close', function() {
		if (phase === 'ready' && !document.querySelector('dialog[open]')) {
			byId('betting_mat').focus();
		}
	});
	resultsDialog.addEventListener('close', function() {
		if (phase === 'settled' && !document.querySelector('dialog[open]')) {
			byId(bankroll >= 1 ? 'betting_mat' : 'new_game_btn').focus();
		}
	});
	optionsDialog.addEventListener('close', function() {
		if (!document.querySelector('dialog[open]')) {
			byId('game_options_btn').focus();
		}
	});

	byId('welcome_screen').classList.remove('hidden');
	byId('game_screen').classList.add('hidden');
	updateTable();
}());

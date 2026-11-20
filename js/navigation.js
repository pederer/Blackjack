/** Responsive navigation shared by the game, Rules, and About pages. */
(function() {
	'use strict';

	var toggle = document.getElementById('nav_toggle');
	var menu = document.getElementById('main_navigation');
	if (!toggle || !menu) {
		return;
	}

	function closeMenu(returnFocus) {
		menu.classList.remove('is-open');
		toggle.setAttribute('aria-expanded', 'false');
		toggle.setAttribute('aria-label', 'Open navigation');
		if (returnFocus) {
			toggle.focus();
		}
	}

	toggle.addEventListener('click', function() {
		var open = menu.classList.toggle('is-open');
		toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
		toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
	});

	menu.querySelectorAll('.nav-action').forEach(function(button) {
		button.addEventListener('click', function() { closeMenu(false); });
	});
	menu.querySelectorAll('.nav-link').forEach(function(link) {
		link.addEventListener('click', function() { closeMenu(false); });
	});

	document.addEventListener('keydown', function(event) {
		if (event.key === 'Escape' && menu.classList.contains('is-open') && !document.querySelector('dialog[open]')) {
			closeMenu(true);
		}
	});
}());

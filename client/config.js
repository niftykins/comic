Meteor.startup(function() {
	Accounts.ui.config({
		passwordSignupFields: 'USERNAME_AND_EMAIL'
	});

	AccountsEntry.config({
		dashboardRoute: '/'
	});

	if($.fn.dropdown.noConflict) {
		$.fn.dropdown.noConflict();
	}

	$.fn.dropdown.settings.performance = false;
	$.fn.dropdown.settings.verbose = false;
	$.fn.dropdown.settings.debug = false;
	$.fn.transition.settings.performance = false;
	$.fn.transition.settings.verbose = false;
	$.fn.transition.settings.debug = false;

	$.fn.popup.settings.debug = false;
	$.fn.popup.settings.performance = false;
	$.fn.popup.settings.verbose = false;
});

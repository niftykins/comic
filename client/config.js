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

	['dropdown', 'transition', 'popup', 'checkbox'].forEach(function(which) {
		$.fn[which].settings.debug = false;
		$.fn[which].settings.performance = false;
		$.fn[which].settings.verbose = false;
	});
});

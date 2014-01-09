if(Meteor.isClient) Meteor.subscribe('userData');

Router.configure({
	layoutTemplate: 'layout',
	loadingTemplate: 'loading',
	waitOn: function() {
		return [Meteor.subscribe('pages'), Meteor.subscribe('chapters')];
	}
});

Router.map(function() {
	this.route('home', {
		path: '/'
	});

	this.route('archive', {
		path: '/archive'
	});

	this.route('submit', {
		path: '/submit'
	});
/*
	this.route('chapter', {
		path: '/:chapter',
		data: function() {
			var c = parseInt(this.params.chapter, 10) || 1; // go to one if bad i guess
			return Chapters.findOne({chapter: c});
		}
	});

	this.route('page', {
		path: '/:chapter/:page',
		data: function() {
			var c = parseInt(this.params.chapter, 10) || 1;
			var p = parseInt(this.params.page, 10) || 1;
			return Pages.findOne({chapter: c, page: p});
		}
	}); */
});

var requireAdmin = function() {
	var self = this;
	var user = Meteor.user();
	if(!user) {
		if(Meteor.loggingIn())
			this.render(this.loadingTemplate);
		else
			this.render('noLogin');
		this.stop();
	} else  if(!user.admin) {
		// defer to hide message while admin populates
		Meteor.defer(function() {
			self.render('noAdmin');
		});
		this.stop();
	}
};

Router.before(requireAdmin, { only: 'submit' });
Router.before(function() { Errors.clearSeen(); });

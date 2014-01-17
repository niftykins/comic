if(Meteor.isClient) Meteor.subscribe('userData');

Router.configure({
	layoutTemplate: 'layout',
	loadingTemplate: 'loading',
	notFoundTemplate: 'notFound',
	waitOn: function() {
		return [Meteor.subscribe('pages'), Meteor.subscribe('chapters'), Meteor.subscribe('images'), Meteor.subscribe('sillies')];
	}
});

Router.map(function() {
	this.route('home', {
		path: '/',
		data: function() {
			return Pages.find({}, sort).fetch().reverse()[0];
		}
	});

	this.route('archive', {
		path: '/archive'
	});

	this.route('submit', {
		path: '/submit'
	});

	this.route('editSilly', {
		path: '/sillies/:number/edit',
		data: function() {
			var number = parseInt(this.params.number, 10);

			return Sillies.findOne({number: number});
		}
	});

	this.route('sillies', {
		path: '/sillies/:number?',
		data: function() {
			var number = parseInt(this.params.number, 10);

			if(number) {
				this.render('silly');
				this.stop();
				return Sillies.findOne({number: number});
			} else
				return { sillies: Sillies.find({}, {sort: {posted: 1}}).fetch() };
		}
	});

	this.route('edit', {
		template: 'edit',
		path: '/edit/:chapter?/:page?',
		data: function() {
			var chapters = Chapters.find({}, {sort: {chapter: 1}});

			// nothing to edit
			if(chapters.count() === 0) {
				this.render('noContent');
				return;
			}

			var first = chapters.fetch()[0].chapter;
			var c = parseInt(this.params.chapter, 10) || first;
			var p = parseInt(this.params.page, 10) || 'cover';

			if(p === 'cover') {
				this.render('editChapter', {to: 'edit'});
				return Chapters.findOne({chapter: c});
			} else {
				this.render('editPage', {to: 'edit'});
				return Pages.findOne({ chapter: c, page: p});
			}
		}
	});

	this.route('chapter', {
		path: '/:chapter',
		data: function() {
			var c = parseInt(this.params.chapter, 10);
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
	});
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

Router.before(requireAdmin, { only: ['submit', 'editPage', 'editChapter'] });
Router.before(function() { Errors.clearSeen(); });

if(Meteor.isClient) Meteor.subscribe('userData');
Date.now=Date.now||function(){return new Date().getTime();};

Router.configure({
	layoutTemplate: 'layout',
	loadingTemplate: 'loading',
	notFoundTemplate: 'notFound',
	waitOn: function() {
		return [Meteor.subscribe('pages'), Meteor.subscribe('chapters'),
		Meteor.subscribe('images'), Meteor.subscribe('extras'),
		Meteor.subscribe('news')];
	}
});

Router.map(function() {
	this.route('home', {
		path: '/',
		data: function() {
			return Pages.find({}, sort).fetch().reverse()[0];
		}
	});

	this.route('contact', {
		path: '/contact',
		after: function() {
			if(Meteor.isClient) document.title = 'Contact - Best in Slot Comic';
		}
	});

	this.route('archive', {
		path: '/archive',
		after: function() {
			if(Meteor.isClient) document.title = 'Archive - Best in Slot Comic';
		}
	});

	this.route('news', {
		path: '/news',
		data: function() {
			return { news: News.find({}, {sort: {posted: -1}}) };
		},
		after: function() {
			if(Meteor.isClient) document.title = 'News - Best in Slot Comic';
		}
	});

	this.route('submit', {
		path: '/submit',
		after: function() {
			if(Meteor.isClient) document.title = 'Submit - Best in Slot Comic';
		}
	});

	this.route('editExtra', {
		path: '/extras/:number/edit',
		data: function() {
			var number = parseInt(this.params.number, 10);

			return Extras.findOne({number: number});
		}
	});

	this.route('extras', {
		path: '/extras/:number?',
		data: function() {
			var number = parseInt(this.params.number, 10);

			if(number) {
				this.render('extra');
				return Extras.findOne({number: number});
			} else {
				var extraTypes = ['oneshot', 'gallery', 'character']; // one in collections.js
				var type = this.params.number;
				var selector = {type: type};

				if(!_.contains(extraTypes, type)) {
					type = 'all';
					selector = {};
				}

				return {
					extras: Extras.find(selector, {sort: {posted: 1}}).fetch(),
					type: type
				};
			}
		},
		after: function() {
			if(Meteor.isClient) {
				var data = this.data();
				if(data.title)
					document.title = data.title + ' - Best in Slot Comic';
				else
					document.title = data.type + ' - Best in Slot Comic';
			}
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
		},
		after: function() {
			if(Meteor.isClient) {
				var data = this.data();
				document.title = data.title + ' - Best in Slot Comic';
			}
		}
	});

	this.route('page', {
		path: '/:chapter/:page',
		data: function() {
			var c = parseInt(this.params.chapter, 10) || 1;
			var p;
			if(this.params.page === 'cover')
				p = 0;
			else
				p = parseInt(this.params.page, 10) || 0;

			if(Meteor.isClient) Session.set('loadDisqus', true);

			return Pages.findOne({chapter: c, page: p});
		},
		after: function() {
			if(Meteor.isClient) {
				var data = this.data();
				var title = Chapters.findOne({chapter: data.chapter}).title;
				document.title = title + ', page ' + data.page + ' - Best in Slot Comic';
			}
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

var analytics = function() {
	(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
	(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
	m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
	})(window,document,'script','//www.google-analytics.com/analytics.js','ga');

	ga('create', 'UA-46725300-2', 'biscomic.com');
	ga('send', 'pageview');
};

Router.before(requireAdmin, { only: ['submit', 'edit', 'editExtra'] });
Router.before(function() { Errors.clearSeen(); });
Router.after(analytics);
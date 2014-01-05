Router.configure({
	layoutTemplate: 'layout',
	loadingTemplate: 'loading',
	waitOn: function() {
		return [Meteor.subscribe('pages'), Meteor.subscribe('chapters')];
	}
});

Router.map(function() {
	this.route('home', {path: '/'});

	this.route('archive', {
		path: '/archive'});

	this.route('chapter', {
		path: '/:chapter',
		data: function() {
			var c = parseInt(this.params.chapter, 10) || 1; // go to one if bad i guess
			return Chapters.findOne({chapter: c});
		}
	});
});
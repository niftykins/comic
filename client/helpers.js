Template.archive.helpers({
	chapters: function() {
		return Chapters.find();
	}
});

Template.chapter.helpers({
	pages: function() {
		return Pages.find({ chapter: this.chapter });
	}
});

Template.submit.helpers({
	chapters: function() {
		return Chapters.find({}, { sort: { chapter: -1 }, fields: { chapter: 1 } });
	}
});

Handlebars.registerHelper('pluralize', function(n, thing) {
	if(n === 1) return '1 ' + thing;
	else return n + ' ' + thing + 's';
});

Handlebars.registerHelper('debug', function() {
	console.log("Current Context");
    console.log("====================");
    console.log(this);
});

Handlebars.registerHelper('isAdmin', function() {
	return Meteor.user() && Meteor.user().admin;
});
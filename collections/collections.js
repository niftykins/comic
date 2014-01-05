Chapters = new Meteor.Collection('chapters');
Pages = new Meteor.Collection('pages');

isAdmin = function(user) {
	return user.admin;
};

Meteor.methods({
	page: function(attrs) {
		var user = Meteor.user();
		
		if(!user) // not logged in
			throw new Meteor.Error(401, "You need to login to post.");

		if(!isAdmin(user)) // if they aren't someone with permission
			throw new Meteor.Error(401, "You don't have permission to post.");

		var chapter = Chapters.findOne({ chapter: attrs.chapter });

		if(!chapter) // no chapter
			throw new Meteor.Error(422, "Chapter doesn't exist");

		var nextPage = chapter.pageCount + 1;
		var page = Pages.findOne({ chapter: attrs.chapter, page: nextPage });

		if(page) { // page for chapter already exists
			throw new Meteor.Error(422, "Page already exists", {
				chapter: attrs.chapter,
				page: attrs.page
			});
		}
	}
});
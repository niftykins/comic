Chapters = new Meteor.Collection('chapters');
Pages = new Meteor.Collection('pages');

Images = new CollectionFS('images');

isAdmin = function(user) {
	user = user || Meteor.user();
	return user.admin;
};

isImage = function(type) {
	if(typeof type === 'string') {
		return (type.match(/^image\/(png|gif|jpe?g)/) ? true : false);
	} else
		return false;
};

Images.allow({
	insert: function(userId) {
		return !!isAdmin();
	},
	update: function(userId) {
		return !!isAdmin();
	},
	remove: function(userId) {
		return !!isAdmin();
	},
});

Images.filter({
	allow: {
		extensions: ['gif', 'jpg', 'jpeg', 'png'],
		contentTypes: ['image/*']
	}
});

Images.events({
	'invalid': function(type, fileRecord) {
		Errors.throw("Some kind of disaster happened during image upload.");
	}
});

Meteor.methods({
	page: function(attrs) {
		check(attrs, {
			chapter: Match.Integer,
			type: String,
			fileId: String
		});

		var user = Meteor.user();
		
		if(!user) // not logged in
			throw new Meteor.Error(401, "You need to login to post.");

		if(!isAdmin(user)) // if they aren't someone with permission
			throw new Meteor.Error(401, "You don't have permission to post.");

		attrs.chapter = Math.abs(attrs.chapter);
		var chapter = Chapters.findOne({ chapter: attrs.chapter });

		if(!chapter) // no chapter
			throw new Meteor.Error(422, "Chapter doesn't exist.");

		if(!isImage(attrs.type))
			throw new Meteor.Error(422, "New page needs an image.");

		if(!attrs.fileId)
			throw new Meteor.Error(422, "Pretty sure you image upload broke.");

		var nextPage = chapter.pageCount + 1;

		var page = _.extend(_.pick(attrs, 'chapter', 'fileId'), {
			authorId: user._id,
			author: user.username,
			chapterId: chapter._id,
			page: nextPage,
			posted: new Date().getTime()
		});

		var pageId = Pages.insert(page);

		Chapters.update(chapter._id, { $inc: { pageCount: 1 } });

		return {
			chapter: attrs.chapter,
			page: nextPage
		};
	}
});

Meteor.methods({
	chapter: function(attrs) {
		check(attrs, {
			chapter: Match.Integer,
			title: String,
			titleShort: Match.Optional(String)
		});

		var user = Meteor.user();
		
		if(!user) // not logged in
			throw new Meteor.Error(401, "You need to login to post.");

		if(!isAdmin(user)) // if they aren't someone with permission
			throw new Meteor.Error(401, "You don't have permission to post.");

		if(!attrs.title) // not empty string
			throw new Meteor.Error(422, "Chapter needs a title");

		attrs.chapter = Math.abs(attrs.chapter);
		var chapter = Chapters.findOne({ chapter: attrs.chapter });

		if(chapter) // already exists
			throw new Meteor.Error(302, "Chapter already exists", chapter.chapter);

		var whitelist = _.pick(attrs, 'chapter', 'title', 'titleShort');

		chapter = _.defaults(whitelist, {
			authorId: user._id,
			author: user.username,
			pageCount: 0,
			posted: new Date().getTime(),
			titleShort: ''
		});

		Chapters.insert(chapter);

		return chapter.chapter;
	}
});
Chapters = new Meteor.Collection('chapters');
Pages = new Meteor.Collection('pages');

Images = new CollectionFS('images', {autopublish: false});

isAdmin = function(user) {
	user = user || Meteor.user();
	if(user)
		return user.admin;
	else
		return false;
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

// repeated user checks
var checkUser = function(user) {
	user = user || Meteor.user();

	if(!user) // not logged in
		throw new Meteor.Error(401, "You need to login to do that.");

	if(!isAdmin(user)) // if they aren't someone with permission
		throw new Meteor.Error(401, "You don't have permission to do that.");

	return true;
};

// pages
Meteor.methods({
	page: function(attrs) {
		check(attrs, {
			chapter: Match.Integer,
			type: String,
			fileId: String
		});

		var user = Meteor.user();
		
		checkUser();

		attrs.chapter = Math.abs(attrs.chapter);
		var chapter = Chapters.findOne({ chapter: attrs.chapter });

		if(!chapter) // no chapter
			throw new Meteor.Error(422, "Chapter doesn't exist.");

		if(!isImage(attrs.type))
			throw new Meteor.Error(422, "New page needs an image.");

		if(!attrs.fileId)
			throw new Meteor.Error(422, "Pretty sure your image upload broke.");

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
	},
	deletePage: function(c, p, renumber) {
		if(typeof renumber === 'undefined' || renumber === null) renumber = true;
		check(c, Match.Integer);
		check(p, Match.Integer);
		check(renumber, Boolean);

		checkUser();

		var page = Pages.findOne({ chapter: c, page: p });

		if(!page)
			throw new Meteor.Error(404, "Ch"+c+" Pg"+p+" doesn't exist.");

		console.log("Deleting Ch"+c+" Pg"+p);

		Images.remove(page.fileId);
		Pages.remove(page._id);

		Chapters.update({chapter: c}, { $inc: {pageCount: -1} });

		if(renumber) {
			Pages.update({ //query
				chapter: c,
				page: {$gt: p}
			}, { // modifier
				$inc: {page: -1}
			}, { // options
				multi: true
			});
		}
	},
	updatePage: function(attrs) {
		check(attrs, {
			chapter: Match.Integer,
			page: Match.Integer,
			type: String,
			fileId: String
		});

		checkUser();

		var page = Pages.findOne({
			chapter: attrs.chapter,
			page: attrs.page
		});

		if(!page) // no page
			throw new Meteor.Error(422, "Page doesn't exist.");

		if(!isImage(attrs.type))
			throw new Meteor.Error(422, "New page needs an image.");

		if(!attrs.fileId)
			throw new Meteor.Error(422, "Pretty sure your image upload broke.");

		Images.remove(page.fileId);

		Pages.update({
			chapter: attrs.chapter,
			page: attrs.page
		}, {
			$set: {
				fileId: attrs.fileId,
				updated: new Date().getTime()
			}
		});

		return {
			chapter: attrs.chapter,
			page: attrs.page
		};
	}
});

// chapters
Meteor.methods({
	chapter: function(attrs) {
		check(attrs, {
			chapter: Match.Integer,
			title: String,
			titleShort: Match.Optional(String)
		});

		var user = Meteor.user();
		
		checkUser();

		if(!attrs.title) // not empty string
			throw new Meteor.Error(422, "Chapter needs a title.");

		attrs.chapter = Math.abs(attrs.chapter);
		var chapter = Chapters.findOne({ chapter: attrs.chapter });

		if(chapter) // already exists
			throw new Meteor.Error(302, "Chapter already exists.", chapter.chapter);

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
	},
	updateChapter: function(attrs) {
		check(attrs, {
			title: String,
			chapter: Match.Integer
		});

		checkUser();

		if(!attrs.title)
			throw new Meteor.Error(422, "Chapter needs a title.");

		if(Chapters.find({chapter: attrs.chapter}).count() === 0)
			throw new Meteor.Error(404, "Chapter doesn't exist.");

		Chapters.update({chapter: attrs.chapter}, {
			$set: {
				title: attrs.title,
				updated: new Date().getTime()
			}
		});

		return attrs.chapter;
	},
	deleteChapter: function(c, renumber) {
		if(typeof renumber === 'undefined' || renumber === null) renumber = false;
		check(c, Match.Integer);
		check(renumber, Boolean);

		checkUser();

		console.log("Deleting Ch"+c);

		Chapters.remove({chapter: c});

		var pages = Pages.find({chapter: c});

		if(pages.count() !== 0) {
			pages.forEach(function(p) {
				Meteor.call('deletePage', c, p.page, false);
			});
		}

		if(renumber) {
			Chapters.update({ // query
				chapter: {$gt: c}
			}, { // modifier
				$inc: {chapter: -1}
			}, { // options
				multi: true
			});
		}
	}
});

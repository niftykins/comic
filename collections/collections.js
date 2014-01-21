Chapters = new Meteor.Collection('chapters');
Pages = new Meteor.Collection('pages');
Sillies = new Meteor.Collection('sillies');
News = new Meteor.Collection('news');

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

logger = function(type, message, meta) {
	if(Meteor.isServer) {
		var user = Meteor.user();
		if(user) meta.actor = user._id;
		Winston.log(type, message, meta);
	}
};

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

		if(!isImage(attrs.type)) {
			Images.remove(attrs.fileId);
			throw new Meteor.Error(422, "New page needs an image.");
		}

		if(!attrs.fileId) {
			throw new Meteor.Error(422, "Pretty sure your image upload broke.");
		}

		var nextPage = chapter.pageCount + 1;

		var page = {
			authorId: user._id,
			author: user.username,
			chapterId: chapter._id,
			chapter: attrs.chapter,
			fileId: attrs.fileId,
			page: nextPage,
			posted: new Date().getTime()
		};

		Pages.insert(page);

		logger('info', 'New Page', page);

		Chapters.update(chapter._id, { $inc: { pageCount: 1 } });

		return {
			chapter: page.chapter,
			page: page.page
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

		logger('info', 'Deleting Page', page);

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

		if(!isImage(attrs.type)) {
			Images.remove(attrs.fileId);
			throw new Meteor.Error(422, "New page needs an image.");
		}

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

		logger('info', 'Updating Page', page);

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
			type: String,
			fileId: String
		});

		var user = Meteor.user();
		
		checkUser();

		if(!attrs.title) // not empty string
			throw new Meteor.Error(422, "Chapter needs a title.");

		attrs.chapter = Math.abs(attrs.chapter);
		var chapter = Chapters.findOne({ chapter: attrs.chapter });

		if(chapter) // already exists
			throw new Meteor.Error(302, "Chapter already exists.");

		if(!isImage(attrs.type)) {
			Images.remove(attrs.fileId);
			throw new Meteor.Error(422, "Chapter cover needs to be an image.");
		}

		if(!attrs.fileId) {
			throw new Meteor.Error(422, "Pretty sure your image upload broke.");
		}

		chapter = {
			authorId: user._id,
			author: user.username,
			chapter: attrs.chapter,
			title: attrs.title,
			fileId: attrs.fileId,
			pageCount: -1,
			posted: new Date().getTime()
		};

		var chapterId = Chapters.insert(chapter);

		logger('info', 'New Chapter', Chapters.findOne(chapterId));

		Meteor.call('page', {
			chapter: chapter.chapter,
			fileId: attrs.fileId,
			type: attrs.type
		});

		return chapter.chapter;
	},
	updateChapter: function(attrs) {
		check(attrs, {
			chapter: Match.Integer,
			title: Match.Optional(String),
			type: Match.Optional(String),
			fileId: Match.Optional(String)
		});

		checkUser();

		var chapter = Chapters.findOne({chapter: attrs.chapter});
		if(!chapter)
			throw new Meteor.Error(404, "Chapter doesn't exist.");

		if(attrs.fileId && !isImage(attrs.type)) {
			Images.remove(attrs.fileId);
			throw new Meteor.Error(422, "Chapter cover needs to be an image.");
		}

		if(attrs.fileId === '')
			throw new Meteor.Error(422, "Pretty sure your image upload broke.");

		if(attrs.fileId) // remove old one from system
			Images.remove(chapter.fileId);

		Chapters.update({chapter: attrs.chapter}, {
			$set: {
				fileId: attrs.fileId || chapter.fileId,
				title: attrs.title || chapter.title,
				updated: new Date().getTime()
			}
		});

		logger('info', 'Update Chapter', Chapters.findOne({chapter: attrs.chapter}));

		if(attrs.fileId) {
			Meteor.call('updatePage', {
				chapter: attrs.chapter,
				page: 0,
				type: attrs.type,
				fileId: attrs.fileId
			});
		}

		return attrs.chapter;
	},
	deleteChapter: function(c, renumber) {
		if(typeof renumber === 'undefined' || renumber === null) renumber = false;
		check(c, Match.Integer);
		check(renumber, Boolean);

		checkUser();

		logger('info', 'Delete Chapter', Chapters.findOne({chapter:c}));

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

// sillies
Meteor.methods({
	silly: function(attrs) {
		check(attrs, {
			title: String,
			type: String,
			fileId: String
		});

		var user = Meteor.user();
		
		checkUser();

		if(!attrs.title) // not empty string
			throw new Meteor.Error(422, "Silly needs a title.");

		if(!isImage(attrs.type)) {
			Images.remove(attrs.fileId);
			throw new Meteor.Error(422, "New page needs an image.");
		}

		if(!attrs.fileId)
			throw new Meteor.Error(422, "Pretty sure your image upload broke.");

		var sillies = Sillies.find({}, {sort: {posted: -1}});

		var nextSilly;
		if(sillies.count() === 0)
			nextSilly = 1;
		else
			nextSilly = sillies.fetch()[0].number + 1;

		var silly = {
			authorId: user._id,
			author: user.username,
			number: nextSilly,
			posted: new Date().getTime(),
			fileId: attrs.fileId,
			title: attrs.title
		};

		Sillies.insert(silly);

		logger('info', 'New Silly', silly);

		return nextSilly;
	},
	updateSilly: function(attrs) {
		check(attrs, {
			number: Match.Integer,
			title: Match.Optional(String),
			type: Match.Optional(String),
			fileId: Match.Optional(String)
		});

		checkUser();

		var silly = Sillies.findOne({number: attrs.number});

		if(!silly)
			throw new Meteor.Error(422, "Silly doesn't exist.");

		if(attrs.fileId && !isImage(attrs.type)) {
			Images.remove(attrs.fileId);
			throw new Meteor.Error(422, "Silly needs to be an image.");
		}

		if(attrs.fileId === '')
			throw new Meteor.Error(422, "Pretty sure your image upload broke.");

		if(attrs.fileId)
			Images.remove(silly.fileId);

		Sillies.update({
			number: attrs.number
		}, {
			$set: {
				fileId: attrs.fileId || silly.fileId,
				title: attrs.title || silly.title,
				updated: new Date().getTime()
			}
		});

		logger('info', 'Update Silly', silly);

		return attrs.number;
	},
	deleteSilly: function(number) {
		check(number, Match.Integer);

		checkUser();

		var silly = Sillies.findOne({number: number});

		if(!silly)
			throw new Meteor.Error(404, "Silly " + number + " doesn't exist.");

		logger('info', 'Delete Silly', silly);

		Images.remove(silly.fileId);
		Sillies.remove(silly._id);
	}
});

// news
Meteor.methods({
	news: function(attrs) {
		check(attrs, {
			content: String
		});

		var user = Meteor.user();
		
		checkUser();

		if(!attrs.content) // not empty string
			throw new Meteor.Error(422, "Chapter needs a title.");

		var news = {
			author: user.username,
			authorId: user._id,
			content: attrs.content,
			posted: new Date().getTime()
		};

		News.insert(news);

		logger('info', 'New News', news);
	},
	deleteNews: function(id) {
		check(id, String);

		checkUser();

		logger('info', 'Delete News', News.findOne(id));

		News.remove(id);
	}
});
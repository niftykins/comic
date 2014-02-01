Chapters = new Meteor.Collection('chapters');
Pages = new Meteor.Collection('pages');
Extras = new Meteor.Collection('extras');
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

logger = function(type, message, meta, tag) {
	if(Meteor.isServer) {
		if(tag !== false) { // startup log doesn't have user
			var user = Meteor.user();
			if(user) meta.actor = user._id;
		}
		Winston.log(type, message, meta);
	}
};

// repeated user checks
var checkUser = function(user) {
	user = user || Meteor.user();

	if(!user) // not logged in
		throw new Meteor.Error(401, "You need to login to do that.");

	if(!isAdmin(user)) // if they aren't someone with permission
		throw new Meteor.Error(403, "You don't have permission to do that.");

	return true;
};

calcPostTime = function calcPostTime() {
	var time = Meteor.user().postTime;
	var now = moment.utc().zone(5);
	var then = moment.utc().zone(5);
	var hour = time.meridiem === 'pm' ? time.hour + 12 : time.hour;
	var days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
	var string = "dddd, MMMM Do YYYY, h:mm:ss a";

	//console.log('Made:', now.format(string));

	then.hour(hour);
	then.minute(time.minute);
	then.second(0);
	then.millisecond(0);

	var day = _.indexOf(days, time.day);

	if(now.diff(then.day(day)) <= 0) {} // this week
	else then.day(7 + day); // next week

	var diff = then.diff(now);

	//console.log('For:', then.format(string));
	//console.log('Difference:', diff);

	return { diff: diff, when: then.valueOf() };
};

// pages
Meteor.methods({
	page: function(attrs) {
		check(attrs, {
			chapter: Match.Integer,
			type: String,
			fileId: String,
			postNow: Match.Optional(Boolean)
		});

		var user = Meteor.user();
		
		checkUser();

		attrs.chapter = Math.abs(attrs.chapter);
		var chapter = Chapters.findOne({ chapter: attrs.chapter });

		if(!chapter) // no chapter
			throw new Meteor.Error(404, "That chapter doesn't exist.");

		if(!isImage(attrs.type)) {
			Images.remove(attrs.fileId);
			throw new Meteor.Error(422, "Page needs an image.");
		}

		if(!attrs.fileId) {
			throw new Meteor.Error(422, "Pretty sure your image upload broke.");
		}

		var postTime = 0;
		if(attrs.postNow === false) postTime = calcPostTime();

		var nextPage = chapter.pageCount + 1;

		var page = {
			authorId: user._id,
			author: user.username,
			chapterId: chapter._id,
			chapter: attrs.chapter,
			fileId: attrs.fileId,
			page: nextPage,
			posted: Date.now(),
			submitted: Date.now(),
			postTime: postTime.when
		};

		var pageId = Pages.insert(page);

		if(Meteor.isServer) {
			Meteor.setTimeout(function() {
				Pages.update(pageId, {$set: {
					posted: Date.now(),
					postTime: 0
				}});

				logger('info', 'New Page timed post', Pages.findOne(pageId));
			}, postTime.diff);
		}

		logger('info', 'New Page', Pages.findOne(pageId));

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
			throw new Meteor.Error(404, "Page doesn't exist.");

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
				updated: Date.now()
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
			throw new Meteor.Error(422, "Chapter cover needs an image.");
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
			posted: Date.now()
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
				updated: Date.now()
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

// extras
var extraTypes = ['oneshot', 'gallery', 'character']; // one in router.js
Meteor.methods({
	extra: function(attrs) {
		check(attrs, {
			title: String,
			type: String,
			fileId: String,
			fileType: String
		});

		var user = Meteor.user();

		if(!isImage(attrs.fileType)) {
			Images.remove(attrs.fileId);
			throw new Meteor.Error(422, "Extra needs an image.");
		}
		
		checkUser();

		if(!attrs.title) // not empty string
			throw new Meteor.Error(422, "Extra needs a title.");

		if(!_.contains(extraTypes, attrs.type))
			throw new Meteor.Error(422, "Extra type not valid.");

		if(!attrs.fileId)
			throw new Meteor.Error(422, "Pretty sure your image upload broke.");

		var extras = Extras.find({}, {sort: {posted: -1}});

		var nextExtra;
		if(extras.count() === 0)
			nextExtra = 1;
		else
			nextExtra = extras.fetch()[0].number + 1;

		var extra = {
			authorId: user._id,
			author: user.username,
			number: nextExtra,
			posted: Date.now(),
			fileId: attrs.fileId,
			title: attrs.title,
			type: attrs.type
		};

		var extraId = Extras.insert(extra);

		logger('info', 'New Extra', Extras.findOne(extraId));

		return nextExtra;
	},
	updateExtra: function(attrs) {
		check(attrs, {
			number: Match.Integer,
			title: Match.Optional(String),
			type: Match.Optional(String),
			fileId: Match.Optional(String)
		});

		checkUser();

		var extra = Extras.findOne({number: attrs.number});

		if(!extra)
			throw new Meteor.Error(404, "Extra doesn't exist.");

		if(attrs.fileId && !isImage(attrs.type)) {
			Images.remove(attrs.fileId);
			throw new Meteor.Error(422, "Extra needs to be an image.");
		}

		if(attrs.fileId === '')
			throw new Meteor.Error(422, "Pretty sure your image upload broke.");

		if(attrs.fileId)
			Images.remove(extra.fileId);

		Extras.update({
			number: attrs.number
		}, {
			$set: {
				fileId: attrs.fileId || extra.fileId,
				title: attrs.title || extra.title,
				updated: Date.now()
			}
		});

		logger('info', 'Update Extra', extra);

		return attrs.number;
	},
	deleteExtra: function(number) {
		check(number, Match.Integer);

		checkUser();

		var extra = Extras.findOne({number: number});

		if(!extra)
			throw new Meteor.Error(404, "Extra " + number + " doesn't exist.");

		logger('info', 'Delete Extra', extra);

		Images.remove(extra.fileId);
		Extras.remove(extra._id);
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
			throw new Meteor.Error(422, "News needs content.");

		var news = {
			author: user.username,
			authorId: user._id,
			content: attrs.content,
			posted: Date.now()
		};

		var newsId = News.insert(news);

		logger('info', 'New News', News.findOne(newsId));
	},
	deleteNews: function(id) {
		check(id, String);

		checkUser();

		logger('info', 'Delete News', News.findOne(id));

		News.remove(id);
	}
});

// post time
Meteor.methods({
	time: function(time) {
		check(time, {
			day: String,
			hour: String,
			minute: String,
			meridiem: String
		});

		checkUser();

		var days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
		if(!_.contains(days, time.day))
			throw new Meteor.Error(422, "Time needs a day.");

		var hours = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
		if(!_.contains(hours, time.hour))
			throw new Meteor.Error(422, "Time needs an hour.");
		time.hour = parseInt(time.hour, 10);

		var minutes = ['00', '15', '30', '45'];
		if(!_.contains(minutes, time.minute))
			throw new Meteor.Error(422, "Time needs minutes.");
		time.minute = parseInt(time.minute, 10);

		var meridiems = ['am', 'pm'];
		if(!_.contains(meridiems, time.meridiem))
			throw new Meteor.Error(422, "Time needs a meridiem.");

		logger('info', 'Default time change', time);

		var user = Meteor.user();

		Meteor.users.update(user._id, {$set: { postTime: time } });
	}
});

// collapse form methods
Meteor.methods({
	collapseForm: function(which) {
		check(which, String);

		var user = Meteor.user();

		if(!user) return;
		if(!user.preferences) user.preferences = {};

		var old = user.preferences[which];
		var update = {};
		update['preferences.' + which] = !old;
		Meteor.users.update(user._id, {$set: update});
	}
});
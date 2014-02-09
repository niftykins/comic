sort = { sort: ["chapter", "page"] };

var Init = {
	dropdown: function() {
		$('.ui.dropdown').dropdown();
	},
	checkbox: function() {
		$('.ui.checkbox').checkbox();
	}
};

// SubmitErrors
var FormErrors = {
	show: function(parent, type, message, style) {
		var header;
		var $message = $(parent).children('.message');

		$message.removeClass('error info');
		style = style || 'error';
		$message.addClass(style);

		switch(type) {
			case 302: header = "Already Exists"; break;
			case 400:
				header = "Naughty";
				message = "Your values don't match the expected types.";
				break;
			case 401: header = "Action Forbidden"; break;
			case 403: header = "Action Forbidden"; break;
			case 404: header = "Not Found"; break;
			case 422: header = "Bad Data"; break;
			default: header = type; break;
		}

		$message.children('.header').text(header);
		$message.children('.message').text(message);

		$message.addClass('show');
	},
	hide: function(parent) {
		$(parent).find('.ui.message').removeClass('show');
	}
};

// global events
Template.layout.events({
	'click .message > .remove': function(e) {
		$(e.target).parent().removeClass('show');
	}
});

Template.header.rendered = function() {
	$('.ui.dropdown').dropdown();
};

Template.menuItems.helpers({
	active: function() {
		var args = Array.prototype.slice.call(arguments, 0);
		args.pop(); // last element is hash

		var active = _.any(args, function(name) {
			return Router.current().route.name === name;
		});

		if(active) return 'active';
	}
});

Session.setDefault('skipNews', 0);
Template.newsFeed.helpers({
	news: function() {
		return News.find({}, {
			sort: {posted: -1},
			limit: 3,
			skip: Session.get('skipNews') || 0
		});
	},
	notFirst: function() {
		return !Session.equals('skipNews', 0);
	},
	notLast: function() {
		var max = News.find().count() - 3;
		var current = Session.get('skipNews');
		return current < max;
	}
});

Template.news.helpers({
	isNews: function() {
		return News.find().count() > 0;
	}
});

Template.newsFeed.events({
	'click #news-up': function() {
		var old = Session.get('skipNews');
		Session.set('skipNews', old - 1);
	},
	'click #news-down': function() {
		var old = Session.get('skipNews');
		Session.set('skipNews', old + 1);
	}
});

Template.newsPost.events({
	'click .btn-remove': function(e, temp) {
		Session.set('deleteNewsId', this._id); // FIX ME
		$(e.target).parent().siblings('.modal').modal({
			backdrop: false
		});
	},
	'click .confirm-remove': function(e, temp) {
		console.log('news modal', temp);
		$(e.target).closest('.modal').modal('hide');
		$('body').removeClass('modal-open');
		Meteor.call('deleteNews', Session.get('deleteNewsId'), function(error) {
			if(error)
				Errors.throw(error.reason);
			else
				Errors.throw("News item removed.", "info");
		});
	}
});

Template.extraHighlight.helpers({
	extra: function() {
		return Extras.find({}, {sort: {posted: -1}}).fetch()[0];
	}
});

Template.archive.helpers({
	chapters: function() {
		return Chapters.find({}, { sort: { chapter: 1 } });
	}
});

Template.chapter.helpers({
	pages: function() {
		return Pages.find({
			chapter: this.chapter
		}, {
			sort: ['chapter', 'page']
		});
	}
});

Template.chapterArchive.helpers({
	calcPages: function() {
		return Pages.find({chapter: this.chapter, postTime: 0, page: {$ne: 0}}).count();
	}
});

Template.page.rendered = function() {
	$('.divider > .icon').popup({
		on: 'hover',
		position: 'bottom center'
	});
};

var findAdjacent = function(c, p, dir) {
	dir = dir || 1;
	var pages = Pages.find({}, sort).fetch();
	var adj;
	pages.forEach(function(page, i) {
		if(page.chapter === c && page.page === p) {
			adj = pages[i+dir];
			return;
		}
	});
	return adj;
};
Template.arrows.helpers({
	notFirst: function() {
		return this._id !== Pages.find({}, sort).fetch()[0]._id;
	},
	notLast: function() {
		return this._id !== Pages.find({}, sort).fetch().reverse()[0]._id;
	},
	first: function() {
		return Pages.find({}, sort).fetch()[0];
	},
	previous: function() {
		return findAdjacent(this.chapter, this.page, -1);
	},
	next: function() {
		return findAdjacent(this.chapter, this.page, 1);
	},
	last: function() {
		return Pages.find({}, sort).fetch().reverse()[0];
	}
});

var findAdjacentExtra = function(type, n, dir) {
	dir = dir || 1;
	var extras = Extras.find({type: type}, sort).fetch();
	var adj;
	extras.forEach(function(extra, i) {
		if(extra.number === n) {
			adj = extras[i+dir];
			return;
		}
	});
	return adj;
};
Template.extraArrows.helpers({
	notFirst: function() {
		return this._id !== Extras.find({type: this.type}, {sort: {posted: 1}}).fetch()[0]._id;
	},
	notLast: function() {
		return this._id !== Extras.find({type: this.type}, {sort: {posted: -1}}).fetch()[0]._id;
	},
	first: function() {
		return Extras.find({type: this.type}, {sort: {posted: 1}}).fetch()[0];
	},
	previous: function() {
		return findAdjacentExtra(this.type, this.number, -1);
	},
	next: function() {
		return findAdjacentExtra(this.type, this.number, 1);
	},
	last: function() {
		return Extras.find({type: this.type}, {sort: {posted: -1}}).fetch()[0];
	}
});

Template.submit.helpers({
	isChapters: function() {
		return Chapters.find().count() > 0;
	}
});

var hideIn = function(which) {
	var user = Meteor.user();
	if(user && user.preferences && user.preferences[which])
		$('#submit-'+which).removeClass('in');
};

Template.submitChapter.rendered = function() {
	Init.dropdown();
	hideIn('chapter');
};

Template.submitChapter.helpers({
	newChapters: function() {
		// finds current max chapter, and returns max +1,
		// as well as any chapters missed between 1 and max
		var chapters = Chapters.find().fetch();
		var current = [];

		chapters.forEach(function(c) {
			current.push(c.chapter);
		});

		if(current.length === 0)
			return [1]; // no chapters, just show 1

		var max = _.max(current);

		var range = _.range(1, max+2); // +1 = max
		var diff = _.difference(range, current);
		diff.sort().reverse(); // make next chapter go first

		return diff;
	}
});

Template.submitChapter.events({
	'submit form': function(e) {
		e.preventDefault();
		FormErrors.hide(e.target);
		var $t = $(e.target);

		var title = $t.find('[name=title]').val();

		if(!title) {
			FormErrors.show(e.target, 422, "Chapter needs a title.");
			return;
		}

		var c = $t.find('[name=chapter]').val();
		c = parseInt(c, 10);

		if(!c) {
			FormErrors.show(e.target, 422, "Chapter needs a number.");
			return;
		}

		var file = $t.find('[name=file]')[0].files[0];

		if(!file || !isImage(file.type)) {
			FormErrors.show(e.target, 422, "Chapter cover needs an image.");
			return;
		}

		var fileId = Images.storeFile(file);

		if(!fileId) {
			FormErrors.show(e.target, ":(", "Problem uploading image.");
			return;
		} else
			FormErrors.show(e.target, ":)", "Uploading your image now.", 'info');

		var chapter = {
			chapter: c,
			title: title,
			type: file.type,
			fileId: fileId
		};

		var image;
		var timer = Meteor.setInterval(function() {
			image = Images.findOne(fileId);

			if(image && image.complete) {
				Meteor.clearTimeout(timer);
				Meteor.call('chapter', chapter, function(error, c) {
					if(error) {
						FormErrors.show(e.target, error.error, error.reason);
						Images.remove(fileId);
					} else
						Router.go('chapter', { chapter: c });
				});
			}
		}, 1000);
	},
	'click .header.collapse': function(e) {
		Meteor.call('collapseForm', 'chapter');
	}
});

Template.submitPage.rendered = function() {
	Init.dropdown();
	Init.checkbox();
	hideIn('page');
};

Template.submitPage.helpers({
	chapters: function() {
		return Chapters.find({}, { sort: { chapter: -1 }, fields: { chapter: 1, title: 1 } });
	}
});

Template.submitPage.events({
	'submit form': function(e) {
		e.preventDefault();
		FormErrors.hide(e.target);
		var $t = $(e.target);

		var c = $t.find('[name=chapter]').val();
		c = parseInt(c, 10);

		if(!c) {
			FormErrors.show(e.target, 422, "Page needs to belong to a chapter.");
			return;
		}

		var file = $t.find('[name=file]')[0].files[0];

		if(!file || !isImage(file.type)) {
			FormErrors.show(e.target, 422, "Page needs to be an image.");
			return;
		}

		var postNow = !!($t.find('[name=now]').filter(':checked').length);

		var fileId = Images.storeFile(file);

		if(!fileId) {
			FormErrors.show(e.target, ":(", "Problem uploading image.");
			return;
		} else
			FormErrors.show(e.target, ":)", "Uploading your image now.", 'info');

		Session.set("uploadId", fileId);

		var page = {
			chapter: c,
			type: file.type,
			fileId: fileId,
			postNow: postNow
		};

		Images.findOne(fileId);

		var image;
		var timer = Meteor.setInterval(function() {
			image = Images.findOne(fileId);

			if(image && image.complete) {
				Meteor.clearTimeout(timer);
				Meteor.call('page', page, function(error, r) {
					Session.set("uploadId", null);
					if(error) {
						FormErrors.show(e.target, error.error, error.reason);
						Images.remove(fileId);
					} else
						Router.go('page', { chapter: r.chapter, page: r.page });
				});
			}
		}, 1000);
	},
	'click .header.collapse': function(e) {
		Meteor.call('collapseForm', 'page');
	}
});

Template.submitExtra.rendered = function() {
	Init.dropdown();
	hideIn('extra');
};

Template.submitExtra.events({
	'submit form': function(e) {
		e.preventDefault();
		FormErrors.hide(e.target);
		var $t = $(e.target);

		var title = $t.find('[name=title]').val();

		if(!title) { // client side erorr checks
			FormErrors.show(e.target, 422, "Extra needs a title.");
			return;
		}

		var file = $t.find('[name=file]')[0].files[0];

		if(!file || !isImage(file.type)) { // client side error checks
			FormErrors.show(e.target, 422, "Extra needs be an image.");
			return;
		}

		var type = $t.find('[name=type]').val();

		if(!type) {
			FormErrors.show(e.target, 422, "Extra needs a type.");
			return;
		}

		var fileId = Images.storeFile(file);

		if(!fileId) {
			FormErrors.show(e.target, ":(", "Problem uploading image.");
			return;
		} else
			FormErrors.show(e.target, ":)", "Uploading your image now.", 'info');

		Session.set("uploadId", fileId);

		var extra = {
			title: title,
			fileType: file.type,
			fileId: fileId,
			type: type
		};

		var image;
		var timer = Meteor.setInterval(function() {
			image = Images.findOne(fileId);

			if(image && image.complete) {
				Meteor.clearTimeout(timer);
				Meteor.call('extra', extra, function(error, r) {
					Session.set("uploadId", null);
					if(error) {
						FormErrors.show(e.target, error.error, error.reason);
						Images.remove(fileId);
					} else
						Router.go('extras', { number: r });
				});
			}
		}, 1000);
	},
	'click .header.collapse': function(e) {
		Meteor.call('collapseForm', 'extra');
	}
});

Template.submitNews.rendered = function() {
	hideIn('news');
};

Template.submitNews.events({
	'submit form': function(e) {
		e.preventDefault();
		FormErrors.hide(e.target);
		var t = $(e.target);

		var content = t.find('[name=content]').val();

		if(!content) { // client side erorr checks
			FormErrors.show(e.target, 422, "News needs content.");
			return;
		}

		var news = {
			content: content
		};

		Meteor.call('news', news, function(error) {
			if(error)
				FormErrors.show(e.target, error.error, error.reason);
			else
				Router.go('news');
		});
	},
	'click .header.collapse': function(e) {
		Meteor.call('collapseForm', 'news');
	}
});

Template.submitDefaultTime.rendered = function() {
	hideIn('time');
};

Template.submitDefaultTime.helpers({
	days: function() {
		return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
	},
	hours: function() {
		return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
	},
	minutes: function() {
		return ['00', '15', '30', '45'];
	},
	meridiem: function() {
		return ['am', 'pm'];
	},
	hasTime: function() {
		var user = Meteor.user();
		return user && user.postTime;
	},
	userDay: function() {
		return Meteor.user().postTime.day;
	},
	userTime: function() {
		var time = Meteor.user().postTime;
		return time.hour + ':' + (time.minute === 0 ? '00' : time.minute) + ' ' + time.meridiem;
	}
});

Template.submitDefaultTime.events({
	'submit form': function(e) {
		e.preventDefault();
		FormErrors.hide(e.target);
		var $t = $(e.target);

		var days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
		var day = $t.find('[name=day]').val();

		if(!_.contains(days, day)) {
			FormErrors.show(e.target, 422, "Time needs a day.");
			return;
		}

		var hours = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
		var hour = $t.find('[name=hour]').val();

		if(!_.contains(hours, hour)) {
			FormErrors.show(e.target, 422, "Time needs an hour.");
			return;
		}

		var minutes = ['00', '15', '30', '45'];
		var minute = $t.find('[name=minute]').val();

		if(!_.contains(minutes, minute)) {
			FormErrors.show(e.target, 422, "Time needs minutes.");
			return;
		}

		var meridiems = ['am', 'pm'];
		var meridiem = $t.find('[name=meridiem]').val();

		if(!_.contains(meridiems, meridiem)) {
			FormErrors.show(e.target, 422, "Time needs a meridiem.");
			return;
		}

		var time = {
			day: day,
			hour: hour,
			minute: minute,
			meridiem: meridiem
		};

		Meteor.call('time', time, function(error) {
			if(error) FormErrors.show(e.target, error.error, error.reason);
			else FormErrors.show(e.target, ":)", "Default time set.", 'info');
		});
	},
	'click .header.collapse': function(e) {
		Meteor.call('collapseForm', 'time');
	}
});

Template.estTime.created = function() {
	this.timer = Meteor.setInterval(function() {
		Session.set('estTime', moment.utc().zone(5).format('h:mm:ss a on dddd Do'));
	}, 1000);
};

Template.estTime.destroyed = function() {
	Meteor.clearInterval(this.timer);
};

Template.estTime.helpers({
	time: function() {
		return Session.get('estTime');
	}
});

Template.contact.events({
	'submit form': function(e) {
		e.preventDefault();
		FormErrors.hide(e.target);
		var t = $(e.target);

		var name = t.find('[name=name]').val();

		if(!name) {
			FormErrors.show(e.target, 422, "You need to enter a name.");
			return;
		}

		var email = t.find('[name=email]').val();

		if(!email || !email.toLowerCase().match(/^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$/)) {
			FormErrors.show(e.target, 422, "You need to enter an email.");
			return;
		}

		var content = t.find('[name=content]').val();

		if(!content) {
			FormErrors.show(e.target, 422, "You need to type a message.");
			return;
		}

		var contact = {
			name: name,
			email: email,
			content: content
		};

		Meteor.call('contact', contact, function(error) {
			if(error)
				FormErrors.show(e.target, error.error, error.reason);
			else
				Router.go('home');
		});
	}
});

Template.edit.created = function() {
	// set up defaults if new session or use url, changes UI
	var params = Router.current().params;
	var firstChapter = Chapters.find({}, {sort: {chapter: 1}}).fetch()[0].chapter;
	var c = parseInt(params.chapter, 10) || firstChapter;
	var p = parseInt(params.page, 10) || 'cover';

	Session.set('editChapter', c);
	Session.set('editPage', p);

	var full = c + " - " + Chapters.findOne({chapter: c}).title;

	Meteor.defer(function() {
		$('select[name=chapter]').val(full);
		$('select[name=page]').val(p);
	});
};

Template.edit.helpers({
	selectChapters: function() {
		return Chapters.find({}, { sort: { chapter: 1 }, fields: { chapter: 1, title: 1 } });
	},
	selectPages: function() {
		return Pages.find({
			chapter: Session.get('editChapter'),
			page: {$ne: 0} // hide page 0 as it's the cover page
		}, {
			sort: { page: 1 },
			fields: { page: 1, fileId: 1 }
		});
	},
	isExtras: function() {
		return Extras.find().count() > 0;
	}
});

Template.edit.events({
	'change select[name=chapter]': function(e) {
		var c = $(e.target).val();

		if(!c) { return; }

		c = parseInt(c, 10);

		Session.set('editChapter', c);
		Session.set('editPage', 'cover');
		$('select[name=page]').val('cover');
		
		Router.go('edit', {
			chapter: Session.get('editChapter'),
			page: Session.get('editPage')
		});
	},
	'change select[name=page]': function(e) {
		var p = $(e.target).val();

		if(!p) { return; }
		
		Session.set('editPage', p);

		Router.go('edit', {
			chapter: Session.get('editChapter'),
			page: Session.get('editPage')
		});
	}
});

Template.editChapter.rendered = function() {
	$('.editable').editable();
};

Template.editChapter.events({
	'click #btn-update': function(e) {
		var updateCall = function(thing) {
			Meteor.call('updateChapter', thing, function(error, result) {
				if(error)
					Errors.throw(error.reason);
				else
					Router.go('chapter', { chapter: result });
			});
		};

		var wait = false;
		var chapter = {
			chapter: Session.get('editChapter')
		};

		var $title = $('span[name=title]');
		if($title.hasClass("editable-unsaved")) {
				chapter.title = $title.text();
		}

		var files = $('#file-input')[0].files;
		var fileId;
		if(files.length !== 0) {
			var file = files[0];
			fileId = Images.storeFile(file);

			if(!fileId) {
				Errors.throw("Problem uploading image :(");
				return;
			} else {
				Session.set("uploadId", fileId);
				wait = true;
				Errors.throw("Uploading image.", "info");
				chapter.type = file.type;
				chapter.fileId = fileId;
			}
		}

		if(wait && fileId) {
			var image;
			var timer = Meteor.setInterval(function() {
				image = Images.findOne(fileId);
				if(image && image.complete) {
					Meteor.clearTimeout(timer);
					updateCall(chapter);
				}
			}, 1000);
		} else {
			updateCall(chapter);
		}
	},
	'click #btn-remove': function(e) {
		$('#modal-edit-chapter').modal({
			backdrop: false
		});
	},
	'click #confirm-remove': function(e) {
		$('#modal-edit-chapter').modal('hide');
		$('body').removeClass('modal-open');
		var c = Session.get('editChapter');
		Meteor.call('deleteChapter', c, function(error) {
			if(error)
				Errors.throw(error.reason);
			else {
				Errors.throw("Chapter " + c + " and its pages removed.", "info");
				Router.go('edit');
			}
		});
	},
	'change input[type=file]': function(e, template) {
		var file = (e.target.files || e.dataTransfer.files)[0];

		if(file && !isImage(file.type)) { // client side error checks
			Errors.throw("New image needs to be an image.");
			return;
		} else if(!file) {
			$(".editImage").attr('src', template.originalURL);
			return;
		}

		var reader = new FileReader();
		reader.onload = function(e) {
			$(".editImage").attr('src', e.target.result);
		};

		reader.readAsDataURL(file);
	}
});

Template.editPage.rendered = function() {
	this.originalURL = $('.editImage').attr('src');
};

Template.editPage.events({
	'click #btn-update': function(e) {
		var files = $('#file-input')[0].files;

		if(files.length === 0) // no change to image
			return;

		var file = files[0];
		var fileId = Images.storeFile(file);

		if(!fileId) {
			Errors.throw("Problem uploading image :(");
			return;
		} else
			Errors.throw("Uploading image.", "info");

		Session.set("uploadId", fileId);

		var page = {
			chapter: parseInt(Session.get('editChapter'), 10),
			page: parseInt(Session.get('editPage'), 10),
			type: file.type,
			fileId: fileId
		};

		var image;
		var timer = Meteor.setInterval(function() {
			image = Images.findOne(fileId);

			if(image && image.complete) {
				Meteor.clearTimeout(timer);
				Meteor.call('updatePage', page, function(error, r) {
					Session.set("uploadId", null);
					if(error) {
						Errors.throw(error.reason);
						Images.remove(fileId);
					} else
						Router.go('page', { chapter: r.chapter, page: r.page });
				});
			}
		}, 1000);
	},
	'click #btn-remove': function(e) {
		$('#confirm-modal').modal({
			backdrop: false
		});
	},
	'click #confirm-remove': function(e) {
		$('#confirm-modal').modal('hide');
		$('body').removeClass('modal-open');

		var c = Session.get('editChapter');
		var p = parseInt(Session.get('editPage'), 10);

		if(p === 'cover') return;

		Meteor.call('deletePage', c, p, function(error) {
			if(error)
				Errors.throw(error.reason);
			else {
				Errors.throw("Chapter " + c + " Page " + p + " removed.", "info");
				Router.go('edit', { chapter: c });
			}
		});
	},
	'change input[type=file]': function(e, template) {
		var file = (e.target.files || e.dataTransfer.files)[0];

		if(file && !isImage(file.type)) { // client side error checks
			Errors.throw("New image needs to be an image.");
			return;
		} else if(!file) {
			$(".editImage").attr('src', template.originalURL);
			return;
		}

		var reader = new FileReader();
		reader.onload = function(e) {
			$(".editImage").attr('src', e.target.result);
		};

		reader.readAsDataURL(file);
	}
});

Template.editExtra.rendered = function() {
	$('.editable').editable();
	this.originalURL = $('.editImage').attr('src');
};

Template.editExtra.events({
	'click #btn-update': function(e) {
		var updateCall = function(thing) {
			Meteor.call('updateExtra', thing, function(error, result) {
				if(error)
					Errors.throw(error.reason);
				else
					Router.go('extras', {number: result});
			});
		};

		var wait = false;
		var extra = {
			number: this.number,
		};

		var $title = $('span[name=title]');
		if($title.hasClass("editable-unsaved")) {
			_.extend(extra, {
				title: $title.text()
			});
		}
			
		var files = $('#file-input')[0].files;
		var fileId;
		if(files.length !== 0) {
			var file = files[0];
			fileId = Images.storeFile(file);

			if(!fileId) {
				Errors.throw("Problem uploading image :(");
				return;
			} else {
				Session.set("uploadId", fileId);
				wait = true;
				Errors.throw("Uploading image.", "info");
				_.extend(extra, {
					type: file.type,
					fileId: fileId
				});
			}
		}

		if(wait && fileId) {
			var image;
			var timer = Meteor.setInterval(function() {
				image = Images.findOne(fileId);
				if(image && image.complete) {
					Meteor.clearTimeout(timer);
					updateCall(extra);
				}
			}, 1000);
		} else {
			updateCall(extra);
		}
	},
	'click #btn-remove': function(e) {
		$('#confirm-modal').modal({
			backdrop: false
		});
	},
	'click #confirm-remove': function(e) {
		var n = this.number;
		Meteor.call('deleteExtra', n, function(error) {
			if(error)
				Errors.throw(error.reason);
			else {
				Errors.throw("Extra " + n + " removed.", "info");
				Router.go('extras');
			}
		});
	},
	'change input[type=file]': function(e, template) {
		var file = (e.target.files || e.dataTransfer.files)[0];

		if(file && !isImage(file.type)) { // client side error checks
			Errors.throw("New image needs to be an image.");
			return;
		} else if(!file) {
			$(".editImage").attr('src', template.originalURL);
			return;
		}

		var reader = new FileReader();
		reader.onload = function(e) {
			$(".editImage").attr('src', e.target.result);
		};

		reader.readAsDataURL(file);
	}
});

Template.disqus.rendered = function() {
	var data = this.data;
	var id = data.chapter + '/' + data.page;
	var url = 'http://biscomic.com/' + id;

	if(!window.DISQUS) {
		disqus_shortname = 'biscomic';
		disqus_identifier = id;
		disqus_url = url;

		var dsq = document.createElement('script'); dsq.type = 'text/javascript'; dsq.async = true;
		dsq.src = '//' + disqus_shortname + '.disqus.com/embed.js';
		(document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(dsq);
	}

	if(window.DISQUS) {
		DISQUS.reset({
			reload: true,
			config: function() {
				this.page.identifier = id;
				this.page.url = url;
			}
		});
	}
};


Handlebars.registerHelper('collapsed', function(which) {
	var user = Meteor.user();
	if(!user) return;

	return user.preferences && user.preferences[which];
});

Handlebars.registerHelper('getFile', function() {
	return Images.findOne(this.fileId);
});

Handlebars.registerHelper('getProgressFile', function() {
	if(!Session.equals("uploadId", null))
		return Images.findOne(Session.get("uploadId"));
});

Handlebars.registerHelper('pluralize', function(n, thing) {
	if(n === 1) return '1 ' + thing;
	else return n + ' ' + thing + 's';
});

Handlebars.registerHelper('debug', function() {
    console.log("vvv==============vvv");
    console.log(this);
    console.log("^^^==============^^^");
});

Handlebars.registerHelper('isAdmin', function() {
	return Meteor.user() && Meteor.user().admin;
});

Handlebars.registerHelper('timeAgo', function(time) {
	return moment(time).calendar();
});

var target = 1; // FIX ME unsure on a better way to open in unique tab
Handlebars.registerHelper('newsify', function(str) {
	var renderer = new marked.Renderer();

	// aim: only open external pages in a new tab
	renderer.link = function(href, title, text) {
		var a = document.createElement('a');
		a.href = href;

		var out = '<a href="' + href + '"';

		if(a.hostname !== window.location.hostname)
			out += 'target="_' + target++ + '"';

		if (title)
			out += ' title="' + title + '"';
		
		out += '>' + text + '</a>';
		return out;
	};

	var ret = marked(str, {renderer: renderer});
	return new Handlebars.SafeString(ret);
});

Handlebars.registerHelper('eq', function(value, test) {
	return (value === test);
});

Handlebars.registerHelper('truncate', function(str, length, omission) {
	if(typeof omission === 'object') omission = '...';

	if(str.length > length) {
		str = str.substr(0, length - omission.length);
		str = str.substr(0, Math.min(str.length, str.lastIndexOf(' '))) + omission;
	}

	return str;
});

Handlebars.registerHelper('user', function() {
	return Meteor.user() && Meteor.user().username;
});

Handlebars.registerHelper('whichExtra', function() {
	var t = this.type;
	if(t === 'oneshot')	return 'Oneshots';
	else if(t === 'gallery') return 'Gallery';
	else if(t === 'character') return 'Characters';
	else if(t === 'all') return 'Extras';
});

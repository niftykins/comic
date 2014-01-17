var sort = { sort: ["chapter", "page"] };
//$.fn.editable.defaults.mode = 'inline';

Template.header.helpers({
	active: function() {
		var args = Array.prototype.slice.call(arguments, 0);
		args.pop(); // last element is hash

		var active = _.any(args, function(name) {
			return Router.current().route.name === name;
		});

		return active && 'active';
	}
});

Template.archive.helpers({
	chapters: function() {
		return Chapters.find({}, { sort: { chapter: 1 } });
	}
});

Template.chapter.helpers({
	pages: function() {
		return Pages.find({ chapter: this.chapter }, sort);
	}
});

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

Template.submit.helpers({
	isChapters: function() {
		return Chapters.find().count() > 0;
	}
});

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
		Errors.cleanAll(); // remove previous form errors
		var t = $(e.target);

		var title = t.find('[name=title]').val();

		if(!title) { // client side erorr checks
			Errors.throw("New chapter needs a title.");
			return;
		}

		var chapterNumber = parseInt(t.find('[name=chapter]').val(), 10);

		if(!chapterNumber) {
			Errors.throw("New chapter needs a number.");
			return;
		}

		var chapter = {
			chapter: chapterNumber,
			title: title
		};

		Meteor.call('chapter', chapter, function(error, c) {
			if(error) {
				Errors.throw(error.reason);
			} else
				Router.go('chapter', { chapter: c });
		});
	}
});

Template.submitPage.helpers({
	chapters: function() {
		return Chapters.find({}, { sort: { chapter: -1 }, fields: { chapter: 1, title: 1 } });
	}
});

Template.submitPage.events({
	'submit form': function(e) {
		e.preventDefault();
		Errors.cleanAll(); // remove previous form errors
		var t = $(e.target);

		var c = t.find('[name=chapter]').val();

		if(!c) {
			Errors.throw("New page needs a chapter number.");
			return;
		}

		c = c.match(/^\d+/)[0];
		c = parseInt(c, 10);

		var file = t.find('[name=file]')[0].files[0];

		if(!file || !isImage(file.type)) { // client side error checks
			Errors.throw("New page needs an image.");
			return;
		}

		var fileId = Images.storeFile(file);

		if(!fileId) {
			Errors.throw("Problem uploading image :(");
			return;
		} else
			Errors.throw("Uploading image.", "info");

		Session.set("uploadId", fileId);

		var page = {
			chapter: c,
			type: file.type,
			fileId: fileId
		};

		var image;
		var timer = Meteor.setInterval(function() {
			image = Images.findOne(fileId);

			if(image && image.complete) {
				console.log('complete');
				Meteor.clearTimeout(timer);
				Meteor.call('page', page, function(error, r) {
					Session.set("uploadId", null);
					if(error) {
						Errors.throw(error.reason);
						Images.remove(fileId);
					} else
						Router.go('page', { chapter: r.chapter, page: r.page });
				});
			}
		}, 1000);

	}
});

Template.submitSilly.events({
	'submit form': function(e) {
		e.preventDefault();
		Errors.cleanAll(); // remove previous form errors
		var t = $(e.target);

		var title = t.find('[name=title]').val();

		if(!title) { // client side erorr checks
			Errors.throw("New chapter needs a title.");
			return;
		}

		var file = t.find('[name=file]')[0].files[0];

		if(!file || !isImage(file.type)) { // client side error checks
			Errors.throw("Silly needs to be an image.");
			return;
		}

		var fileId = Images.storeFile(file);

		if(!fileId) {
			Errors.throw("Problem uploading image :(");
			return;
		} else
			Errors.throw("Uploading image.", "info");

		Session.set("uploadId", fileId);

		var silly = {
			title: title,
			type: file.type,
			fileId: fileId
		};

		console.log(silly);

		var image;
		var timer = Meteor.setInterval(function() {
			image = Images.findOne(fileId);

			if(image && image.complete) {
				Meteor.clearTimeout(timer);
				Meteor.call('silly', silly, function(error, r) {
					Session.set("uploadId", null);
					if(error) {
						Errors.throw(error.reason);
						Images.remove(fileId);
					} else
						Router.go('sillies', { number: r });
				});
			}
		}, 1000);
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

	// only able to use val() to match an option, so need title
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
		return Pages.find({ chapter: Session.get('editChapter') }, {
			sort: { page: 1 },
			fields: { page: 1, fileId: 1 }
		});
	},
	isSillies: function() {
		return Sillies.find().count() > 0;
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
		var title = $('span[name=title]').text();
		console.log(title);

		if(!title) {
			Errors.throw("Chapter needs a title.");
			return;
		}

		var chapter = {
			title: title,
			chapter: Session.get('editChapter')
		};

		Meteor.call('updateChapter', chapter, function(error, result) {
			if(error)
				Errors.throw(error.reason);
			else
				Router.go('chapter', { chapter: result });
		});
	},
	'click #btn-remove': function(e) {
		$('#confirm-modal').modal({
			backdrop: false
		});
	},
	'click #confirm-remove': function(e) {
		var c = Session.get('editChapter');
		Meteor.call('deleteChapter', c, function(error) {
			if(error)
				Errors.throw(error.reason);
			else {
				Errors.throw("Chapter " + c + " and its pages removed.", "info");
				Router.go('edit');
			}
		});
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

Template.editSilly.rendered = function() {
	$('.editable').editable();
	this.originalURL = $('.editImage').attr('src');
};

Template.editSilly.events({
	'click #btn-update': function(e) {
		var updateCall = function(thing) {
			Meteor.call('updateSilly', thing, function(error, result) {
				if(error)
					Errors.throw(error.reason);
				else
					Router.go('sillies', {number: result});
			});
		};

		var wait = false;
		var silly = {
			number: this.number,
		};

		var $title = $('span[name=title]');
		if($title.hasClass("editable-unsaved")) {
			_.extend(silly, {
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
				_.extend(silly, {
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
					updateCall(silly);
				}
			}, 1000);
		} else {
			updateCall(silly);
		}
	},
	'click #btn-remove': function(e) {
		$('#confirm-modal').modal({
			backdrop: false
		});
	},
	'click #confirm-remove': function(e) {
		var n = this.number;
		Meteor.call('deleteSilly', n, function(error) {
			if(error)
				Errors.throw(error.reason);
			else {
				Errors.throw("Silly " + n + " removed.", "info");
				Router.go('sillies');
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
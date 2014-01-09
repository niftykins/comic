Template.home.helpers({
	file: function() {
		console.log(Images.find())
		return Images.find();
	}
});

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

Template.submitChapter.helpers({
	newChapters: function() {
		// finds current max chapter, and returns max +1,
		// as well as any chapters missed between 1 and max
		var chapters = Chapters.find().fetch();
		var current = [];

		chapters.forEach(function(c) {
			current.push(c.chapter);
		});

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
			Errors.throw("Chapter needs a title.");
			return;
		}

		var chapter = {
			chapter: parseInt(t.find('[name=chapter]').val(), 10),
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
		c = c.replace(/[^0-9]/g, '');
		c = parseInt(c, 10);

		var file = t.find('[name=file]')[0].files[0];

		if(!file || !isImage(file.type)) { // client side error checks
			Errors.throw("New page needs an image.");
			return;
		}

		var fileId = Images.storeFile(file);

		var reader = new FileReader();

		reader.onload = function(e) {
			var page = {
				chapter: c,
				fileName: file.name,
				type: file.type,
				dataURL: reader.result,
				size: file.size
			};

			console.log(page);

			Meteor.call('page', page, function(error, r) {
				if(error) {
					if(error.error === 400)
						Errors.throw("One of the fields wasn't the correct type, hax0r?");
					else
						Errors.throw(error.reason);
				} else {}
					//Router.go('page', { chapter: r.chapter, page: r.page });
			});
		};

		reader.readAsDataURL(file);
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

Handlebars.registerHelper('timeAgo', function(time) {
	return moment(time).calendar();
});
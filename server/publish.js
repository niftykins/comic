Meteor.publish('pages', function() {
	return Pages.find({}, {sort: { sort: ["chapter", "page"] }});
});

Meteor.publish('chapters', function() {
	return Chapters.find({}, {sort: {chapter: 1}});
});

Meteor.publish('sillies', function() {
	return Sillies.find({}, {sort: {posted: 1}});
});

Meteor.publish('news', function() {
	return News.find({}, {sort: {posted: 1}});
});

//push admin field
Meteor.publish("userData", function() {
	return Meteor.users.find({ _id: this.userId }, {
		fields: {
			admin: 1
		}
	});
});

Meteor.publish('images', function() {
	return Images.find();
});
var handles = {
	default: function(options) {
		return {
			blob: options.blob,
			fileRecord: options.fileRecord
		};
	},
	thumb: function(options) {
		var destination = options.destination();

		Imagemagick.resize({
			srcData: options.blob,
			dstPath: destination.serverFilename,
			quality: 0.7,
			width: 140
		});

		return destination.fileData;
	}
};

Images.fileHandlers(handles);
/*
if(Pages.find().count() === 0) {
	var now = new Date().getTime();
	var hour = 3600 * 1000;

	var authorId = Meteor.users.insert({
		profile: { name: "Batman" }
	});
	var author = Meteor.users.findOne(authorId);

	var c1 = Chapters.insert({
		title: "the beginning",
		titleShort: "beginning",
		authorId: author._id,
		author: author.profile.name,
		posted: now - 20 * hour,
		chapter: 1,
		pageCount: 5
	});

	var c2 = Chapters.insert({
		title: "the middle",
		titleShort: "middle",
		authorId: author._id,
		author: author.profile.name,
		posted: now - 13 * hour,
		chapter: 2,
		pageCount: 8
	});

	var c3 = Chapters.insert({
		title: "the end",
		titleShort: "end",
		authorId: author._id,
		author: author.profile.name,
		posted: now - 5 * hour,
		chapter: 4,
		pageCount: 2
	});

	var c = Chapters.find();
	c.forEach(function(chapter) {
		for(var i = 0; i < chapter.pageCount; i++) {
			Pages.insert({
				chapterId: chapter._id,
				chapter: chapter.chapter,
				page: i + 1,
				author: author.profile.name,
				authorId: author._id,
				posted: now + i * hour,
				fileName: "<chapter " + chapter.chapter + " page " + (i+1) + ">"
			});
		}
	});
}
*/
// make me an admin
Meteor.users.update({ username: "nifty" }, {$set: { admin: true } });
Meteor.publish('pages', function() {
	return Pages.find({}, {sort: {page: 1}});
});

Meteor.publish('chapters', function() {
	return Chapters.find({}, {sort: {chapter: 1}});
});

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
		chapter: 3,
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
				location: "<chapter " + chapter.chapter + " page " + (i+1) + ">"
			});
		}
	});
}
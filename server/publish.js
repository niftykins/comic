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
		var dest = options.destination();

		Imagemagick.resize({
			srcData: options.blob,
			dstPath: dest.serverFilename,
			width: 300
		});

		return dest.fileData;
	},
	square: function(options) {
		var dest = options.destination();

		Imagemagick.crop({
			srcData: options.blob,
			dstPath: dest.serverFilename,
			width: 334,
			height: 334
		});

		return dest.fileData;
	}
};

Images.fileHandlers(handles);

// make me an admin
Meteor.users.update({ username: "nifty" }, {$set: { admin: true } });
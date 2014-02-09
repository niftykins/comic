Meteor.publish('pages', function() {
	if(this.userId && Meteor.users.findOne(this.userId).admin)
		return Pages.find({}, {sort: { sort: ["chapter", "page"] }});
	else
		return Pages.find({postTime: 0}, {sort: { sort: ["chapter", "page"] }});
});

Meteor.publish('chapters', function() {
	return Chapters.find({}, {sort: {chapter: 1}});
});

Meteor.publish('extras', function() {
	return Extras.find({}, {sort: {posted: 1}});
});

Meteor.publish('news', function() {
	return News.find({}, {sort: {posted: 1}});
});

//push admin field
Meteor.publish("userData", function() {
	return Meteor.users.find({ _id: this.userId }, {
		fields: {
			postTime: 1,
			admin: 1,
			preferences: 1
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
Meteor.users.update({ username: "Jenn" }, {$set: { admin: true } });

// contact message
Meteor.methods({
	contact: function(attrs) {
		check(attrs, {
			name: String,
			email: String,
			content: String
		});

		if(!attrs.name) {
			FormErrors.show(e.target, 422, "You need to enter a name.");
			return;
		}

		if(!attrs.email || !attrs.email.toLowerCase().match(/^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,8})$/)) {
			FormErrors.show(e.target, 422, "You need to enter an email.");
			return;
		}

		if(!attrs.content) {
			FormErrors.show(e.target, 422, "You need to type a message.");
			return;
		}

		logger('info', 'Contact message', attrs, false);

		Email.send({
			to: 'jenn@biscomic.com',
			cc: 'nifty@biscomic.com',
			from: '' + attrs.email,
			subject: 'Contact Message',
			text: attrs.name + ' wishes to say:\n\n' + attrs.content + '\n\nYou can reach them at: ' + attrs.email
		});
	}
});

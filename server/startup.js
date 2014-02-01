Meteor.startup(function() {
	Winston.add(Winston.transports.File, {
		filename: process.env.PWD + '/logs/batman.log',
		maxsize: 1024 * 1024 * 1024 * 1 // 1 mb?
	});

	Winston.info('Server startup');

	// restart the auto post timer incase of shutdown
	var pages = Pages.find({postTime: {$ne: 0}});
	pages.forEach(function(page) {
		// if time it should have been posted is already past
		if(Date.now() >= page.getTime) {
			Pages.update(page._id, {$set: {
				posted: Date.now(),
				postTime: 0
			}});
			logger('info', 'New Page server post', page, false);
		} else { // has not happened yet so start timer
			Meteor.setTimeout(function() {
				Pages.update(page._id, {$set: {
					posted: Date.now(),
					postTime: 0
				}});
				logger('info', 'New Page timed post', page, false);
			}, page.postTime - Date.now());
		}
	});
});

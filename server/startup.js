Meteor.startup(function() {
	Winston.add(Winston.transports.File, {
		filename: process.env.LOG_FILE || process.env.PWD + '/batman.log',
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

	updateSitemap();
});

updateSitemap = function() {
	// sitemap
	var out = [],
		schapters = Chapters.find().fetch(),
		spages = Pages.find({postTime: 0}).fetch(),
		sextras = Extras.find().fetch(),
		snews = News.findOne({}, {sort: ['posted']});

	out.push({ page: 'extras', lastmod: Date.now() });
	out.push({ page: 'oneshots', lastmod: Date.now() });
	out.push({ page: 'gallery', lastmod: Date.now() });
	out.push({ page: 'character', lastmod: Date.now() });

	if(snews)
		out.push({ page: 'news', lastmod: snews.posted });

	if(schapters && spages && schapters.length && spages.length) {
		schapters.forEach(function(c) {
			var lastpage = Pages.findOne({chapter: c.chapter}, {sort: ['posted']});
			var lastmod = Date.now();
			if(lastpage)
				lastmod = lastpage.posted;

			out.push({
				page: c.chapter,
				lastmod: lastmod
			});
		});

		spages.forEach(function(p) {
			out.push({
				page: p.chapter + '/' + p.page,
				lastmod: p.edited || p.posted
			});
		});
	}

	if(sextras && sextras.length) {
		sextras.forEach(function(e) {
			out.push({
				page: 'extras/' + e.number,
				lastmod: e.edited || e.posted
			});
		});
	}

	sitemaps.add('/Sitemap.xml', out);
};

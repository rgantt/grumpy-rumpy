var TTBot = require('ttapi');

// just grab these from ENV for now so we don't have credentials in source control
var credentials = {
	auth: process.env.TT_AUTHID,
	user: process.env.TT_USERID,
	room: process.env.TT_ROOMID
};

var bot = new TTBot(credentials.auth, credentials.user, credentials.room);

bot.on('speak', function(data) {
	if(data.text.match(/^\/hello$/)) {
		bot.speak('Hey! How are you @'+data.name+' ?');
	}
});

/**
 * If there's only 1 DJ at a table, rumpy will grab a table so that person can continue
 * listening. He skips his songs and gets down as soon as a second DJ steps up.
 */

// hop on the table if there's only one DJ in the room and we enter it
bot.on('roomChanged', function(data) {
	// need to make sure rumpy has at least one song on his default playlist, otherwise TT blows up
	var stubSong = data.room.metadata.songlog[0]._id;
	bot.playlistAdd(stubSong);
	if(1 == data.room.metadata.djs.length) {
		bot.addDj();
	}
});

bot.on('rem_dj', function(data) {
	// if there's only 1 DJ left, let's grab a table so they can continue listening
	bot.roomInfo(false, function(data) {
		if(1 == data.room.metadata.djs.length) {
			bot.addDj();
		}
	});
});

bot.on('add_dj', function(data) {
	bot.roomInfo(false, function(data) {
		// if rumpy's at a table, remove him when a second person grabs a table
		if(false !== data.room.metadata.djs.indexOf(credentials.user)) {
			if(2 < data.room.metadata.djs.length) {
				bot.remDj();
			}
		// if he's not, put him at a table if there's only one person up there now
		} else { 
			if(1 == data.room.metadata.djs.length) {
				bot.addDj();
			}
		}
	});
});

// always skip rumpy's songs
bot.on('newsong', function(data) {
	if(data.room.metadata.current_dj == credentials.user) {
		bot.skip();
	}
});

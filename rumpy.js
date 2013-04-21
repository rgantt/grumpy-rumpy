var Bot = require('ttapi');

var credentials = {
	auth: process.env.TT_AUTHID,
	user: process.env.TT_USERID,
	room: process.env.TT_ROOMID
};

var bot = new Bot(credentials.auth, credentials.user, credentials.room);

bot.on('speak', function(data) {
	if(data.text.match(/^\/hello$/)) {
		bot.speak('Hey! How are you @'+data.name+' ?');
	}
});

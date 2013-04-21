var TTBot = require('ttapi');

// just grab these from ENV for now so we don't have credentials in source control
var credentials = {
    auth: process.env.TT_AUTHID,
    user: process.env.TT_USERID,
    room: process.env.TT_ROOMID
};

var bot = new TTBot(credentials.auth, credentials.user, credentials.room);

/**
 * If there's only 1 DJ at a table, rumpy will grab a table so that person can continue
 * listening. He skips his songs and gets down as soon as a second DJ steps up.
 */

// hop on the table if there's only one DJ in the room and we enter it
bot.on('roomChanged', function (room) {
    // need to make sure rumpy has at least one song on his default playlist, otherwise TT blows up
    bot.playlistAll(function (playlist) {
        var stubSong = room.room.metadata.songlog[0]._id;
        if (playlist.list.length == 0) {
            bot.playlistAdd(stubSong);
        }
    });

    if (room.room.metadata.djcount == 1) {
        bot.addDj();
    }
});

bot.on('rem_dj', function (data) {
    if (data.user[0].userid == credentials.user) {
        return;
    }

    console.log("A DJ has left the stage.");
    if (rumpyAtTable(data.djs)) {
        console.log("Rumpy makes his exit gracefully.");
        bot.remDj();
    } else if (numberOfDJs(data.djs) < 2) {
        console.log("Rumpy resolves to help the lone DJ.");
        bot.addDj();
    }
});

bot.on('add_dj', function (data) {
    if (data.user[0].userid == credentials.user) {
        return;
    }

    console.log("A DJ has entered the stage. Rumpy ponders the situation.");
    if (rumpyAtTable(data.djs) && numberOfDJs(data.djs) > 2) {
        console.log("It seems Rumpy's services are no longer needed.");
        bot.remDj();
    } else if (!rumpyAtTable(data.djs) && numberOfDJs(data.djs) < 2) {
        console.log("Rumpy resolves to help the lone DJ.");
        bot.addDj();
    }
});

// always skip rumpy's songs
bot.on('newsong', function (data) {
    // rumpy should never be the only DJ at a table
    if (data.room.metadata.current_dj == credentials.user) {
        if (data.room.metadata.djcount == 1) {
            console.log("Rumpy removed himself from the fray.");
            bot.remDj();
        } else {
            console.log("Rumpy skips his song; it wasn't very good, anyway.");
            bot.skip();
        }
    }
});

// always bop if someone else votes
bot.on('update_votes', function (data) {
    console.log("Rumpy shares the love.");
    bot.bop();
});

/**
 * Helper functions
 */

rumpyAtTable = function (djList) {
    var atTable = false;
    for (dj in djList) {
        if (djList[dj] == credentials.user) {
            atTable = true;
        }
    }
    return atTable;
};

numberOfDJs = function (djList) {
    var count = 0;
    for (dj in djList) {
        count++;
    }
    return count;
};

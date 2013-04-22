var TTBot = require('ttapi');

// just grab these from ENV for now so we don't have credentials in source control
var bot = {
    authtoken: process.env.TT_AUTHID,
    userid: process.env.TT_USERID,
    roomid: process.env.TT_ROOMID
};

var rumpy = new TTBot(bot.authtoken, bot.userid, bot.roomid);

/**
 * If there's only 1 DJ at a table, rumpy will grab a table so that person can continue
 * listening. He skips his songs and gets down as soon as a second DJ steps up.
 */

rumpy.on('roomChanged', function (room) {
    var numberOfDJs = room.room.metadata.djcount;
    var lastPlayedSong = room.room.metadata.songlog[0]._id;

    // rumpy needs at least one song on his default playlist, otherwise TT blows up
    rumpy.playlistAll(function (playlist) {
        if (playlist.list.length == 0) {
            console.log("Rumpy's playlist had no songs, so he stole the most recent one.");
            rumpy.playlistAdd(lastPlayedSong);
        }
    });

    // hop on the table if there's only one DJ in the room and we enter it
    if (numberOfDJs == 1) {
        console.log("Rumpy's stepping up to help the DJ.");
        rumpy.addDj();
    }
});

rumpy.on('rem_dj', function (data) {
    var removedDJ = data.user[0];

    // rumpy don't care 'bout rumpy
    if (removedDJ.userid == bot.userid) {
        return;
    }

    console.log(removedDJ.name + " has left the stage.");
    if (rumpyAtTable(data.djs)) {
        console.log("Rumpy makes his exit gracefully.");
        rumpy.remDj();
    } else if (numberOfDJs(data.djs) < 2) {
        console.log("Rumpy resolves to help the lone DJ.");
        rumpy.addDj();
    }
});

rumpy.on('add_dj', function (data) {
    var addedDJ = data.user[0];

    // rumpy don't care 'bout rumpy
    if (addedDJ.userid == bot.userid) {
        return;
    }

    console.log(addedDJ.name + " has entered the stage.");
    if (rumpyAtTable(data.djs) && numberOfDJs(data.djs) > 2) {
        console.log("It seems Rumpy's services are no longer needed.");
        rumpy.remDj();
    } else if (!rumpyAtTable(data.djs) && numberOfDJs(data.djs) < 2) {
        console.log("Rumpy resolves to help the lone DJ.");
        rumpy.addDj();
    }
});

// always skip rumpy's songs
rumpy.on('newsong', function (data) {
    var currentDJUserid = data.room.metadata.current_dj;
    var numberOfDJs = data.room.metadata.djcount;

    // rumpy should never be the only DJ at a table
    if (currentDJUserid == bot.userid) {
        if (numberOfDJs == 1) {
            console.log("Rumpy is too shy to be on stage alone.");
            rumpy.remDj();
        } else {
            console.log("Rumpy skips his song; it wasn't very good, anyway.");
            rumpy.skip();
        }
    }
});

// always bop if someone else votes
rumpy.on('update_votes', function (data) {
    console.log("Rumpy shares the love.");
    rumpy.bop();
});

/**
 * Helper functions
 */

rumpyAtTable = function (mapOfDJs) {
    return listFromMap(mapOfDJs).reduce(function (a, b) {
        return a || (b.value == bot.userid);
    }, false);
};

numberOfDJs = function (mapOfDJs) {
    return listFromMap(mapOfDJs).reduce(function (a, b) {
        return a + 1;
    }, 0);
};

listFromMap = function (map) {
    var list = [];
    for (var key in map) {
        list.push({
            key: key,
            value: map[key]
        }); 
    }
    return list;
};

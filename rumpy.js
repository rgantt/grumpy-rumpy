var TTBot = require('ttapi');

// just grab these from ENV for now so we don't have credentials in source control
var bot = {
    authtoken: process.env.TT_AUTHID,
    userid: process.env.TT_USERID,
    roomid: process.env.TT_ROOMID
};

var rumpy = {
    bot: new TTBot(bot.authtoken, bot.userid, bot.roomid),
    atTable: false,
    numberOfDJs: 0,
    
    stepUp: function() {
        this.bot.addDj();
        this.atTable = true;
    },

    stepDown: function() {
        this.bot.remDj();
        this.atTable = false;
    }
};

/**
 * If there's only 1 DJ at a table, rumpy will grab a table so that person can continue
 * listening. He skips his songs and gets down as soon as a second DJ steps up.
 */

rumpy.bot.on('roomChanged', function (room) {
    var lastPlayedSong = room.room.metadata.songlog[0]._id;
    // get a snapshot of this when we enter the room so we don't have to calculate it every time there's a change
    rumpy.numberOfDJs = room.room.metadata.djcount;

    // rumpy needs at least one song on his default playlist, otherwise TT blows up
    rumpy.bot.playlistAll(function (playlist) {
        if (playlist.list.length == 0) {
            console.log("Rumpy's playlist had no songs, so he stole the most recent one.");
            rumpy.bot.playlistAdd(lastPlayedSong);
        }
    });

    // hop on the table if there's only one DJ in the room and we enter it
    if (rumpy.numberOfDJs == 1) {
        console.log("Rumpy's stepping up to help the DJ.");
        rumpy.stepUp();
    }
});

rumpy.bot.on('rem_dj', function (data) {
    rumpy.numberOfDJs -= 1;
    
    var removedDJ = data.user[0];

    // rumpy don't care 'bout rumpy
    if (removedDJ.userid == bot.userid) {
        return;
    }

    console.log(removedDJ.name + " has left the stage.");
    if (rumpy.atTable) {
        console.log("Rumpy makes his exit gracefully.");
        rumpy.stepDown();
    } else if (rumpy.numberOfDJs < 2) {
        console.log("Rumpy resolves to help the lone DJ.");
        rumpy.stepUp();
    }
});

rumpy.bot.on('add_dj', function (data) {
    rumpy.numberOfDJs += 1;

    var addedDJ = data.user[0];

    // rumpy don't care 'bout rumpy
    if (addedDJ.userid == bot.userid) {
        return;
    }

    console.log(addedDJ.name + " has entered the stage.");
    if (rumpy.atTable && rumpy.numberOfDJs > 2) {
        console.log("It seems Rumpy's services are no longer needed.");
        rumpy.stepDown();
    } else if (!rumpy.atTable && rumpy.numberOfDJs < 2) {
        console.log("Rumpy resolves to help the lone DJ.");
        rumpy.stepUp();
    }
});

// always skip rumpy's songs
rumpy.bot.on('newsong', function (data) {
    var currentDJUserid = data.room.metadata.current_dj;

    // rumpy should never be the only DJ at a table
    if (currentDJUserid == bot.userid) {
        if (rumpy.numberOfDJs == 1) {
            console.log("Rumpy is too shy to be on stage alone.");
            rumpy.stepDown();
        } else {
            console.log("Rumpy skips his song; it wasn't very good, anyway.");
            rumpy.bot.skip();
        }
    }
});

// always bop if someone else votes
rumpy.bot.on('update_votes', function (data) {
    console.log("Rumpy shares the love.");
    rumpy.bot.bop();
});

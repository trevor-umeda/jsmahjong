/******************************
 * Module dependencies.                 *
 ******************************/
// http usage for external requests
var http = require('http');

// querystring for post formatting
var querystring = require("querystring");

// express web frame work
var express = require('express')
  , routes = require('./routes');
var app = module.exports = express.createServer();

// socket.io for server-client communication
var io = require('socket.io').listen(app);

// Models communicate with the db through mongoose
//var playerModel = require( "./models/player.js" );
//var Player = playerModel.Player;

// Models communicate with the db through mongoose
//var commentModel = require( "./models/comment.js" );
//var Comment = commentModel.Comment;

// Password encryption use
//var md5 = require( "MD5" );

// Shop communication
//var shopModel = require( "./models/shop.js" );
//var Shop = shopModel.InGidioShop;

// Javascript rendering engine
var ejs = require("ejs");

// File service
//var fs = require("fs");

// Custom A/B Test Manager
//var ABTest = require( "./models/abtest.js" );
//var ABTestManager = ABTest.ABTestManager;

/****************************
* Useful Constants                     *
*****************************/
var gameToken = '12345';
var playerPath = "/api/v1/players";
var shopSite = 'gamertiser.com';
var shopPath = '/api/v1/product.json?token=';
var shopPort = 80;
var maxPerRoom = 4; // 0 means no limit
var maxPerChannel = 500; 
var PlayerCache = { };

/*******************************
* Express Server Setup                *
********************************/
// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
console.log("Test");
app.get('/', function(req, res){
	var ip = req.connection.remoteAddress;
	var betaflag = ABTestManager.AddUser(ip);
	if( betaflag )
		res.render("index.jade", { title: "stuff", content: "nothing yet" } );
	else
		res.render("indexbeta.jade", { title : "stuff", content: "nothing yet" } );
}); // end app.get


app.get( "/mahjong", function(req, res){ 
	res.render("mahjong.jade", { title: "Mahjong" } );
} );

/****************************
* Room Models                               *
*****************************/
//The concept and logic for a game room is contained here.
var gamerooms = function(){ 
	this.rooms = {};
	this.players = {};
	this.roomCount = 0;
	this.FirstOpenRoom;
	this.NextRoomId;
	this.startFlags = {};

    //Initialization function for the rooms.
    this.Initialize = function(){
    		this.rooms[1] = [];
    		this.FirstOpenRoom = 1;
    		this.NextRoomId = 2;
    	}

    //If the room hasn't started yet then mark it down as started.
	this.StartGame = function(room){ 
		if( this.startFlags[room] )
			return false;
		else{
			this.startFlags[room] = true;
			return true;
		}
	}

    //If the room is existing and started, then finish it. Otherwise leave it alone
	this.EndGame = function(room){ 
		if( !this.startFlags[room] ){ 
			return false;
		}
		else{ 
			this.startFlags[room] = false;
			return true;
		}
	}
	//Return statistics on the room.
	this.RoomStats = function( room ){ 
		var statData = { 
			'roomId': room,
			'population': this.rooms[room].length,
			'people': this.rooms[room],
			'started': this.startFlags[room]
		};
		return statData;
	}

    //Find the room that a certain player is in.
	this.GetRoom = function(player){ 
		var room = this.players[player]['roomId'];
		return room;
	}

    //Place a player into a room.
	this.JoinRoom = function(player, room){ 
		var aRoom;

        //If a player is in a room, make him leave first.
		if( this.players[player] != undefined ){ 
			this.LeaveRoom( player );
		}
        //If no room is entered, just use the first open room available
		if(room == undefined )
			aRoom = this.FirstOpenRoom;
		else
			aRoom = room;

        //Lazy initialize the room. Set it as open and not started
		if( this.rooms[aRoom] == undefined ){
			this.rooms[aRoom] = [];	
			this.startFlags[aRoom] = false;
		}

       //If the room is full though, put the player in a better one.
		if(this.rooms[aRoom].length == maxPerRoom)
			aRoom = this.FirstOpenRoom;

        //After everything is checked out alright, finally put the player into a room.
		this.rooms[aRoom].push( player );

        //Mark the player as being put in a room as well. Let him know which room and which number he is.
		this.players[player] = { 'roomId': aRoom, 'number': this.rooms[aRoom].length-1 };

        //If the room is full then be nice and create a new room.
		if(this.rooms[aRoom].length == maxPerRoom){ 
			this.CreateNewRoom();
		}	
	}
    //Take the player and remove him from the room.
    this.LeaveRoom = function(player){
    		if( this.players[player] == undefined )
    			return false;
    		var room = this.players[player]['roomId'];
    		var number = this.players[player]['number'];
    		this.rooms[room].splice( number, 1 );
    		this.players[player] = undefined;
    		if( this.startFlags[room] == false )
    			this.FirstOpenRoom = room;
    		return room;
    	}

    //A new room is open, set it as the first open room.
	this.CreateNewRoom = function(){ 
		this.FirstOpenRoom = this.NextRoomId;
		this.rooms[this.FirstOpenRoom] = [];
		this.startFlags[this.FirstOpenRoom] = false;
		this.NextRoomId += 1;
	}
	

}

var myrooms = new gamerooms();
myrooms.Initialize();

/****************************
* Socket IO Response Server *
****************************/
// Initialize the socket connection
io.sockets.on('connection', function(socket){
    //player id will be the id of the socket
    //This is just for clarity
    playerId = socket.id

    console.log('connection to server confirmed, Player id is ' + playerId);
	socket.emit( 'connection', playerId );
		
	socket.on("disconnect", function(){ 
		var oldRoom = myrooms.LeaveRoom( playerId );
		 console.log("Disconnecting from room");
		var data, statData;
		// When we're still in a room
		if( oldRoom ){ 
			data = { 
				'sessionId': playerId,
				'roomId': oldRoom
			};
			// Let people know we've left
			socket.broadcast.to( "room#" + oldRoom ).emit( "left room down", data );
			socket.emit( "left room down", data );
			
			// Refresh the room stats
			statData = myrooms.RoomStats(oldRoom);
			socket.broadcast.to( "room#" + oldRoom ).emit( "room stat down", statData );
			socket.emit( "room stat down", statData );
			
			// Leave the socket
			socket.leave( "room#" + oldRoom );
		}
	});


	/****************************
	* Game Server Response          *
	****************************/
	// join room
	socket.on( "join room up", function( room ){
		// Step 0: Leave the current room (if we're in one)
		var oldRoom = myrooms.LeaveRoom( playerId );
		if( oldRoom ){
            console.log("Leaving room");
			var departureData = { 'sessionId': playerId };
			socket.broadcast.to( "room#" + oldRoom ).emit( "left room down", departureData );
			socket.emit( "left room down", departureData );
		}

        console.log("joining room");
		// Step 1: Join the room in the model
		myrooms.JoinRoom( playerId, room );
		
		// Step 2: Join the room over socket
		var theRoom = myrooms.GetRoom( playerId );
		socket.join( "room#" + theRoom );
		
		// Step 3: Announce to the world
		var outPut = { 
			'sessionId': playerId,
			'roomId': theRoom
		};
		socket.broadcast.to( "room#" + theRoom ).emit( "join room down", outPut );
		socket.emit( "join room down", outPut );
		
		// Step 4: Inform with channel stats also
		var statData = myrooms.RoomStats(theRoom);
		socket.broadcast.to( "room#" + theRoom ).emit( "room stat down", statData );
		socket.emit( "room stat down", statData );
		

	} );
	
	// leaving room
	socket.on( "leave room up", function( data ){
        console.log(playerId +" leaving room");

        //Have the player leave the room.
		var oldRoom = myrooms.LeaveRoom(playerId );
		if( oldRoom ){
			var departureData = { 'sessionId': playerId };
			socket.broadcast.to( "room#" + oldRoom ).emit( "left room down", departureData );
			socket.emit( "left room down", departureData );
		}
	} );
	
	// game event
	socket.on( "game event up", function(data){ 
		var middle = { 
			'sessionId': data['sessionId'],
			'name': data['name'],
			'event': data['event'],
			'roomId': data['roomId']
		};
		console.log( "middle: " + JSON.stringify( middle ) );
		if( data['roomId'] == undefined ){
			var theRoom = myrooms.GetRoom( data['sessionId'] );
			socket.broadcast.to( "room#" + theRoom ).emit( "game event down", middle );
		}
		else{ 
			socket.broadcast.to( "room#" + data['roomId'] ).emit( "game event down", middle );
		}
		socket.emit( "game event down", middle );
	});
	
	// sync
	socket.on( "sync up", function( syncRatio ){ 
		// TODO: write this
		var syncValue;
		socket.emit( "sync down", syncValue );	
	});
	
	// Starting a game
	socket.on( "start game up", function(data){ 
		var room = data['roomId'];
		var result = myrooms.StartGame( room );
		if( result ){
			socket.broadcast.to( "room#" + room).emit( "start game down", result );
			socket.emit( "start game down", result );
		}
	} );	
});



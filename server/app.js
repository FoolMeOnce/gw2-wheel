var util = require("util");
var io = require("socket.io");
var Client = require("./Client").Client;

var clients, socket;

function init() {
	clients = [];
	
	socket = io.listen(8000);

	socket.configure(function() {
		socket.set("transports", ["websocket"]);
		socket.set("log level", 2);
	});

	setEventHandlers();
};

var setEventHandlers = function() {
	socket.sockets.on("connection", onSocketConnection);
};

function onSocketConnection(client) {
	util.log("New client has connected: "+client.id);
    client.on("disconnect", onClientDisconnect);
	client.on("new client", onNewClient);
};

function onClientConnect() {
	util.log("Client has connected: "+this.id);

	var newClient = new Client();
	newClient = this.id;

	clients.push(newClient);
};

function onClientDisconnect() {
	util.log("Client has disconnected: "+this.id);

	var removeClient = clientById(this.id);

	if(!removeClient) {
		util.log("Client not found: "+this.id);
		return;
	};

	clients.splice(clients.indexOf(removeClient), 1);
	this.broadcase.emit("remove client", {id: this.id});
};

function clientById(id) {
	for(var i = 0; i < clients.length; i++) {
		if(players[i].id == id) {
			return players[i];
		}
	};

	return false;
};

init();

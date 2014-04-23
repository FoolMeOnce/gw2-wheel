var util = require("util");
var io = require("socket.io");
var Client = require("./Client").Client;

var socket, clients;

function init() {
	clients = [];

	socket = io.listen(8000);

	socket.configure(function() {
		socket.set("transports", ["websocket"]);
		socket.set("log level", 2);
	});

	setEventHandlers();
};

function setEventHandlers() {
	socket.sockets.on("connection", onSocketConnection);
};

function onSocketConnection(client) {
	util.log("New client has connected: "+client.id);
	client.on("disconnect", onClientDisconnect);
	client.on("new client", onNewClient);
};

function onClientDisconnect() {
	util.log("Client has disconnected: "+this.id);
};

function onNewClient(data) {
	var newClient = new Client(data.name);
	newClient.id = this.id;
	this.broadcast.emit("new client", {name: newClient.name});

	clients.push(newClient);
};

function clientById(id) {
	for(var i = 0; i < clients.length; i++) {
		if(clients[i].id == id) {
			return clients[i];
		}
	};
	return false;
};

init();

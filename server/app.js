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
}

function setEventHandlers() {
	socket.sockets.on("connection", onSocketConnection);
}

function onSocketConnection(client) {
	util.log("New client has connected: "+client.id);
	client.on("disconnect", onClientDisconnect);
	client.on("new client", onNewClient);
	client.on("spin", onSpin);
}

function onClientDisconnect() {
	util.log("Client has disconnected: "+this.id);

	var removeClient = clientById(this.id);

	if(!removeClient) {
		util.log("Client not found: "+this.id);
		return;
	}

	clients.splice(clients.indexOf(removeClient), 1);
	this.broadcast.emit("remove client", {id: this.id});
}

function onNewClient(data) {
	var newClient = new Client(data.name);
	util.log("Client set name: "+data.name);
	newClient.id = this.id;
	this.broadcast.emit("new client", {id: newClient.id, name: newClient.getName()});

	for(var i = 0; i < clients.length; i++) {
		var c = clients[i];
		this.emit("new client", {id: c.id, name: c.getName()});
	}

	clients.push(newClient);
}

function onSpin() {
	util.log("Spin requested by "+this.id+"!");
  var v = (Math.random() * 4) - 2;
	this.emit("spin", {variance: v});
	this.broadcast.emit("spin", {variance: v});
}

function clientById(id) {
	for(var i = 0; i < clients.length; i++) {
		if(clients[i].id == id) {
			return clients[i];
		}
	}
	return false;
}

init();

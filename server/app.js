var util = require("util");
var io = require("socket.io");
var Client = require("./Client").Client;

var socket, clients, spinner;

var pwPick = "password";
var pwOverride = "password";

var PI2 = Math.PI * 2;
var PIHALF = Math.PI / 2;

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
	client.on("pick", onRequestPick);
	client.on("override", onRequestOverride);
}

function onClientDisconnect() {
	util.log("Client has disconnected: "+this.id+" | "+clientById(this.id).name);

	var removeClient = clientById(this.id);

	if(!removeClient) {
		util.log("Client not found: "+this.id);
		return;
	}

	clients.splice(clients.indexOf(removeClient), 1);
	this.broadcast.emit("remove client", {id: this.id});

	if(this.id == spinner) {
		pickSpinner();
	}
}

function onNewClient(data) {
	var newClient = new Client(data.name);
	util.log("Client set name: "+data.name);
	newClient.id = this.id;
	newClient.name = data.name;
	this.emit("picked", {picked: clientById(spinner).name});
	this.broadcast.emit("new client", {id: newClient.id, name: newClient.getName()});

	for(var i = 0; i < clients.length; i++) {
		var c = clients[i];
		this.emit("new client", {id: c.id, name: c.getName()});
	}

	clients.push(newClient);
}

function onRequestPick(data) {
	var status = "failed";
	if(data.password === pwPick) {
		status = "succeeded";
		pickSpinner();
	}

	util.log("Attempted pick by user "+clientById(this.id).name+" using password "+data.password+" "+status);
}

function onRequestOverride(data) {
	var status = "failed";
	if(data.password === pwOverride) {
		status = "succeeded";
		spinner = this.id;
		socket.sockets.emit("picked", {picked: clientById(spinner).name});
	}

	util.log("Attempted override by user "+clientById(this.id).name+" using password "+data.password+" "+status);
}

function pickSpinner() {
	spinner = randomClient();
	util.log("Random spinner picked: "+spinner+" | "+clientById(spinner).name);

	socket.sockets.emit("picked", {picked: clientById(spinner).name});

	return spinner;
}

function onSpin() {
	requester = clientById(this.id);

	if(requester.id === spinner) {
		util.log("Spin requested by "+requester.name+": succeeded");
  	var v = (Math.random() * 4) - 2;
		wheel.spin(v);
		spinner = undefined;
		socket.sockets.emit("picked", {picked: clientById(spinner).name});
	} else {
		util.log("Spin requested by "+requester.name+": failed");
	}
}

function clientById(id) {
	for(var i = 0; i < clients.length; i++) {
		if(clients[i].id == id) {
			return clients[i];
		}
	}
	return false;
}

function randomClient() {
	return clients[Math.floor(Math.random() * clients.length)].id;
}

init();

var wheel = {
	timerHandle: 0,
	currentAngle: 0,
	frameDelay: 30,

	spinUp: 2000,
	spinDown: 17000,
	
  spin: function(variance) {
    if(wheel.timerHandle == 0) {
			wheel.currentAngle = 0;
      wheel.startTime = new Date().getTime();
      wheel.maxSpeed = Math.PI / (8 + variance)
      wheel.timerHandle = setInterval(wheel.tick, wheel.frameDelay);
    }
  },

	tick: function() {
    var time = (new Date().getTime() - wheel.startTime);
    var acceleration = 0;
    var stopped = false;

    if(time < wheel.spinUp) {
      acceleration = time / wheel.spinUp;
      wheel.angleDelta = wheel.maxSpeed * Math.sin(acceleration * PIHALF);
    } else {
      acceleration = time / wheel.spinDown;
      wheel.angleDelta = wheel.maxSpeed * Math.sin(acceleration * PIHALF + PIHALF);
      if(acceleration >= 1)
        stopped = true;
    }

    wheel.currentAngle += wheel.angleDelta;
		socket.sockets.emit("tick", {angle: wheel.currentAngle});

    if(stopped) {
      clearInterval(wheel.timerHandle);
      wheel.timerHandle = 0;
      wheel.angleDelta = 0;
    }
	},
};

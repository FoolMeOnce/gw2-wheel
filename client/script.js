function shuffle(o) { // Simple array shuffle function borrowed from somewhere.
  for ( var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x)
    ;
  return o;
};

var cWidth = $('#canvas').width();
var cHeight = $('#canvas').height();
var PI2 = Math.PI * 2; // Helper vars (Yay radians!)
var PIHALF = Math.PI / 2;

var AUDIO_DIR = "client/audio/";

var socket,
		localClient,
		remoteClients,
		picked;

var disconnected = false;

function initSocket() {
	name = namePrompt();
	localClient = new Client(name);
	socket = io.connect("http://hord.es", {port: 8000, transports: ["websocket"]});
	remoteClients = [];
	setEventHandlers();
}

function namePrompt() {
	var n = prompt("What's your name?");
	if(n == null || n === "") {
		n = "llama"; // No name? LLAMA!
 // Users found this really annoying. To be honest it is, need to find an alternative.
/*
		alert("You suck at names. Try again.");
		n = namePrompt(); // Recursive; keep prompting the user.
*/
	}

	return n;
}

function setEventHandlers() {
  socket.on("connect", onSocketConnect);
  socket.on("disconnect", onSocketDisconnect);
  socket.on("new client", onNewClient);
  socket.on("remove client", onRemoveClient);
	socket.on("tick", onTick);
	socket.on("picked", onPicked);
	socket.on("reload", onReload);
}

function onSocketConnect() {
	if(disconnected) // If we were disconnected, reload client.
		location.reload();
  console.log("Connected to server.");
  socket.emit("new client", {name: localClient.getName()});
	update();
}

function onSocketDisconnect() {
	disconnected = true; // We were disconnected, set flag.
  console.log("Disconnected from server.");
}

function onNewClient(data) {
  var newClient = new Client(data.name);
  newClient.id = data.id;
	newClient.name = data.name;
  remoteClients.push(newClient);
	update();
}

function onRemoveClient(data) {
  var removeClient = clientById(data.id);

  if (!removeClient) {
      console.log("Client not found: "+data.id);
      return;
  }

  remoteClients.splice(remoteClients.indexOf(removeClient), 1);
	update();
}

function requestSpin() {
	socket.emit("spin");
}

function requestPick() {
	password = prompt("What's the password?");
	socket.emit("pick", {password: password});
}

function requestOverride() {
	password = prompt("What's the password?");
	socket.emit("override", {password: password});
}

function onPicked(data) {
	picked = data.picked;
	update();
}

function onReload() {
	location.reload();
}

function onTick(data) {
	wheel.currentAngle = data.angle;
	wheel.tick();
}

function update() {
	$('#status').empty();
	var content;
	if(picked ==  undefined) {
		content = "No one has been picked - the wheel is locked.";
	} else {
		content = picked+" has been selected by the gods. Spin the wheel!";
	}
	$('#status').append(content);

	$('#users').empty();
	$.each(remoteClients, function(key, value) {
		$('#users').append(value.getName()+", ");
	});
	$('#users').append(localClient.getName());
}

function clientById(id) {
    for (var i = 0; i < remoteClients.length; i++) {
        if (remoteClients[i].id == id)
            return remoteClients[i];
    }
    return false;
}

var wheel = {
  canvas: null,
  
  radius: (cWidth > cHeight ? cHeight : cWidth) * .45,
  currentAngle: 0,
  prevAngle: 0,
  diffAngle: 0,
  
  tickDistance: Math.PI / 4,
  
  timerHandle: 0,
  frameDelay: 10,
  
  startTime: 0,
  spinUp: 2000,
  spinDown: 17000,
  
  clicked: false,
  
  maxSpeed: Math.PI / 12,
  
  centerX: $('#canvas').height() / 2,
  centerY: $('#canvas').height() / 2,
  
  slices: [
    "Jump off a cliff!",
    "Quaggan tonics!",
    "No armor!",
    "Emote spam!",
    "No utility skills!",
    "Run in circles!",
    "Battle cry!",
  ],
  
  colors : [ '#ffff00', '#ffc700', '#ff9100', '#ff6301', '#ff0000', '#c6037e',
             '#713697', '#444ea1', '#2772b2', '#0297ba', '#008e5b', '#8ac819' ],
  
  currentSound: 0,
  sounds: [],
  
  init: function() {
		initSocket();
    wheel.initWheel();
    wheel.initCanvas();
    wheel.initAudio();
    wheel.draw();
  },

  initWheel: function() {
    shuffle(wheel.colors);
  },
  
  initCanvas: function() {
    var canvas = $('#canvas').get(0);
    
    ctx = wheel.canvas = canvas.getContext("2d");
    
    ctx.canvas.width = $('#canvas').width();
    ctx.canvas.height = $('#canvas').height();
    
    canvas.addEventListener("click", requestSpin, false);
  },
  
  initAudio: function() {
    for(var i = 0; i < 6; i++) {
			var filename = AUDIO_DIR+"click"+i+".mp3";
      var sound = new Audio(filename);
      wheel.sounds.push(sound);
    }
  },

  playSound: function() {
    var num = wheel.currentSound;
    if(wheel.currentSound == 5) {
      wheel.currentSound = 0;
    } else {
      wheel.currentSound++;
    }
    wheel.clicked = true;
    var sound = wheel.sounds[num];
    sound.play();
  },

  tick: function() {
    wheel.draw();

		// Play a sound for each time the wheel moves `tickDistance`
		wheel.diffAngle += wheel.currentAngle - wheel.prevAngle;
		if(wheel.diffAngle > wheel.tickDistance) {
			wheel.playSound();
			wheel.diffAngle - wheel.tickDistance;
		}
		wheel.diffAngle %= wheel.tickDistance;
		wheel.prevAngle = wheel.currentAngle;
  },
  
  draw: function() {
    wheel.clear();
    wheel.drawWheel();
    wheel.drawNeedle();
  },
  
  clear: function() {
    var ctx = wheel.canvas;
    ctx.clearRect(0, 0, 1000, 800);
  },
  
  drawWheel: function() {
    var ctx = wheel.canvas;
    
    var centerX = wheel.centerX;
    var centerY = wheel.centerY;
    var radius = wheel.radius;
        
    var slices = wheel.slices;
    var len = slices.length;
    
    var currentAngle = wheel.currentAngle;
    var lastAngle = wheel.currentAngle;
        
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = "1.4em Arial";
    
    for(var i = 1; i <= len; i++) {
      var angle = PI2 * (i / len) + currentAngle;
      wheel.drawSlice(i - 1, lastAngle, angle);
      lastAngle = angle;
    }
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, PI2, false);
    ctx.closePath();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#000000';
    ctx.stroke();
  },
  
  drawSlice: function(key, lastAngle, angle) {
    var ctx = wheel.canvas;
    var centerX = wheel.centerX;
    var centerY = wheel.centerY;
    var radius = wheel.radius;
    
    var slices = wheel.slices;
    var len = slices.length;
    var colors = wheel.colors;
    
    var value = slices[key];
    
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, lastAngle, angle, false);
    ctx.lineTo(centerX, centerY);
    
    ctx.closePath();
    ctx.fillStyle = colors[key];
    ctx.fill();
    ctx.stroke();
    
    ctx.save();
    
    ctx.translate(centerX, centerY);
    ctx.rotate((lastAngle + angle) / 2);
    
    ctx.fillStyle = '#000000';
    ctx.font = (radius / 12)+'px sans-serif';
    ctx.fillText(value, radius / 2, 0);
    
    ctx.restore();
  },
  
  drawNeedle: function() {
    var ctx = wheel.canvas;
    var centerX = wheel.centerX;
    var centerY = wheel.centerY;
    var radius = wheel.radius;
    
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#ffffff';
    
    ctx.beginPath();
    
    
    ctx.save();
    ctx.translate(centerX + (radius * 1.1), centerY);
    ctx.save();
    
    if(wheel.clicked) {
      ctx.rotate(Math.PI / -8);
      wheel.clicked = false;
    }
        
    ctx.moveTo(radius / -7, 0);
    ctx.lineTo(radius / 14, radius / -28);
    ctx.lineTo(radius / 14, radius / 28);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    
    ctx.restore();
    
    var len = wheel.slices.length;
    var i = len - Math.floor(((wheel.currentAngle % PI2) / (PI2)) * len) - 1;
    ctx.textAlign = "left";
		ctx.textBaseline = "middle";
    ctx.fillStyle = '#000000';
    ctx.fillText(wheel.slices[i], radius / 8, 0);
    
    ctx.restore();
  },
};

$(document).ready(function() {
    wheel.init();
});

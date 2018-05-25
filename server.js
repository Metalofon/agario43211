var WS = new require("ws");
var HTTP = new require("http");
var FS = new require('fs');
 
const HTML = FS.readFileSync('agario.html', 'utf8');

HTTP.createServer(function (req, res) {
	res.writeHead(200, {"Content-Type": "text/html"});
	res.end(HTML);
}).listen(1530, function () {console.log("Server started!")});

var Server = new WS.Server({
	port: 1540
});

const WIDTH = 640, HEIGHT = 480, STARTSIZE = 10, STARTSPEED = 150;

var Users = {};
var Objects = [];

function randint(min, max) {
    return Math.round(min - 0.5 + Math.random() * (max - min + 1));
}

function genUserID () {
	var id = randint(100000000, 999999999)
	if (Users[id]) {
		return genUserID();
	}
	return id;
}

function intersect (a, b) {
  return a.x - a.s/2 < b.x + b.s/2 && a.x + a.s/2 > b.x - b.s/2 && a.y - a.s/2 < b.y + b.s/2 && a.y + a.s/2 > b.y - b.s/2;
}

for (var o = 0; o < 50; o++) {
	Objects.push({x: randint(10, 630), y: randint(10, 470), s: 5});
}

Server.on("connection", function (serv) {
	var ID = genUserID();
	Users[ID] = {id: ID, x: randint(10, 630), y: randint(10, 470), s: STARTSIZE, v: STARTSPEED};

	serv.on("close", function () {
		delete Users[ID];
	});

	var lu = Date.now();
	serv.on("message", function (msg) {
		var now = Date.now();
		var dt = (now - lu) / 1000;
		lu = now;
		var Msg = JSON.parse(msg.toString());
		if (Msg.need == "move") {
			if (Msg.data.move["left"]) {
				Users[ID].x -= Users[ID].v * dt;
			}
			if (Msg.data.move["right"]) {
				Users[ID].x += Users[ID].v * dt;
			}
			if (Msg.data.move["up"]) {
				Users[ID].y -= Users[ID].v * dt;
			}
			if (Msg.data.move["down"]) {
				Users[ID].y += Users[ID].v * dt;
			}
			if (Users[ID].x < 10) {
				Users[ID].x += Users[ID].v * dt;
			}
			if (Users[ID].x > WIDTH - 10) {
				Users[ID].x -= Users[ID].v * dt;
			}
			if (Users[ID].y < 10) {
				Users[ID].y += Users[ID].v * dt;
			}
			if (Users[ID].y > HEIGHT - 10) {
				Users[ID].y -= Users[ID].v * dt;
			}
			for (var obj in Objects) {
				if (intersect(Users[ID], Objects[obj])) {
					if (Users[ID].s < 100) {
						Users[ID].s = +Users[ID].s + 2;
					} else {
						Users[ID].s = 100;
					}
					if (Users[ID].v > 15) {
						Users[ID].v = +Users[ID].v - 3;
					} else {
						Users[ID].v = 15;
					}
					Objects.splice(obj, 1)
					Objects.push({x: randint(10, 630), y: randint(10, 470), s: 5});
					break;
				}
			}
			for (var user in Users) {
				if (user != ID) {
					if (intersect(Users[ID], Users[user])) {
						if (Users[ID].s > Users[user].s) {
							if (Users[ID].s < 100) {
								Users[ID].s = +Users[ID].s + 5;
							} else {
								Users[ID].s = 100;
							}
							if (Users[ID].v > 15) {
								Users[ID].v = +Users[ID].v - 3;
							} else {
								Users[ID].v = 15;
							}
							Users[user] = {id: user, x: randint(10, 630), y: randint(10, 470), s: STARTSIZE, v: STARTSPEED};
							break;
						}
					}
				}
			}
		}

	})

	var a = setInterval(function () {
		try {
			serv.send(JSON.stringify({need: "draw", data: {users: Users, objects: Objects}}));
		} catch (e) {
			clearInterval(a);
		}
		
	}, 1000/60)
});
var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require('socket.io')(server);
var mysql = require('mysql');
var waitPort = require('wait-port');
var con;

// MYSQL database connection ------------------------
const params = {
  host: 'mysql3',
  port: 3306,
};

waitPort(params)
  .then((open) => {
    if (open) {
    	console.log('The port is now open!');
    	ConnectDB();
    	}
    else console.log('The port did not open before the timeout...');
  })
  .catch((err) => {
    console.log(`An unknown error occured while waiting for the port: ${err}`);
  });


function ConnectDB() {
	con = mysql.createConnection({
		//************************************************ */ Probably "0.0.0.0'
		host: "mysql3",
		user: "nodeChat",
		password: "123",
		database: "db_node",
		port: 3306
	});
	getLastMessageID();
}
// Express websockets ------------------------------
//************************************************ */ Remember to put port 80!
const _port = 8080;
const _app_folder = 'application';


server.listen(_port, function () {
});

// ---- SERVE STATIC FILES ---- //
app.get('*.*', express.static(_app_folder, {maxAge: '2y'}));

// ---- SERVE APLICATION PATHS ---- //
app.all('*', function (req, res) {
    res.status(200).sendFile(`/`, {root: _app_folder});
});



// ---- Sockets and stuff ----

var usernum = 0;
var users = []; // 2d array consisting of socket.id + ID number + name
var qttusers = 0;
var msg_id = 0;
var time = new Date();
var day = time.getDay();
var month = time.getMonth();

captchaAnswers = [
	35,
	97,
	2,
	9
]

function getLastMessageID() {
	con.query("select max(msg_id) as max from message", function (err, result) {
		if (err) {throw err;}
		else {msg_id = result[0].max + 1;}
	});
}

function checkDayChange() {
	// Displays a message if the day has changed since last message
	
	time = new Date();
	if (time.getDay() != day || time.getMonth() != month) {
		
		
		var msg = "  -- " + day + " / " + month +" --  ";

		io.to('theroom').emit('emitmsg',msg,"Server");
		con.query("insert into message (message, user_name, msg_id) values ("+con.escape(msg)+",'Server',"+msg_id+")", function (err, result) {
			if (err) throw err;
		});

		msg_id++;
		
		day = time.getDay(); month = time.getMonth();
	}
	
}

function updateList() {
	
	// Update everyone's users list.

	io.to('theroom').emit('updateList',users,qttusers);
}

function getTimeStamp() {
	
	var hour;
	var min;
	
	if (time.getHours() < 10) hour = "0"+time.getHours();
	else hour = time.getHours();
	if (time.getMinutes() < 10) min = "0"+time.getMinutes();
	else min = time.getMinutes();
	
	txt = hour +":"+ min;
	return txt;
}

io.on('connect', socket => {
	// Put all users in one room
	socket.join('theroom');
	
	// New user has entered. Give him an ID number and update list of users. Also give last 10 lines
	// By using socket.emit and not io.to(room), the event is only sent to the connecting user
	socket.on('newConnect', (numUser, name) => {
		
		var lastlines;
		
		con.query("select * from message order by msg_id desc limit 10", function (err, res) {
			if (err) throw err;
			lastlines = res;
			
			if (numUser != -1) {
				// User was already connected, refreshing list
				name = name.replace('<','');
				users[qttusers] = [socket.id,numUser,name];
				
				// usernum = -1 because we're not resetting it, just the chat
				socket.emit('newUser',-1,lastlines);
			}
			else {
				// New user, give ID
				users[qttusers] = [socket.id,usernum,""];
				
				// Send last 10 chat lines
				socket.emit('newUser',usernum,lastlines);
				
				// Also give a captcha to complete
				socket.emit('newCaptcha',Math.floor(Math.random() * (captchaAnswers.length)));
				usernum++;
			}

			qttusers++;
			updateList();
		});
		
	});


	// verify captcha
	socket.on('sendCaptcha', (msg, capNum, name) => {
		if (msg != captchaAnswers[capNum]) 
			socket.emit('wrongcaptcha',"Captcha was wrong");
		else
		if (name.length > 20) 
			socket.emit('wrongcaptcha',"Name is too long, max 20 characters");
		else
		if (name == "Server" || name == "Admin" || name == "server" || name == "admin")
			socket.emit('wrongcaptcha',"Choose a different name");
		else {
			name.replace('<','');
			socket.emit('receiveCap',name);
			var num;

			for (i=0; i<users.length; i++) {
				if (users[i][0] == socket.id) {
					users[i][2] = name;
					num = users[i][1];
				}
			}
			
			
			checkDayChange();
			
			var timestamp = getTimeStamp();
			var msg = "("+timestamp+") Server: User #" + num + " " + name +" has joined.";

			io.to('theroom').emit('emitmsg',msg);
			con.query("insert into message (message, user_name, timest, msg_id) values ("+con.escape(msg)+",'Server','"+timestamp+"',"+msg_id+")", function (err, result) 						{
				if (err) throw err;
			});

			msg_id++;
			
			updateList();
		}
	});

	

	// send chat message to everyone
	socket.on('sendMsg', (msg, user) => {
		if (msg.length >300) return;
		
		checkDayChange();
		
		var timestamp = getTimeStamp()		
		
		msg = "("+timestamp+") "+user+": "+msg;
		
		con.query("insert into message (message, user_name, timest, msg_id) values ("+con.escape(msg)+","+con.escape(user)+",'"+timestamp+"',"+msg_id+")", function (err, result) {
			if (err) throw err;
		});
		io.to('theroom').emit('emitmsg',msg);
		
		msg_id++;
	});

	// user has disconnected, remove from other users' list
	socket.on('disconnect', () => {
		
		var newusers = [];
		
		for (i = 0; i < users.length; i++) {
			if (users[i] == null) continue;
			if (socket.id != users[i][0]) newusers.push(users[i]);
			else {
				if (users[i][2] != "") {
					
					checkDayChange();
					
					var timestamp = getTimeStamp();
					var msg = "("+timestamp+") Server: User #"+users[i][1] + " " + users[i][2] +" has left.";
					
					io.to('theroom').emit('emitmsg',msg,"Server",timestamp);
					con.query("insert into message (message, user_name, timest, msg_id) values ("+con.escape(msg)+",'Server','"+timestamp+"',"+msg_id+")", function (err, result) 						{
						if (err) throw err;
					});
					
					msg_id++;
				}
			}

		}
		
		users = newusers;
		qttusers--;
		updateList();
	});
	
	  
});


/*

use db_node;

CREATE TABLE message (message varchar(300), user_name varchar(20), timest time, msg_id int, primary key (user_name, msg_id) );

docker run -d \
    --network chat-app --network-alias mysql2 \
    --name mysql3
    -v chat-mysql-data:/var/lib/mysql \
    -e MYSQL_ROOT_PASSWORD=1234 \
    -e MYSQL_DATABASE=db_node \
    mysql:5.7
    
docker run --network=chat-app -p 8080:8080 --name=chat node2

CREATE USER 'node'@'%' IDENTIFIED BY '1234';
GRANT ALL ON *.* TO 'node'@'%';


*/

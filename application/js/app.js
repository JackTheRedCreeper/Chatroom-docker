const socket = io(); //, {transports: ['websocket']}
const chatbox = document.getElementById("messages");
const userslist = document.getElementById("users");
const text = document.getElementById("txt");
const namefl = document.getElementById("namefl");
const lbl = document.getElementById("lbl");
var name = "";
var usernum = -1;
var verif = false;
var datelastmsg = new Date();
var lastmsg = "";
var num;


function sendMessage() {
	
	var now = new Date();
	// Send message
	if (text.value != "" && (now - datelastmsg > 2000) && verif) {
		if (lastmsg != text.value) {
			socket.emit("sendMsg", text.value, name);
			lastmsg = text.value;
			datelastmsg = now;
			text.value = "";
		}
	}
	return false;
}


function sendCaptcha() {
	// Sends captcha. If ok, will enable the chat
	if (lbl.value != "" && namefl.value != "") {
		socket.emit("sendCaptcha", lbl.value, num, namefl.value);
	}
	return false;
}


socket.on('connect', () => {
	if (verif)
		socket.emit("newConnect", usernum, namefl.value);
	else
		socket.emit("newConnect", -1, "");
})

socket.on('receiveCap', (nameclean) => {
	//Enable chat
	text.disabled = false;
	document.getElementById("txtbtt").disabled = false;
	
	//Disable name field, but keep it
	namefl.disabled = true;
	lbl.disabled = true;
	//Disable captcha
	lbl.style.display = "none";
	document.getElementById("lblbtt").disabled = true;
	document.getElementById("lblbtt").style.display = "none";
	document.getElementById("qst").style.display = "none";
	
	name = "#"+usernum +" "+ nameclean;
	verif = true;
});


socket.on('newCaptcha', (nnum) => {
	list = [
		"What is 5 by 7?",
		"How much is 100 - 3?",
		"What's -3 plus five?",
		"What is 3 squared?"
	]
		
	num = nnum;
	
	document.getElementById("qst").innerText = list[nnum];
});

// New user has connected. Receiving ID number and latest 10 lines
socket.on('newUser', (newUserNum, lastlines) => {
	
	// Ignore new number if we already connected before
	if (newUserNum != -1) {
		usernum = newUserNum;
	}
	
	// Clear chatbox
	while (messages.children.length > 0) {
		messages.childNodes[0].remove()
	}
	
	// Show last 10 lines
	if (lastlines != null) { 
		for (i=lastlines.length-1; i >= 0; i--) {
			var text = lastlines[i].message;
			var li=document.createElement("li");
			li.appendChild(document.createTextNode(text));
			chatbox.appendChild(li);
		}
	}
});

socket.on('updateList', (users, qttusers) => {
	
	// Add user to the users list
	while (userslist.childElementCount > 0) {
		userslist.childNodes[0].remove();
	}
	
	for (i=0; i < qttusers; i++) {
		if (users[i] == null) continue;
		if (users[i][2] == "") continue;
		
		var li=document.createElement("li");
		li.appendChild(document.createTextNode("#"+users[i][1]+": "+users[i][2]));
		userslist.appendChild(li);
	}
	
});

socket.on('emitmsg', (data) => {
	// Add message to chat box
	var li=document.createElement("li");
	li.appendChild(document.createTextNode(data));
	chatbox.appendChild(li);
});

socket.on('wrongcaptcha', (error) => {
	alert(error);
})
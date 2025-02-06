const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = createServer(app);
const io = new Server(server, {
	cors:{
		origin:"*",
		methods:["GET", "POST"],
	},
});

let users = {};

app.get("/", (req, res) => {
	res.send("<h1>WebSocket Server is Running...</h1>");
});

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("joinGroup", (group) => {
        socket.join(group);
        if(!users[group]) users[group]=[];
        users[group].push(socket.id);

        io.to(group).emit("userCount", users[group].length);
    });
	
	socket.on("leaveGroup", (group) => {
		for(const group in users){
			users[group] = users[group].filter((id) => id !== socket.id);
			io.to(group).emit("userCount", users[group].length);
		}
		socket.leaveAll();
	});

    socket.on("sendMessage", (data) => {
        io.to(data.group).emit("receiveMessage", {
            sender:data.sender,
            text:data.text,
            id:socket.id,
            timestamp:new Date().toLocaleTimeString(),
        });
    });

    socket.on("sendReaction", ({ group, messageIndex, reaction }) => {
        io.to(group).emit("receiveReaction", { messageIndex, reaction });
    });

    socket.on("typing", (group) => {
        socket.broadcast.to(group).emit("userTyping", true, socket.id);
    });

    socket.on("stopTyping", (group) => {
        socket.broadcast.to(group).emit("userTyping", false);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        Object.keys(users).forEach((group) => {

            users[group] = users[group].filter((id) => id !== socket.id);
            io.to(group).emit("UserCount", users[group].length);
        });
    });
});


const PORT = process.env.PORT||5000;
server.listen(PORT, () => console.log("WebSocket Server is running on PORT", PORT));

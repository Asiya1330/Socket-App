const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");

const createAdapter = require("@socket.io/redis-adapter").createAdapter;
const redis = require("redis");
require("dotenv").config();

const { createClient } = redis;

const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

const botName = "ChatCord Bot";

(async () => {
  pubClient = createClient({ url: "redis://127.0.0.1:6379" });
  await pubClient.connect();
  subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
})();

// Run when client connects
io.on("connection", (socket) => {
  console.log(io.of("/").adapter);

  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room); //push new user to users array.

    socket.join(user.room);

    socket.emit('message', formatMessage(botName, 'Welcome to chat bot')); //single client/ user joined

    socket.broadcast.to(user.room).emit('message', formatMessage(botName, `${username} has joined ${room}`)) // all client except that joined ,  for rest of the users.

    //emit room and roomUsers info.
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    })
  })

  //chat message emit on form submit click
  socket.on('chatMessage', (event) => {
    // const user = getCurrentUser(socket.id);
    // console.log(user);
    io.to(event.room).emit('message', formatMessage(event.username, event.msg));
  })

  //welcome current user

  // io.emit('message',"") //all the clients in general

  //when client disconnect
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);
    if (user) {
      io.to(user.room).emit('message', formatMessage(botName, `${user.username} has left the chat`));

      //emit room and roomUsers info.
      io.to(user.room).emit('roomUser', {
        room: user.room,
        users: getRoomUsers(user.room)
      })
    }
  })


});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


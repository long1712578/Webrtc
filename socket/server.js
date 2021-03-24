var express=require('express');
var cors=require('cors');

const app = express();
app.use(cors());
const port = process.env.port || 3000;

app.get('/', (req, res) => {
  res.send({ message: 'Welcome to server!' });
});

const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/`);
});

const socketOptions = {
  cors: true,
  origin: '*'
};

// Create Socket IO
const io = require('socket.io')(server, socketOptions);

const users = {};

io.on('connection', (socket) => {
  if (!users[socket.id]) {
    users[socket.id] = socket.id;
    console.log('connection', socket.id);
  }

  socket.emit('myId', socket.id);

  io.sockets.emit('allUsers', users);

  socket.on('disconnect', () => {
    console.log('disconnection', socket.id);
    delete users[socket.id];
  });

  socket.on('video-call', (data) => {
    io.to(data.userToCall).emit('video-call', {
      signal: data.signalData,
      from: data.from,
    });
  });

  socket.on('video-call-accept', (data) => {
    io.to(data.to).emit('video-call-accept', data.signal);
  });
});

server.on('error', console.error);
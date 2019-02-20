const express = require("express");
const app = express();
const http = require('http').Server(app)
const io = require('socket.io')(http)
const port = process.env.PORT || 3000

const querystring = require("querystring");
const dburl = process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost/' + port
const mongoose = require('mongoose')
mongoose.connect("mongodb://reessm01:MWB2Pgt40OvnUuKB@cluster0-shard-00-00-ureij.mongodb.net:27017,cluster0-shard-00-01-ureij.mongodb.net:27017,cluster0-shard-00-02-ureij.mongodb.net:27017/test?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true", { useNewUrlParser: true })
//"mongodb://reessm01:MWB2Pgt40OvnUuKB@cluster0-shard-00-00-ureij.mongodb.net:27017,cluster0-shard-00-01-ureij.mongodb.net:27017,cluster0-shard-00-02-ureij.mongodb.net:27017/test?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true", { useNewUrlParser: true }
const db = mongoose.connection
const Schema = mongoose.Schema
const MongoClient = require('mongodb').MongoClient

// List of all messages

let users = {};
// usersSimple

app.use(express.static("./public"));
app.use(express.json());

// generic comparison function for case-insensitive alphabetic sorting on the name field
function userSortFn(a, b) {
  var nameA = a.name.toUpperCase(); // ignore upper and lowercase
  var nameB = b.name.toUpperCase(); // ignore upper and lowercase
  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }

  // names must be equal
  return 0;
}

let messages
db.on('error', console.error.bind(console, 'connection error'))

console.log("Connected to mongod")

const klackSchema = new Schema({
  sender: String,
  message: String,
  timestamp: Number
})
const klackModel = mongoose.model('klack', klackSchema)

klackModel.find(function (err, entries) {
  messages = entries
})

http.listen(3000, () => console.log('Listening on ' + port))

// app.get('/', function (req, res) {
//   res.sendFile('./public' + '/index.html');
// });

io.on('connection', (socket) => {
  console.log('A user connected.')
  socket.on('disconnect', () => {
    console.log('User disconnected.')
  })
  socket.on('initMessages', (data, fn) => {
    // get the current time
    const now = Date.now();

    // consider users active if they have connected (GET or POST) in last 15 seconds
    const requireActiveSince = now - 15 * 1000;

    // update the requesting user's last access time
    users[data.user] = now;

    // create a new list of users with a flag indicating whether they have been active recently
    usersSimple = Object.keys(users).map(x => ({
      name: x,
      active: users[x] > requireActiveSince
    }));

    // sort the list of users alphabetically by name
    usersSimple.sort(userSortFn);
    usersSimple.filter(a => a.name !== data.name);

    console.log(usersSimple)

    // send the latest 40 messages and the full user list, annotated with active flags
    fn({ messages: messages.slice(-40), users: usersSimple });

  })
  socket.on('chat message', function (msg, fn) {
    // add a timestamp to each incoming message.
    const timestamp = Date.now();
    msg.timestamp = timestamp;

    // append the new message to the message list
    messages.push(msg);

    // update the posting user's last access timestamp (so we know they are active)
    users[msg.sender] = timestamp;

    let klackMessage = new klackModel(msg)
    klackMessage.save(function (err) {
      if (err) return console.error(err)
      // Send back the successful response.
      msg.status = 201
      fn(msg)
      io.emit('newMessage', msg)
    })
  })
});
// app.listen(port);
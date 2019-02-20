const userList = document.getElementById("users");
const messagesDiv = document.getElementById("messageslist");
const textarea = document.getElementById("newmessage");
const ding = new Audio("typewriter_ding.m4a");
const socket = io();

// this will be the list of all messages displayed on the client
let messages = [{ timestamp: 0 }];

let name = window.prompt("Enter your name");
// if they didn't type anything at the prompt, make up a random name
if (name.length === 0) name = "Anon-" + Math.floor(Math.random() * 1000);

// add the sender and text of one new message to the bottom of the message list
function appendMessage(msg) {
  messages.push(msg);
  messagesDiv.innerHTML += `<div class="message"><strong>${
    msg.sender
    }</strong><br>${msg.message}</div>`;
}

// redraw the entire list of users, indicating active/inactive
function listUsers(users) {
  console.log(users)
  let userStrings = users.map(
    user =>
      user.active
        ? `<span class="active"><span class="cyan">&#9679;</span> ${
        user.name
        }</span>`
        : `<span class="inactive">&#9675; ${user.name}</span>`
  );
  userList.innerHTML = userStrings.join("<br>");
}

// true if the messages div is already scrolled down to the latest message
function scrolledToBottom() {
  return messagesDiv.scrollTop + 600 >= messagesDiv.scrollHeight;
}

// force the messages div to scroll to the latest message
function scrollMessages() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

fetchUsers()

socket.on('newMessage', data => {
  appendMessage(data)
  scrollMessages()
  console.log(data)
})

function fetchUsers() {
  socket.emit('initMessages', { user: name }, (data => {
    // if already scrolled to bottom, do so again after adding messages
    const shouldScroll = scrolledToBottom();
    var shouldDing = false;

    // redraw the user list
    console.log(data)
    listUsers(data.users);

    // examine all received messages, add those newer than the last one shown
    for (let i = 0; i < data.messages.length; i++) {
      let msg = data.messages[i];
      if (msg.timestamp > messages[messages.length - 1].timestamp) {
        appendMessage(msg);
        shouldDing = true;
      }
    }
    if (shouldScroll && shouldDing) scrollMessages();
    if (shouldDing) ding.play();
  }))

  // poll again after waiting 5 seconds
  setTimeout(fetchUsers, 5000);
}

document.getElementById("newmessage").addEventListener("keypress", event => {
  // if the key pressed was enter (and not shift enter), post the message.
  if (event.keyCode === 13 && !event.shiftKey) {
    textarea.disabled = true;
    socket.emit('chat message', { sender: name, message: textarea.value }, (data) => {
      if (data.status === 201) {
        // reset the textarea
        textarea.value = "";
        textarea.disabled = false;
        textarea.focus();
      }
    })
  }
});

// call on startup to populate the messages and start the polling loop
// fetchMessages();
const express = require("express");
const app = express();
const http = require("http").Server(app);
const cors = require("cors");

const socketIO = require("socket.io")(http, {
  cors: {
    origin: "http://localhost:19006",
  },
});

const PORT = 4000;

const { v4: uuidv4 } = require("uuid");

function createUniqueId() {
  return uuidv4();
}

let chats = [];

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.get("/get-chats", (req, res) => {
  res.json(chats);
});

app.post("/create-chat", (req, res) => {
  const { uid, chatTitle } = req.body;
  const newChat = {
    id: createUniqueId(),
    title: chatTitle,
    creatorID: uid,
    messages: [],
  };
  chats.push(newChat);

  socketIO.emit("newChat", newChat);

  res.json(newChat);
});

app.put("/update-chat/:id", (req, res) => {
  const { id } = req.params;
  const { updatedChatTitle } = req.body;

  const chatToUpdate = chats.find((chat) => chat.id === id);

  if (!chatToUpdate) {
    return res.status(404).json({ error: "Chat not found" });
  }

  chatToUpdate.title = updatedChatTitle;

  socketIO.emit("updateChat", chatToUpdate);

  res.json(chatToUpdate);
});

app.delete("/delete-chat/:id", (req, res) => {
  const { id } = req.params;

  const chatIndex = chats.findIndex((chat) => chat.id === id);

  if (chatIndex === -1) {
    return res.status(404).json({ error: "Chat not found" });
  }

  const deletedChat = chats.splice(chatIndex, 1)[0];

  socketIO.emit("deleteChat", deletedChat);

  res.json(deletedChat);
});

socketIO.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("newChat", (chatTitle) => {
    console.log(chatTitle);
  });

  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.id} joined room ${chatId}`);
  });

  socket.on("findGroup", (id) => {
    const filteredGroup = chats.filter((item) => item.id === id);
    socket.emit("foundGroup", filteredGroup[0].messages);
  });

  socket.on("newChatMessage", (data) => {
    const { currentChatMessage, groupIdentifier, currentUser, timeData } = data;
    const filteredGroup = chats.filter((item) => item.id === groupIdentifier);
    const newMessage = {
      id: createUniqueId(),
      text: currentChatMessage,
      currentUser,
      time: `${timeData.hr}:${timeData.mins}`,
    };

    filteredGroup[0].messages.push(newMessage);

    socketIO.to(groupIdentifier).emit("foundGroup", filteredGroup[0].messages);
    socket.emit("groupList", chats);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

http.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

const express = require("express");
const route = express.Router();

const checkAccessWithKey = require("../../checkAccess");

const ChatTopicController = require("./chatTopic.controller");

route.get("/chatList", checkAccessWithKey(), ChatTopicController.getChatList);

route.post("/createRoom", checkAccessWithKey(), ChatTopicController.store);

module.exports = route;

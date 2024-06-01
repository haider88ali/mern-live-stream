const ChatTopic = require("./chatTopic.model");
const User = require("../user/user.model");
const Setting = require("../setting/setting.model");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const arrayShuffle = require("shuffle-array");
const timezone = require("dayjs/plugin/timezone");
const mongoose = require("mongoose");

dayjs.extend(utc); // Extend dayjs with utc plugin
dayjs.extend(timezone);

exports.store = async (req, res) => {
  try {
    if (!req.body.senderUserId || !req.body.receiverUserId)
      return res
        .status(200)
        .json({ status: false, message: "Invalid Details!" });

    const [senderUser, receiverUser, chatTopic] = await Promise.all([
      User.findById(req.body.senderUserId),
      User.findById(req.body.receiverUserId),
      ChatTopic.findOne({
        $or: [
          {
            $and: [
              { senderUser: req.body.senderUserId },
              { receiverUser: req.body.receiverUserId },
            ],
          },
          {
            $and: [
              { receiverUser: req.body.senderUserId },
              { senderUser: req.body.receiverUserId },
            ],
          },
        ],
      }),
    ]);

    if (!senderUser)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });
    if (!receiverUser)
      return res
        .status(200)
        .json({ status: false, message: "User dose not Exist!" });

    if (chatTopic) {
      return res
        .status(200)
        .json({ status: true, message: "Success!!", chatTopic: chatTopic });
    }

    const newChatTopic = new ChatTopic();
    newChatTopic.senderUser = senderUser._id;
    newChatTopic.receiverUser = receiverUser._id;
    await newChatTopic.save();

    return res
      .status(200)
      .json({ status: true, message: "Success!!", chatTopic: newChatTopic });
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error !",
    });
  }
};

exports.getChatList = async (req, res) => {
  try {
    const start = req.query.start ? parseInt(req.query.start) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    const [user, list, fakeData, setting] = await Promise.all([
      User.findById(req.query?.userId),
      ChatTopic.aggregate([
        {
          $match: {
            $or: [
              { senderUser: new mongoose.Types.ObjectId(req.query.userId) },
              { receiverUser: new mongoose.Types.ObjectId(req.query.userId) },
            ],
          },
        },
        {
          $lookup: {
            from: "users",
            as: "user",
            let: {
              receiverUserIds: "$receiverUser",
              senderUserIds: "$senderUser",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $cond: {
                      if: {
                        $eq: [
                          "$$senderUserIds",
                          new mongoose.Types.ObjectId(req.query.userId),
                        ],
                      },
                      then: { $eq: ["$$receiverUserIds", "$_id"] },
                      else: { $eq: ["$$senderUserIds", "$_id"] },
                    },
                  },
                },
              },
              {
                $project: {
                  name: 1,
                  username: 1,
                  image: 1,
                  country: 1,
                  isVIP: 1,
                  isFake: 1,
                },
              },
            ],
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: "chats",
            localField: "chat",
            foreignField: "_id",
            as: "chat",
          },
        },
        {
          $unwind: {
            path: "$chat",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: {
            _id: 0,
            topic: "$_id",
            message: "$chat.message",
            date: "$chat.date",
            createdAt: "$chat.createdAt",
            userId: "$user._id",
            name: "$user.name",
            username: "$user.username",
            image: "$user.image",
            country: "$user.country",
            isVIP: "$user.isVIP",
            isFake: "$user.isFake",
          },
        },
        {
          $addFields: {
            isFake: false,
          },
        },
        { $sort: { createdAt: -1 } },
      ]),
      User.find({ isFake: true }),
      Setting.findOne({}).sort({ createdAt: -1 }),
    ]);
    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });
    }

    const paginatedList = await list?.slice(start, start + limit);

    let now = dayjs();

    const chatList = paginatedList.map((data) => ({
      ...data,
      time:
        now.diff(data.createdAt, "minute") === 0
          ? "Just Now"
          : now.diff(data.createdAt, "minute") <= 60 &&
            now.diff(data.createdAt, "minute") >= 0
          ? now.diff(data.createdAt, "minute") + " minutes ago"
          : now.diff(data.createdAt, "hour") >= 24
          ? dayjs(data.createdAt).format("DD MMM, YYYY")
          : now.diff(data.createdAt, "hour") + " hour ago",
    }));

    if (!setting?.isFake) {
      console.log("real");

      return res.status(200).json({
        status: true,
        message: "Success",
        chatList: chatList,
      });
    } else {
      const fakeUser = await arrayShuffle(fakeData);
      const fakeStart = start - paginatedList.length;
      const fakeLimit = Math.min(limit, fakeUser.length - fakeStart + 1);

      const fakeChatList = fakeUser
        .slice(fakeStart, fakeStart + fakeLimit)
        .map((element) => ({
          topic: null,
          message: "hello !",
          date: null,
          chatDate: null,
          userId: element._id,
          name: element.name,
          username: element.username,
          image: element.image,
          country: element.country,
          isVIP: element.isVIP,
          link: element.link,
          time: "Just now",
          isFake: true,
        }));
      console.log("................", fakeChatList);
      return res.status(200).json({
        status: true,
        message: "Success",
        chatList: [...chatList, ...fakeChatList],
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

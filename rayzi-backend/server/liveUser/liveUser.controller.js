const LiveUser = require("./liveUser.model");
const User = require("../user/user.model");
const Setting = require("../setting/setting.model");
const Follower = require("../follower/follower.model");
const LiveStreamingHistory = require("../liveStreamingHistory/liveStreamingHistory.model");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

//FCM node
var FCM = require("fcm-node");
var config = require("../../config");
var fcm = new FCM(config.SERVER_KEY);

// Agora token Builder
exports.generateToken = async (req, res) => {
  try {
    if (!req.body.channelName) {
      return res
        .status(200)
        .json({ status: false, message: "Invalid Details !" });
    }
    const setting = await Setting.findOne({});
    if (!setting)
      return res
        .status(200)
        .json({ status: false, message: "Setting Not Found" });

    const role = RtcRole.PUBLISHER;
    const account = "0";
    const expirationTimeInSeconds = 24 * 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithAccount(
      setting.agoraKey,
      setting.agoraCertificate,
      req.body.channelName,
      account,
      role,
      privilegeExpiredTs
    );

    console.log("Token With UserAccount: " + token);
    return res.status(200).json({ status: true, message: "Success", token });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// live the user
exports.userIsLive = async (req, res) => {
  try {
    if (req.body.userId && req.body.channel) {
      const setting = await Setting.findOne({});
      if (!setting)
        return res
          .status(200)
          .json({ status: false, message: "Setting Not Found" });

      const role = RtcRole.PUBLISHER;
      const uid = req.body.agoraUID ? req.body.agoraUID : 0;
      const expirationTimeInSeconds = 24 * 3600;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

      const createdAt = new Date();
      const expirationDate = new Date(createdAt.getTime() + 15 * 60 * 1000);
      console.log("expirationDate: ", expirationDate);

      let [user, token, liveStreamingHistory, liveUser] = await Promise.all([
        User.findById(req.body.userId),
        RtcTokenBuilder.buildTokenWithUid(
          setting.agoraKey,
          setting.agoraCertificate,
          req.body?.channel,
          uid,
          role,
          privilegeExpiredTs
        ),
        LiveStreamingHistory({
          userId: req.body.userId,
          startTime: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
          }),
          expiration_date: expirationDate,
        }).save(),
        LiveUser.findOne({ liveUserId: req.body.userId }),
      ]);

      user.isOnline = true;
      user.isBusy = true;
      user.token = token;
      user.channel = req.body.channel;
      await user.save();

      const createLiveUser = new LiveUser();

      let LiveUserData;
      if (liveUser) {
        liveUser.background = req.body.background;
        liveUser.isPublic = req.body.isPublic;
        liveUser.liveStreamingId = liveStreamingHistory._id;
        liveUser.agoraUID = req.body.agoraUID;
        liveUser.filter = req?.body?.filter;
        const createdAt = new Date();
        console.log("createdAt in exist: ", createdAt);

        const expirationDate = new Date(createdAt.getTime() + 15 * 60 * 1000);
        console.log("expirationDate in exist: ", expirationDate);

        liveUser.expiration_date = expirationDate;

        LiveUserData = await LiveUserFunction(liveUser, user);
      } else {
        createLiveUser.background = req.body.background;
        createLiveUser.isPublic = req.body.isPublic;
        createLiveUser.liveStreamingId = liveStreamingHistory._id;
        createLiveUser.agoraUID = req.body.agoraUID;
        createLiveUser.filter = req?.body?.filter;
        const createdAt = new Date();
        console.log("createdAt in new: ", createdAt);

        const expirationDate = new Date(createdAt.getTime() + 15 * 60 * 1000);
        console.log("expirationDate in new: ", expirationDate);

        createLiveUser.expiration_date = expirationDate;

        LiveUserData = await LiveUserFunction(createLiveUser, user);
      }

      const followers = await Follower.find({
        toUserId: user._id,
      }).populate({
        path: "fromUserId",
        select: "name fcmToken isBlock notification ",
      });

      for (let i = 0; i < followers.length; i += 1000) {
        const filteredFollowers = followers.filter(
          (data) =>
            data.fromUserId &&
            !data.fromUserId.isBlock &&
            data.fromUserId.notification?.favoriteLive
        );
        const batchHosts = filteredFollowers.slice(i, i + 1000);
        const registrationTokens = batchHosts.map(
          (data) => data.fromUserId.fcmToken
        );
        console.log("data?.fromUserId.name  live:     ", user?.name);
        const payload = {
          registration_ids: registrationTokens,
          notification: {
            title: `${user?.name} is Live`,
          },
          data: {
            data: {
              _id: LiveUserData._id,
              liveUserId: LiveUserData.liveUserId,
              name: LiveUserData.name,
              country: LiveUserData.country,
              image: LiveUserData.image,
              token: LiveUserData.token,
              channel: LiveUserData.channel,
              rCoin: LiveUserData.rCoin,
              diamond: LiveUserData.diamond,
              username: LiveUserData.username,
              isVIP: LiveUserData.isVIP,
              age: LiveUserData.age,
              liveStreamingId: LiveUserData.liveStreamingId,
              view: String(0),
            },
            type: "LIVE",
          },
        };
        await fcm.send(payload, function (err, response) {
          if (err) {
            console.log("Something has gone wrong!", err);
          }
        });
      }

      let matchQuery = {};
      if (liveUser) {
        matchQuery = { $match: { _id: { $eq: liveUser._id } } };
      } else {
        matchQuery = { $match: { _id: { $eq: createLiveUser._id } } };
      }

      const liveUser_ = await LiveUser.aggregate([
        matchQuery,
        { $addFields: { view: { $size: "$view" } } },
      ]);

      return res
        .status(200)
        .json({ status: true, message: "Success!!", liveUser: liveUser_[0] });
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Invalid Details!" });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

const LiveUserFunction = async (user, data) => {
  user.name = data.name;
  user.country = data.country;
  user.image = data.image;
  user.token = data.token;
  user.channel = data.channel;
  user.rCoin = data.rCoin;
  user.diamond = data.diamond;
  user.username = data.username;
  user.isVIP = data.isVIP;
  user.liveUserId = data._id;
  user.countryFlagImage = data.countryFlagImage;
  user.age = data.age;

  await user.save();

  return user;
};

// get live user list
exports.getLiveUser = async (req, res) => {
  try {
    const [user, followers, fakeLiveUser, setting] = await Promise.all([
      User.findOne({ _id: req.query?.userId }),
      Follower.findOne({ toUserId: req.query?.userId }).distinct("fromUserId"),
      User.aggregate([
        {
          $match: {
            isFake: true,
            isBlock: false,
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            country: 1,
            image: 1,
            link: 1,
            channel: 1,
            rCoin: 1,
            diamond: 1,
            username: 1,
            countryFlagImage: 1,
            isVIP: 1,
            age: 1,
            isFake: 1,
          },
        },
        {
          $addFields: {
            agoraUID: null,
            liveStreamingId: null,
            liveUserId: null,
            view: 0,
            token: null,
            seat: [],
            background: null,
            audio: false,
          },
        },
        { $skip: req.query.start ? parseInt(req.query.start) : 0 }, // how many records you want to skip
        { $limit: req.query.limit ? parseInt(req.query.limit) : 20 },
      ]),
      Setting.findOne({}),
    ]);

    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });

    if (req.query.type === "All") {
      const users = await LiveUser.aggregate([
        {
          $match: {
            $and: [
              { $or: [{ isPublic: true }, { liveUserId: { $in: followers } }] },
              {
                liveUserId: { $ne: user._id },
              },
            ],
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $project: {
            _id: 1,
            liveUserId: 1,
            name: 1,
            country: 1,
            image: 1,
            token: 1,
            channel: 1,
            countryFlagImage: 1,
            rCoin: 1,
            diamond: 1,
            seat: 1,
            background: 1,
            audio: 1,
            username: 1,
            isVIP: 1,
            age: 1,
            liveStreamingId: 1,
            agoraUID: 1,
            view: {
              $size: {
                $filter: {
                  input: "$view",
                  as: "item",
                  cond: { $eq: ["$$item.isAdd", true] },
                },
              },
            },
          },
        },
        {
          $addFields: {
            isFake: false,
            link: null,
          },
        },
        { $skip: req.query.start ? parseInt(req.query.start) : 0 }, // how many records you want to skip
        { $limit: req.query.limit ? parseInt(req.query.limit) : 20 },
      ]);

      if (setting?.isFake) {
        console.log("false");

        return res.status(200).json({
          status: true,
          message: "Success!!",
          //users: users[0].user.length > 0 ? users[0].user : [],
          users: [...users, ...fakeLiveUser],
        });
      } else {
        return res.status(200).json({
          status: true,
          message: "Success!!",
          users: users,
        });
      }
    }

    if (req.query.type === "Popular") {
      const users = await LiveUser.aggregate([
        {
          $match: {
            $and: [
              { $or: [{ isPublic: true }, { liveUserId: { $in: followers } }] },
              {
                liveUserId: { $ne: user._id },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "livestreaminghistories",
            let: { liveStreamingId: "$liveStreamingId" },
            as: "liveStreaming",
            pipeline: [
              {
                $match: { $expr: { $eq: ["$$liveStreamingId", "$_id"] } },
              },
            ],
          },
        },
        {
          $unwind: {
            path: "$liveStreaming",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: {
            _id: 1,
            liveUserId: 1,
            name: 1,
            country: 1,
            image: 1,
            token: 1,
            channel: 1,
            seat: 1,
            background: 1,
            countryFlagImage: 1,
            audio: 1,
            rCoin: 1,
            diamond: 1,
            username: 1,
            isVIP: 1,
            age: 1,
            liveStreamingId: "$liveStreaming._id",
            gifts: "$liveStreaming.gifts",
            comments: "$liveStreaming.comments",
            view: { $size: "$view" },
          },
        },
        {
          $addFields: {
            isFake: false,
            link: null,
          },
        },
        {
          $sort: { comments: -1, gifts: -1 },
        },
        { $skip: req.query.start ? parseInt(req.query.start) : 0 }, // how many records you want to skip
        { $limit: req.query.limit ? parseInt(req.query.limit) : 20 },
      ]);

      if (setting?.isFake) {
        console.log("false");

        return res.status(200).json({
          status: true,
          message: "Success!!",
          //users: users[0].user.length > 0 ? users[0].user : [],
          users: [...users, ...fakeLiveUser],
        });
      } else {
        return res.status(200).json({
          status: true,
          message: "Success!!",
          users: users,
        });
      }
    }

    if (req.query.type === "Following") {
      const user = await User.findById(req.query.userId);
      if (!user)
        return res
          .status(200)
          .json({ status: false, message: "User does not Exist!" });

      const users = await LiveUser.aggregate([
        {
          $lookup: {
            from: "followers",
            let: { userId: "$liveUserId" },
            as: "follower",
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$$userId", "$toUserId"] },
                      { $eq: [user._id, "$fromUserId"] },
                    ],
                  },
                },
              },
            ],
          },
        },
        {
          $unwind: {
            path: "$follower",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: {
            _id: 1,
            liveUserId: 1,
            name: 1,
            country: 1,
            image: 1,
            token: 1,
            channel: 1,
            countryFlagImage: 1,
            rCoin: 1,
            seat: 1,
            background: 1,
            audio: 1,
            diamond: 1,
            username: 1,
            isVIP: 1,
            age: 1,
            liveStreamingId: 1,
            view: { $size: "$view" },
          },
        },
        {
          $addFields: {
            isFake: false,
            link: null,
          },
        },
        {
          $sort: { comments: -1, gifts: -1 },
        },
        { $skip: req.query.start ? parseInt(req.query.start) : 0 }, // how many records you want to skip
        { $limit: req.query.limit ? parseInt(req.query.limit) : 20 },
      ]);

      if (setting?.isFake) {
        console.log("false");

        return res.status(200).json({
          status: true,
          message: "Success!!",
          //users: users[0].user.length > 0 ? users[0].user : [],
          users: [...users, ...fakeLiveUser],
        });
      } else {
        return res.status(200).json({
          status: true,
          message: "Success!!",
          users: users,
        });
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
      user: "",
    });
  }
};

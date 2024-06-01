const Follower = require("./follower.model");
const User = require("../user/user.model");
const LiveStreamingHistory = require("../liveStreamingHistory/liveStreamingHistory.model");
const mongoose = require("mongoose");

//FCM node
var FCM = require("fcm-node");
var config = require("../../config");
var fcm = new FCM(config.SERVER_KEY);

// hirenbhai: date:6/1/22 toggle follow unFollow
exports.followUnFollow = async (req, res) => {
  try {
    if (!req.body.fromUserId || !req.body.toUserId)
      return res
        .status(200)
        .json({ status: false, message: "Invalid Details!" });

    const fromUserExist = await User.findById(req.body.fromUserId);

    if (!fromUserExist) {
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });
    }

    const toUserExist = await User.findById(req.body.toUserId);

    if (!toUserExist) {
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });
    }

    const followUser = await Follower.findOne({
      $and: [
        {
          fromUserId: fromUserExist._id,
          toUserId: toUserExist._id,
        },
      ],
    });

    // unFollow
    if (followUser) {
      await followUser.deleteOne();
      console.log("unFollowed Done ");
      res.status(200).send({
        status: true,
        message: "User unFollowed successfully!!",
        isFollow: false,
      });

      const [] = await Promise.all([
        User.updateOne(
          { _id: fromUserExist._id, following: { $gt: 0 } },
          { $inc: { following: -1 } }
        ),
        User.updateOne(
          { _id: toUserExist._id, followers: { $gt: 0 } },
          { $inc: { followers: -1 } }
        ),
      ]);
    } else {
      const [] = await Promise.all([
        Follower({
          fromUserId: fromUserExist._id,
          toUserId: toUserExist._id,
        }).save(),
        LiveStreamingHistory.updateOne(
          { _id: req.body?.liveStreamingId },
          {
            $inc: { fans: 1 },
          }
        ),
      ]);

      res.status(200).send({
        status: true,
        message: "User followed successfully!!",
        isFollow: true,
      });
      const [] = await Promise.all([
        User.updateOne({ _id: fromUserExist._id }, { $inc: { following: 1 } }),
        User.updateOne({ _id: toUserExist._id }, { $inc: { followers: 1 } }),
      ]);

      if (
        toUserExist &&
        !toUserExist.isBlock &&
        toUserExist.notification.newFollow
      ) {
        const payload = {
          to: toUserExist.fcmToken,
          notification: {
            body: `${fromUserExist.name} started following you.`,
            title: "New Follower",
          },
          data: {
            data: fromUserExist._id,
            type: "USER",
          },
        };
        await fcm.send(payload, function (err, response) {
          if (err) {
            console.log("Something has gone wrong!", err);
          } else {
            console.log(response);
          }
        });
      }
      console.log("Follow Done ");
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

exports.followerList = async (req, res) => {
  try {
    console.log("req.query", req.query);
    const [user, followers] = await Promise.all([
      User.findById(req.query?.userId),
      Follower.aggregate([
        {
          $match: { toUserId: new mongoose.Types.ObjectId(req.query?.userId) },
        },
        {
          $lookup: {
            from: "users",
            localField: "fromUserId",
            foreignField: "_id",
            as: "followers",
          },
        },
        {
          $unwind: {
            path: "$followers",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: "levels",
            localField: "followers.level",
            foreignField: "_id",
            as: "level",
          },
        },
        {
          $unwind: {
            path: "$level",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: {
            userId: "$followers._id",
            name: "$followers.name",
            username: "$followers.username",
            gender: "$followers.gender",
            age: "$followers.age",
            image: "$followers.image",
            country: "$followers.country",
            bio: "$followers.bio",
            followers: "$followers.followers",
            following: "$followers.following",
            video: "$followers.video",
            post: "$followers.post",
            level: "$level",
            isVIP: "$followers.isVIP",
          },
        },
        {
          $lookup: {
            from: "followers",
            let: { followerId: "$userId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: [
                          "$fromUserId",
                          new mongoose.Types.ObjectId(req.query?.userId),
                        ],
                      },
                      { $eq: ["$toUserId", "$$followerId"] },
                    ],
                  },
                },
              },
            ],
            as: "followStatus",
          },
        },
        {
          $addFields: {
            isFollow: { $gt: [{ $size: "$followStatus" }, 0] },
          },
        },
        { $skip: req.body.start ? parseInt(req.body.start) : 0 }, // how many records you want to skip
        { $limit: req.body.limit ? parseInt(req.body.limit) : 20 },
      ]),
    ]);

    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });
    }

    return res
      .status(200)
      .json({ status: true, message: "Success!!", user: followers });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

exports.followingList = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res
        .status(200)
        .json({ status: false, message: "Invalid Details !!" });
    }
    const [user, following] = await Promise.all([
      User.findById(req.query?.userId),
      Follower.aggregate([
        {
          $match: {
            fromUserId: new mongoose.Types.ObjectId(req.query?.userId),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "toUserId",
            foreignField: "_id",
            as: "following",
          },
        },
        {
          $unwind: {
            path: "$following",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: "levels",
            localField: "following.level",
            foreignField: "_id",
            as: "level",
          },
        },
        {
          $unwind: {
            path: "$level",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: {
            userId: "$following._id",
            name: "$following.name",
            username: "$following.username",
            gender: "$following.gender",
            age: "$following.age",
            image: "$following.image",
            country: "$following.country",
            bio: "$following.bio",
            followers: "$following.followers",
            following: "$following.following",
            video: "$following.video",
            post: "$following.post",
            level: "$level",
            isVIP: "$following.isVIP",
          },
        },
        { $addFields: { isFollow: true } },
        { $skip: req.body.start ? parseInt(req.body.start) : 0 }, // how many records you want to skip
        { $limit: req.body.limit ? parseInt(req.body.limit) : 20 },
      ]),
    ]);

    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });
    }

    return res.status(200).json({
      status: true,
      message: "Success!!",
      user: following,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

//get users followers & following list (for admin panel)
exports.followerFollowing = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res
        .status(200)
        .json({ status: false, message: "Invalid Details !!" });
    }

    const user = await User.findById(req.query.userId);

    if (req.query.type === "following") {
      const [user, following] = await Promise.all([
        User.findById(req.query?.userId),
        Follower.find({
          fromUserId: new mongoose.Types.ObjectId(req.query?.userId),
        }).populate("toUserId"),
      ]);

      if (!user)
        return res
          .status(200)
          .json({ status: false, message: "User does not Exist!" });

      if (!following)
        return res
          .status(200)
          .json({ status: false, message: "Data not found" });
      return res
        .status(200)
        .json({ status: true, message: "Success!!", follow: following });
    } else {
      const [user, follower] = await Promise.all([
        User.findById(req.query?.userId),
        Follower.find({
          toUserId: new mongoose.Types.ObjectId(req.query?.userId),
        }).populate("fromUserId"),
      ]);

      if (!user)
        return res
          .status(200)
          .json({ status: false, message: "User does not Exist!" });

      if (!follower)
        return res
          .status(200)
          .json({ status: false, message: "Data not found" });
      return res
        .status(200)
        .json({ status: true, message: "Success!!", follow: follower });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

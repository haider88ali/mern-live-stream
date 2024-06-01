const Post = require("./post.model");
const User = require("../user/user.model");
const Hashtag = require("../hashtag/hashtag.model");
const Follower = require("../follower/follower.model");
const Favorite = require("../favorite/favorite.model");
const Comment = require("../comment/comment.model");
const dayjs = require("dayjs");
const fs = require("fs");
const { deleteFile } = require("../../util/deleteFile");
const { compressImage } = require("../../util/compressImage");
const mongoose = require("mongoose");
const Setting = require("../setting/setting.model");

// index
exports.index = async (req, res) => {
  try {
    if (req.query.userId) {
      const [user, post] = await Promise.all([
        User.findById(req.query.userId),
        Post.find({ userId: req.query.userId }),
      ]);
      if (!user)
        return res
          .status(200)
          .json({ status: false, message: "User does not Exist!" });
      return res.status(200).json({ status: true, message: "Success!!", post });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    let dateFilterQuery = {};

    if (req.query.startDate !== "ALL" && req.query.endDate !== "ALL") {
      dateFilterQuery = {
        analyticDate: { $gte: req.query.startDate, $lte: req.query.endDate },
      };
    }
    let query;
    if (req.query.type === "Fake") {
      query = {
        isFake: true,
      };
    } else {
      query = {
        isFake: false,
      };
    }

    const post = await Post.aggregate([
      {
        $match: { isDelete: false, ...query },
      },
      {
        $addFields: {
          analyticDate: { $arrayElemAt: [{ $split: ["$date", ", "] }, 0] },
        },
      },
      {
        $match: dateFilterQuery,
      },
      {
        $sort: { date: -1 },
      },
      {
        $lookup: {
          from: "users",
          let: { userId: "$userId" },
          pipeline: [
            {
              $match: { $expr: { $eq: ["$$userId", "$_id"] } },
            },
            // {
            //   $project: {
            //     name: 1,
            //     username: 1,
            //     image: 1
            //   }
            // }
          ],
          as: "userId",
        },
      },
      {
        $unwind: {
          path: "$userId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          let: { mentionPeople: "$mentionPeople" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: [
                    "$_id",
                    {
                      $cond: {
                        if: { $isArray: "$$mentionPeople" },
                        then: "$$mentionPeople",
                        else: [],
                      },
                    },
                  ],
                },
              },
            },
            {
              $project: {
                name: 1,
                username: 1,
                image: 1,
              },
            },
            // Other stages if needed
          ],
          as: "mentionPeople",
        },
      },

      // {
      //   $unwind: {
      //     path: "$mentionPeople",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "post",
          as: "comment",
        },
      },
      {
        $addFields: {
          comment: { $size: "$comment" },
        },
      },
      {
        $facet: {
          post: [
            { $skip: (start - 1) * limit }, // how many records you want to skip
            { $limit: limit },
          ],
          pageInfo: [
            { $group: { _id: null, totalRecord: { $sum: 1 } } }, // get total records count
          ],
        },
      },
    ]);

    return res.status(200).json({
      status: true,
      message: "Success!!",
      total: post[0].pageInfo.length > 0 ? post[0].pageInfo[0].totalRecord : 0,
      post: post[0].post,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// create post
exports.uploadPost = async (req, res) => {
  try {
    console.log("Uploading post", req.body);
    console.log("Uploading post image", req.file);
    console.log("req dataaaaaaaaaaaaaa++++++++++++++++++++++++", req.body);
    if (!req.file || !req.body.userId)
      return res
        .status(200)
        .json({ status: false, message: "Invalid Details!" });

    const user = await User.findById(req.body.userId);

    if (!user) {
      deleteFile(req.file);
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });
    }
    if (req.body.hashtag) {
      var removeComa = req.body.hashtag.replace(/,\s*$/, "");

      var hashtagList = removeComa.split(",");

      console.log("hashtagList", hashtagList);

      if (hashtagList.length > 0) {
        hashtagList.map((hashtag) => {
          const h = hashtag.toLowerCase();
          if (h !== "" || h !== " ") {
            Hashtag.findOneAndUpdate(
              { hashtag: h },
              {},
              { upsert: true },
              function (err) {
                // console.log(err)
              }
            );
          }
        });
      }
    }

    // compress image
    compressImage(req.file);

    let mentionPeople = req.body?.mentionPeople;

    // Initialize mentionPeople as an empty array
    let mentionPeopleArray = [];

    // Check if mentionPeople is a string and convert it to an array of ObjectIds
    if (typeof mentionPeople === "string") {
      mentionPeopleArray = mentionPeople
        .split(",")
        .map((id) => {
          const trimmedId = id.trim();
          if (mongoose.Types.ObjectId.isValid(trimmedId)) {
            return mongoose.Types.ObjectId(trimmedId);
          }
          return null;
        })
        .filter((id) => id !== null);
    }

    const post = new Post();
    post.userId = user._id;
    post.post = req.file.path;

    post.hashtag = req.body.hashtag && hashtagList;
    if (req.body.location === "undefined") {
      post.location = "";
    } else {
      post.location = req.body.location && req.body.location;
    }
    post.caption = req.body.caption && req.body.caption;
    // post.mentionPeople = req.body.mentionPeople && req.body.mentionPeople;
    // post.mentionPeople = req.body.mentionPeople ? mentionPeople.filter((id) => mongoose.Types.ObjectId.isValid(id)) : []
    post.mentionPeople = mentionPeopleArray;

    post.showPost = req.body.showPost && parseInt(req.body.showPost);
    post.allowComment = req.body.allowComment && req.body.allowComment;
    post.date = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });

    await post.save();

    user.post += 1;
    await user.save();

    const postData = await Post.aggregate([
      {
        $match: { _id: mongoose.Types.ObjectId(post._id) }, // Match the specific post
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userId",
        },
      },
      {
        $unwind: "$userId",
      },
      {
        $project: {
          hashtag: 1,
          location: 1,
          caption: 1,
          showPost: 1,
          allowComment: 1,
          _id: 1,
          mentionPeople: 1,
          like: 1,
          comment: 1,
          isDelete: 1,
          isFake: 1,
          fakePostType: 1,
          name: "$userId.name",
          image: "$userId.image",
          countryFlagImage: "$userId.countryFlagImage",
          post: 1,
          date: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    // Now postData will contain the projected fields as specified

    // Now postData will contain the projected fields as specified

    return res
      .status(200)
      .json({ status: true, message: "Success!!", postData });
  } catch (error) {
    deleteFile(req.file);
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// create  fake post
exports.uploadFakePost = async (req, res) => {
  try {
    console.log("Uploading post", req.body);
    console.log("Uploading post image", req.file);
    if (!req.file || !req.body.userId)
      return res
        .status(200)
        .json({ status: false, message: "Invalid Details!" });

    const user = await User.findById(req.body.userId);

    if (!user) {
      deleteFile(req.file);
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });
    }

    // var removeComa = req.body.hashtag.replace(/,\s*$/, "");

    // var hashtagList = removeComa.split(",");

    // console.log("hashtagList", hashtagList);

    // if (hashtagList.length > 0) {
    //   hashtagList.map((hashtag) => {
    //     const h = hashtag.toLowerCase();
    //     if (h !== "" || h !== " ") {
    //       Hashtag.findOneAndUpdate(
    //         { hashtag: h },
    //         {},
    //         { upsert: true },
    //         function (err) {
    //           // console.log(err)
    //         }
    //       );
    //     }
    //   });
    // }

    // compress image
    compressImage(req.file);

    const post = new Post();
    post.userId = user._id;

    // if (req.body.fakePostType == 0) {
    //   post.post = req.body.post ? req.body.post : null;
    //   post.fakePostType = req.body.fakePostType;
    // }

    // if (req.body.fakePostType == 1) {
    //   post.post = req.file
    //     ? req.file.path
    //     : null;
    //     post.fakePostType = req.body.fakePostType;
    // }
    post.post = req.file ? req.file.path : null;
    // post.hashtag = req.body.hashtag && hashtagList;
    post.location = req.body.location && req.body.location;
    post.caption = req.body.caption && req.body.caption;
    post.mentionPeople = req.body.mentionPeople && req.body.mentionPeople;
    post.showPost = req.body.showPost && parseInt(req.body.showPost);
    post.allowComment = req.body.allowComment && req.body.allowComment;
    post.isFake = true;
    post.date = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });

    await post.save();

    user.post += 1;
    await user.save();

    return res.status(200).json({ status: true, message: "Success!!", post });
  } catch (error) {
    deleteFile(req.file);
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// update  fake post
exports.updateFakePost = async (req, res) => {
  try {
    const posts = await Post.findById(req.query.postId);
    if (!posts) {
      return res
        .status(200)
        .json({ status: false, message: "post not found!" });
    }
    let postUser;
    // var removeComa = req.body.hashtag.replace(/,\s*$/, "");

    // var hashtagList = removeComa.split(",");

    // console.log("hashtagList", hashtagList);

    // if (hashtagList.length > 0) {
    //   hashtagList.map((hashtag) => {
    //     const h = hashtag.toLowerCase();
    //     if (h !== "" || h !== " ") {
    //       Hashtag.findOneAndUpdate(
    //         { hashtag: h },
    //         {},
    //         { upsert: true },
    //         function (err) {
    //           // console.log(err)
    //         }
    //       );
    //     }
    //   });
    // }
    // compress image
    if (req.file) {
      compressImage(req.file);
    }

    // if (req.body.fakePostType == 0) {
    //   if (req.body.post) {
    //     if (fs.existsSync(posts.post)) {
    //       fs.unlinkSync(posts.post);
    //     }
    //   }
    //   posts.post = req.body.post ? req.body.post : posts.post;
    //   posts.fakePostType = req.body.fakePostType ? req.body.fakePostType : posts.fakePostType;
    // }

    // if (req.body.fakePostType == 1) {
    //   if (req.file) {
    //     if (fs.existsSync(posts.post)) {
    //       fs.unlinkSync(posts.post);
    //     }

    //   }
    //   posts.post = req.file
    //     ? req.file.path
    //     : null;
    //   posts.fakePostType = req.body.fakePostType ? req.body.fakePostType : posts.fakePostType;
    // }
    posts.post = req.file ? req.file.path : posts.post;
    postUser = posts.userId.toString();
    posts.userId = req.body.userId ? req.body.userId : posts.userId;
    // posts.hashtag = req.body.hashtag ? req.body.hashtag : posts.hashtag;
    posts.location = req.body.location ? req.body.location : posts.location;
    posts.caption = req.body.caption ? req.body.caption : posts.caption;
    posts.mentionPeople = req.body.mentionPeople ? req.body.mentionPeople : [];
    posts.showPost = req.body.showPost
      ? parseInt(req.body.showPost)
      : posts.showPost;
    posts.allowComment = req.body.allowComment
      ? req.body.allowComment
      : posts.allowComment;
    posts.isFake = true;
    posts.date = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });

    await posts.save();
    if (posts.userId.toString() !== postUser) {
      await Promise.all([
        User.updateOne(
          { _id: posts.userId },
          {
            $inc: { $post: 1 },
          }
        ),
        User.updateOne(
          { _id: postUser },
          {
            $inc: { post: -1 },
          }
        ),
      ]);
    }
    res.status(200).json({ status: true, message: "Success!!", posts });
  } catch (error) {
    deleteFile(req.file);
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// get popular and latest post list
exports.getPopularLatestPosts = async (req, res) => {
  try {
    const user = await User.findById(req.query.userId);
    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });

    let now = dayjs();
    let likeCommentSort = {},
      popularLatestSort = {};

    const FakePost = await Post.aggregate([
      {
        $match: {
          isFake: true,
          isDelete: false,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
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
          from: "favorites",
          let: {
            postId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$post", "$$postId"] },
                    { $eq: ["$user", user._id] },
                  ],
                },
              },
            },
          ],
          as: "favorite",
        },
      },
      {
        $unwind: {
          path: "$favorite",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "comments",
          as: "comment",
          let: {
            postId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$post", "$$postId"],
                },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userId",
              },
            },
            { $unwind: { path: "$userId", preserveNullAndEmptyArrays: false } },
            { $match: { "userId.isBlock": false } },
          ],
        },
      },
      {
        $project: {
          userId: "$user._id",
          name: "$user.name",
          location: 1,
          caption: 1,
          date: 1,
          createdAt: 1,
          post: 1,
          allowComment: 1,
          userImage: "$user.image",
          countryFlagImage: "$user.countryFlagImage",
          like: 1,
          comment: { $size: "$comment" },
          isFake: 1,
          isVIP: "$user.isVIP",
          isLike: {
            $cond: [{ $eq: [user._id, "$favorite.user"] }, true, false],
          },
        },
      },
      {
        $sort: { date: -1 },
      },
      {
        $facet: {
          post: [
            { $skip: req.query.start ? parseInt(req.query.start) : 0 }, // how many records you want to skip
            { $limit: req.query.limit ? parseInt(req.query.limit) : 20 },
          ],
          // pageInfo: [
          //   { $group: { _id: null, count: { $sum: 1 } } }, // get total records count
          // ],
        },
      },
    ]);

    const fakePost = FakePost[0].post.map((data) => ({
      ...data,
      time:
        now.diff(data.createdAt, "minute") <= 60 &&
        now.diff(data.createdAt, "minute") >= 0
          ? now.diff(data.createdAt, "minute") + " minutes ago"
          : now.diff(data.createdAt, "hour") >= 24
          ? dayjs(data.createdAt).format("DD MMM, YYYY")
          : now.diff(data.createdAt, "hour") + " hour ago",
    }));

    if (req.query.type === "popular") {
      likeCommentSort = {
        like: -1,
        comment: -1,
      };
      popularLatestSort = { isVIP: -1 };
    } else {
      popularLatestSort = { sortingDate: -1 };
      likeCommentSort = { sortingDate: -1 };
    }

    const posts = await Post.aggregate([
      {
        $match: { showPost: 0, isFake: false, isDelete: false },
      },
      {
        $addFields: { sortingDate: { $toDate: "$date" } },
      },
      {
        $sort: { ...likeCommentSort },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: false,
        },
      },
      { $match: { "user.isBlock": false } },
      {
        $lookup: {
          from: "favorites",
          let: {
            postId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$post", "$$postId"] },
                    { $eq: ["$user", user._id] },
                  ],
                },
              },
            },
          ],
          as: "favorite",
        },
      },
      {
        $unwind: {
          path: "$favorite",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "post",
          as: "comment",
        },
      },
      {
        $project: {
          _id: 1,
          userId: "$user._id",
          name: "$user.name",
          location: { $ifNull: ["$location", ""] },
          caption: 1,
          date: 1,
          createdAt: 1,
          post: 1,
          allowComment: 1,
          userImage: "$user.image",
          countryFlagImage: "$user.countryFlagImage",
          like: 1,
          comment: { $size: "$comment" },
          isFake: 1,
          isVIP: "$user.isVIP",
          isLike: {
            $cond: [{ $eq: [user._id, "$favorite.user"] }, true, false],
          },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $facet: {
          post: [
            { $skip: req.query.start ? parseInt(req.query.start) : 0 }, // how many records you want to skip
            { $limit: req.query.limit ? parseInt(req.query.limit) : 20 },
          ],
          // pageInfo: [
          //   { $group: { _id: null, count: { $sum: 1 } } }, // get total records count
          // ],
        },
      },
    ]).sort(popularLatestSort);

    const post = posts[0].post.map((data) => ({
      ...data,
      time:
        now.diff(data.createdAt, "minute") <= 60 &&
        now.diff(data.createdAt, "minute") >= 0
          ? now.diff(data.createdAt, "minute") + " minutes ago"
          : now.diff(data.createdAt, "hour") >= 24
          ? dayjs(data.createdAt).format("DD MMM, YYYY")
          : now.diff(data.createdAt, "hour") + " hour ago",
    }));

    const setting = await Setting.findOne({});
    if (setting?.isFake) {
      return res.status(200).json({
        status: true,
        message: "Success!",
        post: [...post, ...fakePost],
      });
    } else {
      return res.status(200).json({
        status: true,
        message: "Success!",
        post: post,
      });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// get following post list
exports.getFollowingPosts = async (req, res) => {
  try {
    const user = await User.findById(req.query.userId);
    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });
    let now = dayjs();

    const posts = await Follower.aggregate([
      {
        $match: { fromUserId: user._id },
      },
      {
        $lookup: {
          from: "posts",
          let: { toUserId: "$toUserId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$$toUserId", "$userId"] },
                    { $eq: ["$isDelete", false] },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "post",
                as: "comment",
              },
            },
            {
              $addFields: {
                comment: { $size: "$comment" },
              },
            },
          ],
          as: "post",
        },
      },
      {
        $unwind: {
          path: "$post",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "users",
          let: { userId: "$post.userId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$$userId", "$_id"] },
                    { $eq: ["$isBlock", false] },
                  ],
                },
              },
            },
          ],
          as: "user",
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
          from: "favorites",
          let: {
            postId: "$post._id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$post", "$$postId"] },
                    { $eq: ["$user", user._id] },
                  ],
                },
              },
            },
          ],
          as: "favorite",
        },
      },
      {
        $unwind: {
          path: "$favorite",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: "$post._id",
          userId: "$user._id",
          name: "$user.name",
          countryFlagImage: "$user.countryFlagImage",
          location: { $ifNull: ["$post.location", ""] },
          caption: "$post.caption",
          date: "$post.date",
          createdAt: "$post.createdAt",
          allowComment: "$post.allowComment",
          post: "$post.post",
          userImage: "$user.image",
          like: "$post.like",
          comment: "$post.comment",
          isVIP: "$user.isVIP",
          isLike: {
            $cond: [{ $eq: [user._id, "$favorite.user"] }, true, false],
          },
        },
      },
      {
        $addFields: { sortingDate: { $toDate: "$date" } },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $facet: {
          post: [
            { $skip: req.query.start ? parseInt(req.query.start) : 0 }, // how many records you want to skip
            { $limit: req.query.limit ? parseInt(req.query.limit) : 20 },
          ],
          // pageInfo: [
          //   { $group: { _id: null, count: { $sum: 1 } } }, // get total records count
          // ],
        },
      },
    ]);

    const post = posts[0].post.map((data) => ({
      ...data,
      time:
        now.diff(data.createdAt, "minute") <= 60 &&
        now.diff(data.createdAt, "minute") >= 0
          ? now.diff(data.createdAt, "minute") + " minutes ago"
          : now.diff(data.createdAt, "hour") >= 24
          ? dayjs(data.createdAt).format("DD MMM, YYYY")
          : now.diff(data.createdAt, "hour") + " hour ago",
    }));

    return res.status(200).json({
      status: post.length > 0 ? true : false,
      message: post.length > 0 ? "Success!" : "No Data Found!",
      post: post.length > 0 ? post : [],
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// get users post list
exports.getUserPosts = async (req, res) => {
  try {
    const user = await User.findById(req.query.userId);
    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });

    let now = dayjs();

    const posts = await Post.aggregate([
      {
        $match: { userId: user._id, isDelete: false },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
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
          from: "comments",
          localField: "_id",
          foreignField: "post",
          as: "comment",
        },
      },
      {
        $lookup: {
          from: "favorites",
          let: {
            postId: "$_id",
            userId: user._id,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$post", "$$postId"] },
                    { $eq: ["$user", user._id] },
                  ],
                },
              },
            },
          ],
          as: "favorite",
        },
      },
      {
        $unwind: {
          path: "$favorite",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          userId: "$user._id",
          name: "$user.name",
          countryFlagImage: "$user.countryFlagImage",
          location: { $ifNull: ["$location", ""] },
          caption: 1,
          date: 1,
          createdAt: 1,
          post: 1,
          allowComment: 1,
          userImage: "$user.image",
          like: 1,
          comment: { $size: "$comment" },
          isVIP: "$user.isVIP",
          isLike: {
            $cond: [{ $eq: [user._id, "$favorite.user"] }, true, false],
          },
        },
      },
      {
        $addFields: { sortingDate: { $toDate: "$date" } },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $facet: {
          post: [
            { $skip: req.query.start ? parseInt(req.query.start) : 0 }, // how many records you want to skip
            { $limit: req.query.limit ? parseInt(req.query.limit) : 20 },
          ],
          // pageInfo: [
          //   { $group: { _id: null, count: { $sum: 1 } } }, // get total records count
          // ],
        },
      },
    ]);

    const post = posts[0].post.map((data) => ({
      ...data,
      time:
        now.diff(data.createdAt, "minute") <= 60 &&
        now.diff(data.createdAt, "minute") >= 0
          ? now.diff(data.createdAt, "minute") + " minutes ago"
          : now.diff(data.createdAt, "hour") >= 24
          ? dayjs(data.createdAt).format("DD MMM, YYYY")
          : now.diff(data.createdAt, "hour") + " hour ago",
    }));

    return res.status(200).json({
      status: post.length > 0 ? true : false,
      message: post.length > 0 ? "Success!" : "No Data Found!",
      post: post.length > 0 ? post : [],
    });
  } catch (error) {
    console.log(error);
    return res
      .status(200)
      .json({ status: true, error: error.message || "Server Error" });
  }
};

// delete post
exports.destroy = async (req, res) => {
  try {
    const post = await Post.findById(req.query.postId);
    if (!post)
      return res
        .status(200)
        .json({ status: false, message: "Post does not Exist!" });

    if (fs.existsSync(post.post)) {
      fs.unlinkSync(post.post);
    }

    await Comment.deleteMany({ post: post._id });
    await Favorite.deleteMany({ post: post._id });

    post.comment = 0;
    post.like = 0;
    post.isDelete = true;
    await post.save();

    return res.status(200).json({ status: true, message: "Success!!" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// allow disallow comment on relite [frontend]
exports.allowDisallowComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId).populate("userId");
    if (!post)
      return res
        .status(200)
        .json({ status: false, message: "Post does not Exist!" });

    post.allowComment = !post.allowComment;
    post.comment = await Comment.find({ post: post._id }).countDocuments();
    await post.save();

    return res.status(200).json({ status: true, message: "Success!!", post });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

//get perticular post by post id[web]

exports.getPostById = async (req, res) => {
  try {
    if (!req.query.postId)
      return res.status(200).json({ status: false, message: "No data found!" });
    const post = await Post.findById(req.query.postId).populate("userId");
    return res.json({ status: true, message: "success", post: post });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ status: false, error: err.message || "Server Error" });
  }
};

const Favorite = require("./favorite.model");
const User = require("../user/user.model");
const Post = require("../post/post.model");
const Video = require("../video/video.model");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc); // Extend dayjs with utc plugin
dayjs.extend(timezone);

//FCM node
var FCM = require("fcm-node");
var config = require("../../config");
var fcm = new FCM(config.SERVER_KEY);

//like or unlike post and video
exports.likeUnlike = async (req, res, next) => {
  try {
    if (!req.body.userId || (!req.body.postId && !req.body.videoId))
      return res.status(200).json({
        status: false,
        message: "Invalid Details!",
      });
    let user, post, video, likeExist;

    //like or unlike post
    if (req.body.postId) {
      [user, post, likeExist] = await Promise.all([
        User.findById(req.body.userId),
        Post.findById(req.body.postId).populate(
          "userId",
          "fcmToken notification isBlock name image isVIP"
        ),
        Favorite.findOne({
          user: req.body.userId,
          post: req.body.postId,
        }),
      ]);
      if (!user) {
        return res.status(200).json({
          status: false,
          message: "User does not Exist!",
        });
      }
      if (!post)
        return res.status(200).json({
          status: false,
          message: "Post does not Exist!",
        });

      if (!likeExist) {
        await Favorite({
          user: user._id,
          post: post._id,
        }).save();
        console.log("Like Done");
        res.status(200).json({
          status: true,
          message: "Post Like Successfully!!",
          isLiked: true,
        });
        post.like += 1;
        await post.save();
        if (
          post.userId &&
          post.userId._id.toString() !== user._id.toString() &&
          !post.userId.isBlock &&
          post.userId.notification.likeCommentShare
        ) {
          const payload = {
            to: post.userId.fcmToken,
            notification: {
              title: `${user.name} liked your post.`,
            },
            data: {
              data: [
                {
                  _id: post._id,
                  caption: post.caption,
                  like: post.like,
                  comment: post.comment,
                  post: post.post,
                  date: post.date,
                  allowComment: post.allowComment,
                  userId: post.userId ? post.userId._id : "",
                  name: post.userId ? post.userId.name : "",
                  userImage: post.userId ? post.userId.image : "",
                  isVIP: post.userId ? post.userId.isVIP : "",
                  isLike: true,
                  time: post.date ? post.date.split(",")[0] : "",
                },
              ],
              type: "POST",
            },
          };

          await fcm.send(payload, function (err, response) {
            if (err) {
              console.log("Something has gone wrong!", err);
            }
          });
        }
        return;
      } else {
        await likeExist.deleteOne();

        console.log("UnLike Done");
        res.status(200).json({
          status: true,
          message: "Post Dislike Successfully!!",
          isLiked: false,
        });
        post.like = post.like > 0 ? post.like - 1 : 0;
        await post.save();
      }
    } else {
      [user, video, likeExist] = await Promise.all([
        User.findById(req.body.userId),
        Video.findById(req.body.videoId).populate("userId song"),
        Favorite.findOne({
          user: req.body.userId,
          video: req.body.videoId,
        }),
      ]);
      if (!user) {
        return res.status(200).json({
          status: false,
          message: "User does not Exist!",
        });
      }
      if (!video) {
        return res.status(200).json({
          status: false,
          message: "Video does not Exist!",
        });
      }
      if (!likeExist) {
        await Favorite({
          user: user._id,
          video: video._id,
        }).save();
        res.status(200).json({
          status: true,
          message: "V Shorts Liked Successfully!!",
          isLiked: true,
        });
        video.like += 1;
        await video.save();

        if (
          video.userId &&
          video.userId._id.toString() !== user._id.toString() &&
          !video.userId.isBlock &&
          video.userId.notification.likeCommentShare
        ) {
          const payload = {
            to: video.userId.fcmToken,
            notification: {
              title: `${user.name} liked your V Shorts.`,
            },
            data: {
              data: [
                {
                  _id: video._id,
                  hashtag: video.hashtag,
                  mentionPeople: video.mentionPeople,
                  isOriginalAudio: video.isOriginalAudio,
                  like: video.like,
                  comment: video.comment,
                  allowComment: video.allowComment,
                  showVideo: video.showVideo,
                  isDelete: video.isDelete,
                  userId: video.userId ? video.userId._id : "",
                  video: video.video,
                  location: video.location,
                  caption: video.caption,
                  thumbnail: video.thumbnail,
                  screenshot: video.screenshot,
                  song: video.song,
                  name: video.userId ? video.userId.name : "",
                  userImage: video.userId ? video.userId.image : "",
                  isVIP: video.userId ? video.userId.isVIP : false,
                  isLike: true,
                },
              ],
              type: "RELITE",
            },
          };
          await fcm.send(payload, function (err, response) {
            if (err) {
              console.log("Something has gone wrong!", err);
            }
          });
        }
        return;
      } else {
        await likeExist.deleteOne();

        res.status(200).json({
          status: true,
          message: "V Shorts Unliked Successfully!!",
          isLiked: false,
        });
        video.like = video.like > 0 ? video.like - 1 : 0;
        await video.save();
      }
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "server error" });
  }
};

//get list of likes
exports.getLikes = async (req, res) => {
  try {
    let now = dayjs();

    if (req.query.postId) {
      const post = await Post.findById(req.query.postId);
      if (!post) {
        return res
          .status(200)
          .json({ status: false, message: "Post does not Exist!" });
      }
    } else {
      const video = await Video.findById(req.query.videoId);
      if (!video) {
        return res
          .status(200)
          .json({ status: false, message: "V Shorts does not Exist!" });
      }
    }

    let query;
    if (req.query.postId) {
      query = { post: req.query.postId };
    } else {
      query = { video: req.query.videoId };
    }

    const like = await Favorite.find({
      ...query,
    }).populate("user");

    if (req.query.type === "ADMIN") {
      const likes = await like.map((data) => ({
        _id: data._id,
        userId: data.user ? data.user._id : "",
        image: data.user ? data.user.image : "",
        name: data.user ? data.user.name : "",
        username: data.user ? data.user.username : "",
        comment: "",
        user: data.user ? data.user : null,
        time:
          now.diff(data.createdAt, "minute") <= 60 &&
          now.diff(data.createdAt, "minute") >= 0
            ? now.diff(data.createdAt, "minute") + " minutes ago"
            : now.diff(data.createdAt, "hour") >= 24
            ? dayjs(data.createdAt).format("DD MMM, YYYY")
            : now.diff(data.createdAt, "hour") + " hour ago",
      }));

      return res
        .status(200)
        .json({ status: true, message: "Success!!", data: likes });
    }

    const likes = await like.map((data) => ({
      _id: data._id,
      userId: data.user ? data.user._id : "",
      image: data.user ? data.user.image : "",
      name: data.user ? data.user.name : "",
      username: data.user ? data.user.username : "",
      comment: "",
      time:
        now.diff(data.createdAt, "minute") <= 60 &&
        now.diff(data.createdAt, "minute") >= 0
          ? now.diff(data.createdAt, "minute") + " minutes ago"
          : now.diff(data.createdAt, "hour") >= 24
          ? dayjs(data.createdAt).format("DD MMM, YYYY")
          : now.diff(data.createdAt, "hour") + " hour ago",
    }));

    return res
      .status(200)
      .json({ status: true, message: "Success!!", data: likes });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

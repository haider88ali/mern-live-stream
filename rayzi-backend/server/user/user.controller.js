const User = require("./user.model");
const Follower = require("../follower/follower.model");
const Setting = require("../setting/setting.model");
const VIPPlan = require("../vipPlan/vipPlan.model");
const Wallet = require("../wallet/wallet.model");
const Level = require("../level/level.model");
const Flag = require("../flag/flag.model");
const LiveUser = require("../liveUser/liveUser.model");
const fs = require("fs");
const config = require("../../config");
const moment = require("moment");
const arrayShuffle = require("shuffle-array");
const deleteFile = require("../../util/deleteFile");
const { compressImage } = require("../../util/compressImage");
const shuffleArray = require("shuffle-array");
const mongoose = require("mongoose");

// get users list
exports.index = async (req, res) => {
  try {
    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    let matchQuery = {};
    if (req.query.search != "ALL") {
      matchQuery = {
        $or: [
          { username: { $regex: req.query.search, $options: "i" } },
          { gender: { $regex: req.query.search, $options: "i" } },
          { country: { $regex: req.query.search, $options: "i" } },
        ],
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

    let dateFilterQuery = {};

    if (req.query.startDate !== "ALL" && req.query.endDate !== "ALL") {
      dateFilterQuery = {
        analyticDate: { $gte: req.query.startDate, $lte: req.query.endDate },
      };
    }

    const user = await User.aggregate([
      {
        $match: { ...query, ...matchQuery },
      },
      {
        $addFields: {
          analyticDate: {
            $arrayElemAt: [{ $split: ["$analyticDate", ", "] }, 0],
          },
        },
      },
      {
        $match: dateFilterQuery,
      },
      {
        $lookup: {
          from: "levels",
          localField: "level",
          foreignField: "_id",
          as: "level",
        },
      },
      {
        $unwind: {
          path: "$level",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $facet: {
          user: [
            { $skip: (start - 1) * limit }, // how many records you want to skip
            { $limit: limit },
          ],
          gender: [
            { $group: { _id: { $toLower: "$gender" }, gender: { $sum: 1 } } }, // get total records count
          ],
          activeUser: [
            { $match: { isOnline: true } }, // Filter for active users
            { $group: { _id: "$isOnline", activeUser: { $sum: 1 } } }, // Count active users
          ],
          pageInfo: [
            { $group: { _id: null, totalRecord: { $sum: 1 } } }, // get total records count
          ],
        },
      },
    ]);

    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "Data not found!" });

    return res.status(200).json({
      status: true,
      message: "Success!!",
      total: user[0].pageInfo.length > 0 ? user[0].pageInfo[0].totalRecord : 0,
      activeUser:
        user[0].activeUser.length > 0 ? user[0].activeUser[0].activeUser : 0,
      maleFemale: user[0].gender,
      user: user[0].user,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// get popular user by its follower count
exports.getPopularUser = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res
        .send(200)
        .json({ status: false, message: "userId is required" });
    }

    const [user, followerIds] = await Promise.all([
      User.findById(req.query.userId),
      Follower.find({ fromUserId: req.query.userId }).distinct("toUserId"),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User not found" });
    }

    const top_users = await User.find({ _id: { $nin: followerIds } })
      .sort({
        followers: -1,
      })
      .limit(10);

    return res.status(200).json({
      status: true,
      message: "Success!!",
      top_users,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// user signup and login
exports.loginSignup = async (req, res) => {
  try {
    console.log("LOGIN signup api call", req.body);
    if (!req.body.identity)
      return res
        .status(200)
        .json({ status: false, message: "Invalid Details!", user: {} });
    if (!req.body.email && !req.body.mobileNumber)
      return res
        .status(200)
        .json({ status: false, message: "Invalid Details!", user: {} });

    let userQuery, userExist, userNameExist, setting, flag;

    if (req.body.mobileNumber) {
      userExist = await User.findOne({
        mobileNumber: JSON.parse(req.body.mobileNumber),
      }).populate("level");
      if (userExist) {
        if (userExist?.identity !== req.body.identity) {
          return res.status(200).json({
            status: false,
            message: "You already Login with another device",
            user: {},
          });
        }
      }
    } else {
      userExist = await User.findOne({
        email: req.body.email,
      }).populate("level");
    }

    if (userExist) {
      // const user = await userFunction(userExist, req.body);
      userExist.fcmToken = req.body.fcmToken;
      await userExist.save();
      return res
        .status(200)
        .json({ status: true, message: "Success!!", user: userExist });
    }
    [userNameExist, setting, flag] = await Promise.all([
      User.exists({
        username: { $regex: new RegExp(`^${req.body.username}$`, "i") },
      }),
      Setting.findOne(),
      Flag.findOne({ name: req.body?.country?.trim() }),
    ]);
    const newUser = new User();
    const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    if (req.body.username) {
      if (userNameExist) {
        let newUsername = "";
        for (let i = 0; i < 8; i++) {
          newUsername += randomChars.charAt(
            Math.floor(Math.random() * randomChars.length)
          );
        }
        newUser.username = newUsername;
      }
    }

    let referralCode = "";
    for (let i = 0; i < 8; i++) {
      referralCode += randomChars.charAt(
        Math.floor(Math.random() * randomChars.length)
      );
    }
    newUser.countryFlagImage = flag?.flag;
    newUser.referralCode = referralCode;
    newUser.mobileNumber = req.body.mobileNumber
      ? JSON.parse(req.body.mobileNumber)
      : 0;

    newUser.analyticDate = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    newUser.diamond += setting ? setting.loginBonus : 0;

    newUser.coverImage = req.body.coverImage
      ? req.body.coverImage
      : `${config.baseURL}storage/coverImage.jpg`;
    var digits = Math.floor(Math.random() * 90000000) + 10000000;
    newUser.uniqueId = digits;

    const user = await userFunction(newUser, req.body);
    if (setting && setting.loginBonus > 0) {
      const income = new Wallet();
      income.userId = user._id;
      income.diamond = setting ? setting.loginBonus : 0;
      income.type = 5;
      income.date = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });
      await income.save();
    }
    const user_ = await updateLevel(user._id);

    return res
      .status(200)
      .json({ status: true, message: "Success!!", user: user_ });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
      user: {},
    });
  }
};

//add fake user for admin penal
exports.AddFakeUser = async (req, res) => {
  try {
    const [userNameExist, flag, level] = await Promise.all([
      User.findOne({
        username: { $regex: new RegExp(`^${req.body.username}$`, "i") },
      }),
      Flag.findOne({ name: req.body?.country?.trim() }),
      Level.find({}).sort({ coin: 1 }),
    ]);

    if (userNameExist) {
      return res.status(200).json({
        status: false,
        message: "Username already taken!",
        user: {},
      });
    }

    const user = new User();
    user.level = level[0]?._id;
    const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let referralCode = "";
    for (let i = 0; i < 8; i++) {
      referralCode += randomChars.charAt(
        Math.floor(Math.random() * randomChars.length)
      );
    }
    user.referralCode = referralCode;
    user.name = req.body.name;
    user.gender = req.body.gender;
    user.age = req.body.age;

    if (req.body.imageType == 0) {
      user.image = req.body.image ? req.body.image : null;
      user.imageType = req.body.imageType;
    }

    if (req.body.imageType == 1) {
      user.image = req.files.image
        ? config.baseURL + req.files.image[0].path
        : null;
      user.imageType = req.body.imageType;
    }

    if (req.body.linkType == 0) {
      user.link = req.body.link ? req.body.link : null;
      user.linkType = req.body.linkType;
    }
    if (req.body.linkType == 1) {
      user.link = req.files.link
        ? config.baseURL + req.files.link[0].path
        : null;
      user.linkType = req.body.linkType;
    }
    user.bio = req.body.bio ? req.body.bio : null;
    user.country = req.body?.country;
    user.countryFlagImage = flag?.flag;
    user.ip = req.body.ip ? req.body.ip : null;
    user.identity = req.body.identity ? req.body.identity : null;
    user.loginType = 2;
    user.analyticDate = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    user.username = req.body.username;
    user.email = req.body.email;
    user.isFake = true;
    await user.save();

    return res.status(200).send({
      status: true,
      message: "Success!!",
      user,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

//update fake user for admin penal
exports.updateFakeUser = async (req, res) => {
  try {
    if (!req.query?.userId) {
      return res.status(200).json({
        status: false,
        message: "Invalid Details !!",
        user: {},
      });
    }
    const [userNameExist, user, flag] = await Promise.all([
      User.findOne({
        _id: { $ne: mongoose.Types.ObjectId(req.query?.userId) },
        username: { $regex: new RegExp(`^${req.body?.username}$`, "i") },
      }),
      User.findById(req.query?.userId),
      Flag.findOne({ name: req.body?.country?.trim() }),
    ]);

    if (!user) {
      return res.status(200).json({
        status: false,
        message: "user dose not exists!",
        user: {},
      });
    }

    if (userNameExist) {
      return res.status(200).json({
        status: false,
        message: "Username already taken!",
        user: {},
      });
    }

    user.analyticDate = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    user.name = req.body.name ? req.body.name : user.name;
    user.gender = req.body.gender ? req.body.gender : user.gender;
    user.age = req.body.age ? req.body.age : user.age;
    user.bio = req.body.bio ? req.body.bio : user.bio;

    if (
      (req.body.image && req.body.imageType == 0) ||
      (req.files.image && req.body.imageType == 1)
    ) {
      if (user.imageType == 1) {
        var image_ = user.image?.split("storage");
        if (image_) {
          if (fs.existsSync("storage" + image_[1])) {
            fs.unlinkSync("storage" + image_[1]);
          }
        }
      }
      if (req.body.imageType == 0) {
        user.image = req.body?.image;
      } else {
        user.image = config.baseURL + req.files?.image[0].path;
      }
      user.imageType = req.body.imageType;
    }

    if (
      (req.body.link && req.body.linkType == 0) ||
      (req.files.link && req.body.linkType == 1)
    ) {
      if (user.linkType == 1) {
        var link_ = user.link?.split("storage");
        if (link_) {
          if (fs.existsSync("storage" + link_[1])) {
            fs.unlinkSync("storage" + link_[1]);
          }
        }
      }
      if (req.body.linkType == 0) {
        user.link = req.body?.link;
      } else {
        user.link = config.baseURL + req.files?.link[0].path;
      }
      user.linkType = req.body.linkType;
    }
    user.video = req.body.video ? req.body.video : user.video;
    user.country = req.body.country ? req.body.country : user.country;

    if (req?.body?.country) {
      const flag = await Flag.findOne({ name: req?.body?.country.trim() });
      user.countryFlagImage = flag?.flag ? flag?.flag : user?.countryFlagImage;
    }

    user.loginType = 2;
    user.username = req.body.username ? req.body.username : user.username;
    user.email = req.body.email ? req.body.email : user.email;
    user.isFake = true;
    await user.save();

    return res.status(200).send({
      status: true,
      message: "Success!!",
      user,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

const userFunction = async (user, data) => {
  user.name = data.name ? data.name.trim() : user.name;
  user.gender = data.gender ? data.gender : user.gender;
  user.age = data.age ? data.age : user.age;
  console.log(
    ".........................userFunction ........",
    data.image,
    data.gender
  );
  user.image =
    data.image === "" || "undefined"
      ? data?.gender?.toLowerCase() === "female"
        ? `${config.baseURL}storage/female.png`
        : `${config.baseURL}storage/male.png`
      : data.image;

  user.country = data.country;
  user.ip = data.ip;
  user.identity = data.identity;
  user.loginType = data.loginType;
  user.email = data.email;
  user.fcmToken = data.fcmToken;
  user.lastLogin = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
  });

  await user.save();

  return user;
};

// check username is already exist or not
exports.checkUsername = async (req, res) => {
  try {
    if (!req.query.username)
      return res
        .status(200)
        .json({ status: false, message: "Invalid Details!" });

    // const user = await User.findById(req.query.userId);

    // if (!user)
    //   return res
    //     .status(200)
    //     .json({ status: false, message: "User Does Not Exist !" });

    // if (user.username === req.query.username) {
    //   return res.status(200).json({
    //     status: true,
    //     message: "Username generated successfully!",
    //   });
    // }
    User.findOne({
      username: { $regex: new RegExp(`^${req.query.username}$`, "i") },
    }).exec((error, user) => {
      if (error)
        return res
          .status(200)
          .json({ status: false, message: "Internal Server Error" });
      else {
        if (user) {
          return res
            .status(200)
            .json({ status: false, message: "Username already taken!" });
        } else
          return res.status(200).json({
            status: true,
            message: "Username generated successfully!",
          });
      }
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// get profile of user who login
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.query.userId);

    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!", user: {} });

    if (user.plan.planId !== null && user.plan.planStartDate !== null) {
      const user_ = await checkPlan(user._id);
      return res
        .status(200)
        .json({ status: true, message: "success", user: user_ });
    }

    const user_ = await updateLevel(user._id);
    return res
      .status(200)
      .json({ status: true, message: "Success!!", user: user_ });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Server Error",
      user: "",
    });
  }
};

// update profile of user
exports.updateProfile = async (req, res) => {
  try {
    console.log("edit body", req.body);
    console.log("edit file", req.files);

    const userNameExist = await User.exists({
      _id: { $ne: mongoose.Types.ObjectId(req.body.userId) },
      username: { $regex: new RegExp(`^${req.body?.username}$`, "i") },
    });

    if (userNameExist) {
      return res.status(200).json({
        status: false,
        message: "Username already taken!",
        user: {},
      });
    }

    const user = await User.findById(req.body.userId).populate("level");

    if (!user)
      return res.status(200).json({
        status: false,
        message: "User does not Exist!",
        user: {},
      });

    if (req.files && req.files.image) {
      var image_ = user.image.split("storage");
      if (image_[1] !== "/male.png" && image_[1] !== "/female.png") {
        if (fs.existsSync("storage" + image_[1])) {
          fs.unlinkSync("storage" + image_[1]);
        }
      }

      // compress image
      compressImage(req.files.image[0]);

      user.image = config.baseURL + req.files.image[0].path;
    }
    // else {
    //   user.image =
    //     req.body.gender.toLowerCase() === "female"
    //       ? `${config.baseURL}storage/female.png`
    //       : `${config.baseURL}storage/male.png`;
    // }
    user.coverImage = req.files.coverImage
      ? config.baseURL + req.files.coverImage[0].path
      : user.coverImage;

    user.name = req.body.name;
    user.username = req.body.username;
    user.bio = req.body.bio;
    user.gender = req.body.gender;
    user.age = req.body.age;

    await user.save();

    return res.status(200).json({ status: true, message: "Success!!", user });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Server Error",
      user: {},
    });
  }
};

// get user profile of post[feed]
exports.getProfileUser = async (req, res) => {
  try {
    let query;
    if (req.body.profileUserId) {
      query = {
        _id: req.body.profileUserId,
      };
    } else {
      query = {
        username: req.body.username,
      };
    }

    const [user, profileUser] = await Promise.all([
      User.findById(req.body.userId),
      User.findOne({ ...query })
        .populate("level")
        .select(
          "name username gender age image country bio followers following video post level isVIP coverImage countryFlagImage"
        ),
    ]);

    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });

    if (!profileUser)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });
    var isFollow = false;
    const isFollowExist = await Follower.exists({
      fromUserId: user._id,
      toUserId: profileUser._id,
    });
    if (isFollowExist) {
      isFollow = true;
    }

    return res.status(200).json({
      status: true,
      message: "Success!!",
      user: { ...profileUser._doc, userId: profileUser._id, isFollow },
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// search user by name and username
exports.search = async (req, res) => {
  try {
    console.log("req.body in search : ", req.body);

    const [user, response] = await Promise.all([
      User.findById(req.body.userId),
      User.aggregate([
        {
          $match: {
            $and: [
              { _id: { $ne: new mongoose.Types.ObjectId(req.body.userId) } },
              { isBlock: false },
              {
                $or: [
                  { name: { $regex: req.body.value, $options: "i" } },
                  { username: { $regex: req.body.value, $options: "i" } },
                ],
              },
            ],
          },
        },
        {
          $lookup: {
            from: "followers",
            let: { toUserIds: "$_id" },
            as: "isFollow",
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$toUserId", "$$toUserIds"] },
                      {
                        $eq: [
                          "$fromUserId",
                          new mongoose.Types.ObjectId(req.body.userId),
                        ],
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "levels",
            localField: "level",
            foreignField: "_id",
            as: "level",
          },
        },
        {
          $unwind: {
            path: "$level",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            isFollow: { $gt: [{ $size: "$isFollow" }, 0] },
          },
        },
        {
          $project: {
            _id: 1,
            userId: "$_id",
            name: 1,
            username: 1,
            gender: 1,
            age: 1,
            image: 1,
            country: 1,
            bio: 1,
            followers: 1,
            following: 1,
            video: 1,
            post: 1,
            level: 1,
            isVIP: 1,
            isFollow: 1,
          },
        },
        { $sort: { followers: -1 } },
        { $skip: req.body.start ? parseInt(req.body.start) : 0 },
        { $limit: req.body.limit ? parseInt(req.body.limit) : 20 },
      ]),
    ]);

    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });

    return res
      .status(200)
      .json({ status: true, message: "Success!!", user: response });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

//check referral code is valid and add referral bonus
exports.referralCode = async (req, res) => {
  try {
    if (!req.body.userId || !req.body.referralCode)
      return res
        .status(200)
        .json({ status: false, message: "Invalid Details!!", user: {} });

    const [user, referralCodeUser, setting] = await Promise.all([
      User.findById(req.body.userId).populate("level"),
      User.findOne({
        referralCode: req.body?.referralCode?.trim(),
      }),
      Setting.findOne({}),
    ]);

    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!!", user: {} });

    if (user.referralCode === req.body.referralCode.trim())
      return res.status(200).json({
        status: false,
        message: "You can't use your own Referral Code!",
        user: {},
      });

    if (!referralCodeUser)
      return res.status(200).json({
        status: false,
        message: "Referral Code is not Exist!!",
        user: {},
      });

    if (!user.isReferral) {
      user.isReferral = true;
      user.diamond += setting ? setting.referralBonus : 0;
      user.save();
      console.log("user.diamond", user.diamond);
      referralCodeUser.rCoin += setting ? setting.referralBonus : 0;
      referralCodeUser.referralCount += 1;
      referralCodeUser.save();

      console.log("referralCodeUser.rCoin : ", referralCodeUser.rCoin);

      let walletData = [
        {
          userId: referralCodeUser._id,
          rCoin: setting ? setting.referralBonus : 0,
          type: 6,
          otherUserId: user._id,
          date: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
          }),
        },
        {
          userId: user._id,
          diamond: setting ? setting.referralBonus : 0,
          type: 6,
          otherUserId: referralCodeUser._id,
          date: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
          }),
        },
      ];
      await Wallet.insertMany(walletData);

      return res.status(200).json({ status: true, message: "Success!!", user });
    }

    return res.status(200).json({
      status: false,
      message: "User already used a Referral Code!!",
      user: {},
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// block unblock user
exports.blockUnblock = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });

    user.isBlock = !user.isBlock;

    await user.save();

    return res.status(200).json({ status: true, message: "Success!!", user });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// online the user
exports.userIsOnline = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);

    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });
    }

    user.isOnline = true;
    user.isBusy = false;

    await user.save();

    return res.status(200).json({ status: true, message: "Success!!" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// offline the user
exports.offlineUser = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (user) {
      user.isOnline = false;
      user.isBusy = false;
      user.token = null;
      user.channel = null;

      await user.save();

      await LiveUser.findOneAndDelete({ liveUserId: user._id });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// get random match for call
exports.randomMatch = async (req, res) => {
  try {
    let gender, fakeUser;
    if (req.query.type) {
      const typeLower = req.query.type.toLowerCase();
      if (typeLower === "male" || typeLower === "female") {
        gender = new RegExp(`^${typeLower}$`, "i");
      }
    }

    const [user, setting, UserData, users] = await Promise.all([
      User.findById(req.query.userId),
      Setting.findOne({}),
      User.find({
        isFake: true,
        ...(gender && { gender }),
      })
        .populate("level")
        .select(
          "name username gender age image country bio followers following video isFake post level isVIP loginType"
        ),
      User.find({
        _id: { $ne: req.query.userId },
        isOnline: true,
        isBusy: false,
        isFake: false,
        ...(gender && { gender }),
      })
        .populate("level")
        .select(
          "name username gender age image country bio followers following video isFake post level isVIP loginType"
        ),
    ]);

    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });

    if (setting.isFake) {
      console.log("gender: ", gender);
      fakeUser = await shuffleArray(UserData);
    }

    const shuffleUser = await arrayShuffle(users);
    let userResult =
      shuffleUser.length > 0
        ? {
            ...shuffleUser[0]._doc,
            userId: shuffleUser[0]._id,
            isFake: shuffleUser[0].isFake,
          }
        : setting.isFake
        ? {
            ...fakeUser[0]?._doc,
            userId: fakeUser[0]?._id,
            isFake: fakeUser[0]?.isFake,
          }
        : {};
    console.log("userResult : ", userResult);
    return res.status(200).json({
      status: userResult.userId ? true : false,
      message: userResult.userId ? "Success!!" : "No one is Match !!",
      user: userResult,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// admin add or less the rCoin or diamond of user through admin panel
exports.addLessRcoinDiamond = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);

    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!" });

    if (
      (req.body.rCoin && parseInt(req.body.rCoin) === user.rCoin) ||
      (req.body.diamond && parseInt(req.body.diamond) === user.diamond)
    )
      return res.status(200).json({ status: true, message: "Success!!", user });

    const wallet = new Wallet();

    if (req.body.rCoin) {
      if (user.rCoin > req.body.rCoin) {
        // put entry on history in outgoing
        wallet.isIncome = false;
        wallet.rCoin = user.rCoin - req.body.rCoin;
      } else {
        // put entry on history in income
        wallet.isIncome = true;
        wallet.rCoin = req.body.rCoin - user.rCoin;
      }
      user.rCoin = req.body.rCoin;
    }
    if (req.body.diamond) {
      if (user.diamond > req.body.diamond) {
        // put entry on history in outgoing
        wallet.isIncome = false;
        wallet.diamond = user.diamond - req.body.diamond;
      } else {
        // put entry on history in income
        wallet.isIncome = true;
        wallet.diamond = req.body.diamond - user.diamond;
      }
      user.diamond = req.body.diamond;
    }
    await user.save();

    wallet.userId = user._id;
    wallet.type = 8;
    wallet.date = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    await wallet.save();

    return res.status(200).json({ status: true, message: "Success!!", user });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

//check user plan is expired or not
const checkPlan = async (userId, res) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User does not exist!!" });
    }
    await updateLevel(user._id);
    if (user.plan.planStartDate !== null && user.plan.planId !== null) {
      const plan = await VIPPlan.findById(user.plan.planId);
      if (!plan) {
        return res
          .status(200)
          .json({ status: false, message: "Plan does not exist!!" });
      }

      if (plan.validityType.toLowerCase() === "day") {
        const diffTime = moment(new Date()).diff(
          moment(new Date(user.plan.planStartDate)),
          "day"
        );
        if (diffTime > plan.validity) {
          user.isVIP = false;
          user.plan.planStartDate = null;
          user.plan.planId = null;
        }
      }
      if (plan.validityType.toLowerCase() === "month") {
        const diffTime = moment(new Date()).diff(
          moment(new Date(user.plan.planStartDate)),
          "month"
        );
        if (diffTime >= plan.validity) {
          user.isVIP = false;
          user.plan.planStartDate = null;
          user.plan.planId = null;
        }
      }
      if (plan.validityType.toLowerCase() === "year") {
        const diffTime = moment(new Date()).diff(
          moment(new Date(user.plan.planStartDate)),
          "year"
        );
        if (diffTime >= plan.validity) {
          user.isVIP = false;
          user.plan.planStartDate = null;
          user.plan.planId = null;
        }
      }
    }

    await user.save();

    const user_ = await User.findById(userId).populate("level");
    return user_;
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error });
  }
};

// update level of user
const updateLevel = async (userId, res) => {
  try {
    const [user, level] = await Promise.all([
      User.findById(userId).lean(),
      Level.find().sort({
        coin: -1,
      }),
    ]);

    if (!user) return user;

    user.level = level[0]._id;
    await level.map(async (data) => {
      if (user.spentCoin <= data.coin) {
        return (user.level = data._id);
      }
    });

    const user_ = await User.findByIdAndUpdate(
      userId,
      {
        $set: { level: user.level },
      },
      { new: true }
    ).populate("level");

    return user_;
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

exports.IdGenerate = async (req, res) => {
  try {
    const user = await User.findById(req.query.userId);
    user.name = user.name;
    await user.save();
    // const user = await User.find({});
    // user.map(async (res) => {
    //   var digits = Math.floor(Math.random() * 90000000) + 10000000;

    //   res.uniqueId = digits;
    //   await res.save();
    // });
    return res.status(200).json({ status: true, message: "success", user });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

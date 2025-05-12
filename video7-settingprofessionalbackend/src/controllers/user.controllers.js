import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessandRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    //save the refresh token in db
    user.save({ validateBeforeSave: false });
    //here validation before save is turned of else password need to be passed everytime

    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(500, "Error in generating access and refresh tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //get user data from frontend
  //to get files like avatar we have designed in router using multer middleware
  const { username, email, fullname, password } = req.body;

  //validation if no empty form, valid email
  // if (fullname === "") {
  //   throw new ApiError(400, "fullname is required");
  // }
  //better writing practice
  if (
    [username, email, fullname, password].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "All fields are required");
  }
  //_______________________________can have more validations like check if @is there or not

  //_______________________________check if user already exist:username,email

  //cheking if either there is a previous entry by same username or email
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exist");
  }

  //check for images
  // check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;

  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  //a classical way to check for coverImageLocalPath
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, " Avatar file is required");
  }

  //upload images to cloudinary,check if avatar is uploaded successfully or not
  var avatar;
  var coverImage;
  try {
    avatar = await uploadOnCloudinary(avatarLocalPath);
    coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
      throw new ApiError(400, "Avatar file is required");
    }
  } catch (err) {
    console.log("Error in uploading avatar on cloudinary");
  }

  //create user object-create entry in db
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  //remove password and refresh token feed
  //here by default everything is selected so to remove the parameter which we want we put -sign before it in form of string with space
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  //check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  //return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registred successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //get data from req body
  const { username, email, password } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "username or email fields are required");
  }
  //check if user exist checking via username or email
  //if user is not found then it will return null
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  //password check
  const isPasswordCorrect = await user.isPasswordCorrect(password);
  //User is not having isPasswordCorrect method
  //  so we have to use user instance to call it
  // const isPasswordCorrect = await User.isPasswordCorrect(password);
  // //this will not work as we are calling it on model not on instance of model
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid credentials");
  }

  //access and refresh token
  const { accessToken, refreshToken } = await generateAccessandRefreshTokens(
    user._id,
  );

  //send cookies
  //check if its expensive to make another call to user database or not
  //if expensive then update the object else call the database again
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  //options for cookies
  const options = {
    httpOnly: true, //to prevent cross site scripting attacks
    secure: true, //process.env.NODE_ENV === "production", //to send cookie only in production mode
    //via secure cookie can be modified only by server not by client
    // expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), //7 days expiry time
    // sameSite: "none", //to send cookie in cross site requests
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, "User logged in successfully", {
        user: loggedInUser,
        accessToken,
        refreshToken,
      }),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      // $set: { refreshToken: undefined }, //to remove refresh token from db
      $unset: {
        refreshToken: 1, //this removes the field from document
      },
    },
    {
      //new: false (default): Returns the document before the update.
      //new: true: Returns the document after the update
      new: true,
    },
  );

  //options for cookies
  const options = {
    httpOnly: true, //to prevent cross site scripting attacks
    secure: true, //process.env.NODE_ENV === "production", //to send cookie only in production mode
    //via secure cookie can be modified only by server not by client
    // expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), //7 days expiry time
    // sameSite: "none", //to send cookie in cross site requests
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, null, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  //req.body for mobile phones
  const { incomingRefreshToken } = req.cookies || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorised request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const user = await User.findById(decodedToken._id);

    if (!user) {
      throw new ApiError(401, "INVALID REFRESH TOKEN");
    }

    if (user?.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "REFRESH TOKEN is expired or used");
    }

    const { accessToken, newRefreshToken } =
      await generateAccessandRefreshTokens(user._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(200, "Access token refreshed successfully", {
          accessToken,
          newRefreshToken,
        }),
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old and new passwords are required");
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Wrong Password");
  }

  user.password = newPassword;
  //before user.save user.pre will be executed hence storing encyrypted data
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

//to update file data use another controller not the same one
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  if (!fullname || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpadte(
    req.user?._id,
    {
      $set: {
        fullName: fullname,
        email,
      },
    },
    { new: true },
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const { avatarLocalPath } = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error in uploading Error");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true },
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const { converImageLocalPath } = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image is required");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error in uploading cover image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true },
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User Cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "username is required");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCounts: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCounts: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User Channel fetched successfully"),
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id), //we are passing like this bcz when we get _id
        //  then it is not the real id but string but when we get via User then it is
        // being habdled by Mongoose and so is not done when we pass in aggregation pipeline
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $projects: {
                    _id: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0]?.watchHistory,
        "Watch history fetched successfully",
      ),
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserCoverImage,
  updateUserAvatar,
  getUserChannelProfile,
  getWatchHistory,
};

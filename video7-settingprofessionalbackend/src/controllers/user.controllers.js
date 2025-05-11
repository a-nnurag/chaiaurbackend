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
  const loggedInUser = User.findById(user._id).select(
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
      new ApiResponse(200, loggedInUser, "User logged in successfully", {
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
      $set: { refreshToken: undefined }, //to remove refresh token from db
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

export { registerUser, loginUser, logoutUser,refreshAccessToken };

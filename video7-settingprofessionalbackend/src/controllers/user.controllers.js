import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  //get user data from frontend
  //to get files like avatar we have designed in router using multer middleware
  const { username, email, fullname, avatar, coverImage, password } = req.body;

  //validation if no empty form, valid email
  // if (fullname === "") {
  //   throw new ApiError(400, "fullname is required");
  // }
  //better writing practice
  if (
    [username, email, fullname, avatar, coverImage, password].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "All fields are required");
  }
  //_______________________________can have more validations like check if @is there or not

  //_______________________________check if user already exist:username,email

  //cheking if either there is a previous entry by same username or email
  const existedUser = User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exist");
  }

  //check for images
  // check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, " Avatar file is required");
  }

  //upload images to cloudinary,check if avatar is uploaded successfully or not
  try {
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
      throw new ApiError(400, "Avatar file is required");
    }
  } catch (err) {
    console.log("Error in uploading avatar on cloudinary");
  }

  //create user object-create entry in db
  const user = await User.create({
    fullName,
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
  if (createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  //return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registred successfully"));
});

export { registerUser };

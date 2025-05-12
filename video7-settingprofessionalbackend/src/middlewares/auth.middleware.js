import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";

//_____________as here res was of no need so it was replaced by _ as in production grade________
export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    console.log("cookies_____", req.cookies);
    console.log("Authorization_____", req.header("Authorization"));

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    } else {
      console.log("Token_____", token);
    }

    //verify the token
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
      console.log("Error in decoding token", error);
      throw new ApiError(401, "Invalid Access Token");
    }

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken",
    );

    if (!user) {
      //discuss about frontennd
      throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token");
  }
});

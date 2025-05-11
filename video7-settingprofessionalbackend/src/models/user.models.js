import mongoose, { mongo } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, //cloudinary url
      required: true,
    },
    coverImage: {
      type: String, //cloudinary url
    },
    watchHistory: [
      {
        type: mongoose.Schema.Types.ObjectId, //cloudinary url
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true },
);

//do not use arrow function bcz it does not have reference
// do not run eveytime run only when password is reset
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  //run this part only is field is modified
  this.password = await bcrypt.hash(this.password, 10); //10 rounds of encyryption
  next();
});

//defining custom methods in mongodb TO CHECK IF PASSWORDS ENTERED ARE CORRECT OR NOT
//this is a instance method which can be used in the instance of the model
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

//___________________________________________________________GENERATING JWT ACCESS TOKENS___________________________________________________________
userSchema.methods.generateAccessToken = async function () {
  //although we are using async function but generally jwt.sign does not require it
  return await jwt.sign(
    {
      _id: this._id,
      username: this.username,
      email: this.email,
      fullname: this.fullname,
      avatar: this.avatar,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    },
  );
};

userSchema.methods.generateRefreshToken = async function () {
  //although we are using async function but generally jwt.sign does not require it
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    },
  );
};

export const User = mongoose.model("User", userSchema);

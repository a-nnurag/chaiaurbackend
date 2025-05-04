import mongoose from "mongoose";
import dotenv from "dotenv";
import { DB_NAME } from "../constants.js";

//async DB is in another continent
const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`,
    );
    console.log(`MongoDB connected: ${connectionInstance.connection.host}`);
  } catch (err) {
    console.log("Error in connecting to database", err);
    //study exit codes
    process.exit(1); // 1 is a generic error code
    // 0 is a success code
  }
};

export default connectDB;

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

//app.use is for middlewares and configurations
app.use(
  cors({
    origin: process.env.CORS_ORIGIN, //read cors documentation
    credentials: true,
  }),
);

//to limit maximum size of receiving json file is 16kb
app.use(express.json({ limits: "16kb" }));

//for receiving url
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

//to store/access static files
app.use(express.static("public"));

//to store and access cookie in user browser
app.use(cookieParser());

export { app };

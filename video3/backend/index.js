//module js format of importing
//import express from "express";
//common js format of importing
// const express = require("express");

//module is asynchronius while common js is synchronous
// to resolve this set type in package.json to module

import express from "express";
import dotenv from "dotenv";
const app = express();
const port = process.env.PORT || 5000;
dotenv.config();

app.get("/", (req, res) => {
  res.send("Server is ready");
});

//get a list of 5jokes
app.get("/api/jokes", (req, res) => {
  const jokes = [
    {
      id: 1,
      title: "a joke",
      content: "This is a joke",
    },
    {
      id: 2,
      title: "a joke",
      content: "This is a joke",
    },
    {
      id: 3,
      title: "a joke",
      content: "This is a joke",
    },
    {
      id: 4,
      title: "a joke",
      content: "This is a joke",
    },
  ];
  res.send(jokes);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

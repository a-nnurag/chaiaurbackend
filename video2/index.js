require("dotenv").config();

const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/twitter", (req, res) => {
  res.send("Hi twitter");
});

//To implement this hot reloading is required so use nodemon
app.get("/login", (req, res) => {
  res.send(
    "<h1>To implement this hot reloading is required use use nodemon</h1>"
  );
});

app.listen(process.env.PORT, () => {
  console.log(`Example app listening on port ${port}`);
});

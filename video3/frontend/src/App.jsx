import { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

function App() {
  const [jokes, setJokes] = useState([]);

  useEffect(() => {
    axios //server will think that it is a request from the same url i.e. localhost:5173 and not localhost:5000
      // proxy is defined in vite.config.js
      .get("/api/jokes")
      .then((res) => {
        setJokes(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  });

  return (
    <div>
      <h1>Backend aur bakchodi</h1>
      <p>JOKES:{jokes.length}</p>
      {jokes.map((joke, index) => {
        return (
          <div key={index}>
            <div>{joke.id}</div>
            <div>{joke.title}</div>
            <div>{joke.content}</div>
          </div>
        );
      })}
    </div>
  );
}

export default App;

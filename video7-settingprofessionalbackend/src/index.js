import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "../.env",
});

const port = process.env.PORT || 8000; //if port is not defined in .env file, it will take 8000 as default port

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is listening at port ${port}`);
    });
  })
  .catch((err) => {
    console.log("Error in connecting to db", err);
  });

//_________________________________________NOT SO PREFFERED APPROACH__________________________________________
// (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);

//     app.on("error", (err) => {
//       console.log("Error in server", err);
//     });

//     app.listen(process.env.PORT, () => {
//       console.log(`Server is running on port ${process.env.PORT}`);
//     });
//   } catch (err) {
//     console.log("Error in connecting to database", err);
//   }
// })();

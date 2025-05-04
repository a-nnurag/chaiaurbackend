import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
const port = process.env.PORT || 4000;

dotenv.config({
  path: "./env",
});

connectDB()
  .then(() => {
    app.listen((port) => {
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

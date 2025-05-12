import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const deleteOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload the file on cloudinary
    const response = await cloudinary.uploader.destroy(localFilePath, {
      resource_type: "auto",
    });
    // cloudinary.v2.uploader.destroy(public_id, options).then(callback);
    //file has been uploaded on cloudinary
    console.log("File has been deleted on cloudoinary", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (err) {
    //as we know that fileis on our server so we will delete it first else there would be many corrupt files on the server
    fs.unlinkSync(localFilePath); //delete the file from our server
    console.log(err);
  }
};

export { deleteOnCloudinary };

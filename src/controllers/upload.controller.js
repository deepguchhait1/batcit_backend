import { Readable } from "stream";

import { upsertStreamUser } from "../lib/stream.js";
import cloudinary from "../lib/cloudinary.js";
import User from "../models/User.js";

const uploadBufferToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );

    Readable.from(buffer).pipe(uploadStream);
  });

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "chat-app",
      resource_type: "image",
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profilePic: uploadResult.secure_url },
      { new: true },
    );

    if (updatedUser) {
      await upsertStreamUser({
        id: updatedUser._id.toString(),
        name: updatedUser.fullName,
        image: updatedUser.profilePic || "",
      });
    }

    return res.status(200).json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      user: updatedUser,
    });
  } catch (error) {
    console.log("Error in uploadImage controller", error.message);
    return res.status(500).json({ message: "Image upload failed" });
  }
};
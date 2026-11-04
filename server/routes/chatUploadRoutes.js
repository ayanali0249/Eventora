const express = require("express");

const router = express.Router();

const multer = require("multer");

const cloudinary = require("../config/cloudinary");
const authMiddleware = require("../middleware/authMiddleware");

const storage = multer.memoryStorage();

// Same 5MB / images-only limit as the general upload route.
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }
    }
});

router.post(

    "/",

    authMiddleware,

    (req, res, next) => {
        upload.single("file")(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message || "Upload failed"
                });
            }
            next();
        });
    },

    async (req, res) => {

        try {

            const file =
                req.file;

            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: "No file uploaded"
                });
            }

            const result =
                await cloudinary.uploader.upload(

                    `data:${file.mimetype};base64,${
                        file.buffer.toString(
                            "base64"
                        )
                    }`,

                    {
                        folder:
                            "eventora-chat"
                    }

                );

            res.json({

                success: true,

                fileUrl:
                    result.secure_url

            });

        } catch (error) {

            console.log(error);

            res.status(500).json({

                success: false,

                message: "Something went wrong. Please try again."

            });

        }

    }

);

module.exports = router;
const multer = require("multer");

const storage = multer.memoryStorage();

// Only accept images, and cap size at 5MB so a bad upload can't hang the
// request or eat the project's Cloudinary quota.
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

module.exports = upload;
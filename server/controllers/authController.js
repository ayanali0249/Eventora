const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const testAuth = (req, res) => {
    res.json({
        success: true,
        message: "Auth route working"
    });
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const registerUser = async (req, res) => {

    try {

        const { name, email, phone, password, role } = req.body;

        // Check missing fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields"
            });
        }

        // Validate email format
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address"
            });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        // Validate role
        if (role && !["customer", "vendor"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Role must be either customer or vendor"
            });
        }

        // Check existing user
        const existingUser = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "User already exists"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const newUser = await pool.query(
            `INSERT INTO users 
            (name, email, phone, password, role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, email, role`,
            [
                name,
                email,
                phone,
                hashedPassword,
                role || "customer"
            ]
        );

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: newUser.rows[0]
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });

    }

};

const loginUser = async (req, res) => {

    try {

        const { email, password } = req.body;

        // Check missing fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter email and password"
            });
        }

        // Check user exists
        const userResult = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = userResult.rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // A suspended account (set via the admin panel) cannot log back in.
        if (user.is_banned) {
            return res.status(403).json({
                success: false,
                message: user.ban_reason
                    ? `Your account has been suspended: ${user.ban_reason}`
                    : "Your account has been suspended"
            });
        }

        // Generate token
        // FIXED: this token used to carry only id + role. The chat system
        // (Socket.io) identifies the authenticated sender by name for
        // display purposes, so it's included here too - avoids an extra
        // DB lookup on every single chat message.
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role,
                name: user.name
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });

    }

};

const updateProfile = async (

    req,

    res

) => {

    try {

        const userId = req.user.id;

        const {

            name,

            email

        } = req.body;

        const updatedUser = await pool.query(

            `
            UPDATE users

            SET

            name = $1,

            email = $2

            WHERE id = $3

            RETURNING

            id,

            name,

            email,

            role
            `,

            [

                name,

                email,

                userId

            ]

        );

        res.json({

            success:true,

            user:

            updatedUser.rows[0]

        });

    }

    catch(error){

        console.log(error);

        res.status(500).json({
            success: false,

            message: "Something went wrong. Please try again."
        });

    }

};

const changePassword = async (

    req,

    res

) => {

    try {

        const userId = req.user.id;

        const {

            oldPassword,

            newPassword

        } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Old and new password are required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 6 characters long"
            });
        }

        const user = await pool.query(

            `
            SELECT *

            FROM users

            WHERE id = $1
            `,

            [

                userId

            ]

        );

        if (user.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const valid = await bcrypt.compare(

            oldPassword,

            user.rows[0].password

        );

        if (!valid) {

            return res.status(400).json({

                success: false,

                message:

                "Old password incorrect"

            });

        }

        const hashedPassword = await bcrypt.hash(

            newPassword,

            10

        );

        await pool.query(

            `
            UPDATE users

            SET password = $1

            WHERE id = $2
            `,

            [

                hashedPassword,

                userId

            ]

        );

        res.json({

            success:true,

            message:

            "Password Updated"

        });

    }

    catch(error){

        console.log(error);

        res.status(500).json({
            success: false,

            message: "Something went wrong. Please try again."
        });

    }

};

const deleteAccount = async (

    req,

    res

) => {

    try {

        const userId = req.user.id;

        await pool.query(

            `

            DELETE FROM users

            WHERE id = $1

            `,

            [

                userId

            ]

        );

        res.json({

            success:true,

            message:

            "Account deleted"

        });

    }

    catch(error){

        console.log(error);

        res.status(500).json({
            success: false,

            message: "Something went wrong. Please try again."
        });

    }

};

const updateProfileImage = async (

    req,

    res

) => {

    try {

        const userId = req.user.id;

        const {

            imageUrl

        } = req.body;

        const result = await pool.query(

            `
            UPDATE users

            SET profile_image = $1

            WHERE id = $2

            RETURNING
            *
            `,

            [

                imageUrl,

                userId

            ]

        );

        res.json({

            success:true,

            user:

            result.rows[0]

        });

    }

    catch(error){

        console.log(error);

        res.status(500).json({
            success: false,

            message: "Something went wrong. Please try again."
        });

    }

};

module.exports = {

    testAuth,

    registerUser,

    loginUser,

    updateProfile,

    changePassword,

    deleteAccount,

    updateProfileImage

};
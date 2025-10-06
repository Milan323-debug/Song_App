import express from 'express';
import User from '../models/user.model.js'; // importing the User model to interact with the database
import jwt from 'jsonwebtoken'; // importing jsonwebtoken to create and verify tokens
import { ENV } from '../config/env.js';

const router = express.Router(); // creates a new instance of the Express Router,
// which is a middleware system that allows you to organize and modularize your routes.

const generateToken = (userId) => {
    if (!ENV.JWT_SECRET) throw new Error('JWT_SECRET not set in environment');
    return jwt.sign({userId}, ENV.JWT_SECRET, {expiresIn: '14d'});
}

router.post('/register', async (req, res) => {
    try {
    const {email, username, password, profileImage } = req.body; // destructuring the request body to get username and password        
        if (!email || !username || !password) {
            return res.status(400).json({ message: 'Please fill all fields' });
        }        // Email validation
        if (!email.includes('@') || !email.includes('.')) {
            return res.status(400).json({ message: 'Please enter a valid email address' });
        }

        // Password validation
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        // Check for password complexity
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
            return res.status(400).json({ 
                message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*(),.?":{}|<>)'
            });
        }

        // Username validation
        if (username.length < 4) {
            return res.status(400).json({ message: 'Username must be at least 4 characters' });
        }

        // Username can be any case but must contain only letters and numbers
        if (!/^[a-zA-Z0-9]+$/.test(username)) {
            return res.status(400).json({ message: 'Username can only contain letters and numbers' });
        }
        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        //Get random avatar (application default) and allow client override
        const randomAvatar = `https://api.dicebear.com/9.x/open-peeps/svg`;

        // Create new user (use provided profileImage if present, otherwise default)
        const user = new User({
            email,
            username,
            password,
            profileImage: profileImage && profileImage.trim() !== '' ? profileImage : randomAvatar,
        });
        await user.save();
        const token = generateToken(user._id); // Generate a token for the user

        res.status(201).json({
            token, // Send the token back to the client
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
                createdAt: user.createdAt
            },
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password){
            return res.status(400).json({message : "All fields are required"});
        }
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User does not exist' });
        }

        // Check if password is correct
        const isPasswordCorrect = await user.comparePassword(password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = generateToken(user._id); // Generate a token for the user

        res.status(200).json({
            token, // Send the token back to the client
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
                createdAt: user.createdAt
            },
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
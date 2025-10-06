import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { ENV } from '../config/env.js';

const protectRoute = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        console.log('protectRoute: incoming auth header:', authHeader);
        if (!authHeader) return res.status(401).json({ message: 'Not authorized, no token' });

        // Support 'Bearer <token>' or raw token
        const token = authHeader && authHeader.startsWith && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
        console.log('protectRoute: extracted token present?', !!token);

        if (!token) return res.status(401).json({ message: 'Not authorized, token missing' });

        const secret = ENV.JWT_SECRET || process.env.JWT_SECRET;
        if (!secret) {
            console.error('JWT secret not configured');
            return res.status(500).json({ message: 'Server configuration error' });
        }

        // Verify the token
        const decoded = jwt.verify(token, secret);

        // Find the user by ID and attach to request (exclude password)
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) return res.status(401).json({ message: 'User not found' });

        req.user = user;
        return next();
    } catch (error) {
        console.error('Error in auth middleware:', error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

export default protectRoute;
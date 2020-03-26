const express = require('express')

//for validation
const { body } = require('express-validator/check')

//importing the user model from model created by mongoose
const User = require('../models/user')

//Import user controller by requiring it from controllers folder
const authController = require('../controllers/auth')

//Create router by calling function
const router = express.Router();

router.put('/signup', [
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email.')
        .custom((value, {req}) => {
            return User
                .findOne({email: value})
                .then(userDoc => {
                    if (userDoc) {
                        return Promise.reject('Email already exists');
                    }
                })
        })
        .normalizeEmail(),
    body('password')
        .isLength({min: 6}),
    body('name')
        .trim()
        .not()
        .isEmpty()    
], authController.signup)

router.post('/login', authController.login)

module.exports = router;
//importing the user model from model created by mongoose
const User = require('../models/user')

//bcrypt js for encrypting passwords
const bcrypt = require('bcryptjs')

//json web token requirement
const jwt = require('jsonwebtoken')

//express validator importation
const { validationResult } = require('express-validator/check');


exports.signup = (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const error = new Error('Validation Failed');
        error.statusCode = 422;
        error.data = errors.array()
        throw error;
    }
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;
    bcrypt
        .hash(password, 12)
        .then(hashedPassword => {
            const user = new User({
                email: email,
                password: hashedPassword,
                name: name
            });
            return user.save();
        })
        .then(result => {
            res.status(201).json({
                message: 'User Created',
                userId: result._id
            });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            //throw doesnt work for async code. Use next
            next(err);
        })
}

exports.login = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    let loadedUser;
    User
        .findOne({email: email})
        .then(user => {
            if(!user) {
                const error = new Error('No User with this email')
                error.statusCode = 401;
                throw error;
            }
            loadedUser = user;
            return bcrypt.compare(password, user.password)
        })
        .then(isEqual => {
            if (!isEqual) {
                const error = new Error('Wrong Password');
                error.statusCode = 401;
                throw error;
            }
            //creates a new signature and packs it into a json web token
            const token = jwt.sign(
                {
                    email: loadedUser.email,
                    userId: loadedUser._id.toString()
                }, 
                'secret', 
                { expiresIn: '1h' }
            );
            res.status(200).json({
                message: "Token Generated",
                token: token,
                userId: loadedUser._id.toString()
            })
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            //throw doesnt work for async code. Use next
            next(err);
        })
}
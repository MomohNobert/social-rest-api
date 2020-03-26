//importing file system for node.js
const fs = require('fs')

//importing path to find file path
const path = require('path')

//express validator importation
const { validationResult } = require('express-validator/check');

//importing the socketjs file
const io = require('../socket')

//importing the post model from model created by mongoose
const Post = require('../models/post')

//importing the post model from model created by mongoose
const User = require('../models/user')



//an example of asynchrous code with async & await
exports.getPosts = async (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2;
    try {
        const totalItems = await Post.find().countDocuments()
        const posts =  await Post.find()
                    .populate('creator')
                    .sort({createdAt: -1})
                    .skip((currentPage - 1) * perPage)  
                    .limit(perPage)   
        res.status(200).json({
            message: 'Posts successfully sent',
            posts: posts,
            totalItems: totalItems
        })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        //throw doesnt work for async code. Use next
        next(err);
    }

        // .catch(err => {
        //     if (!err.statusCode) {
        //         err.statusCode = 500;
        //     }
        //     //throw doesnt work for async code. Use next
        //     next(err);
        // })
    
    //DUMMY RESPONSE
    // res.status(200).json({
    //     posts : [
    //         {
    //         _id: '1',
    //         title: 'First Post!', 
    //         content: 'This is the first post!', 
    //         imageUrl: 'images/pogba.jpg',
    //         creator: {
    //             name: 'TheOkhai'
    //         },
    //         createdAt: new Date()
    //         }
    //     ]
    // });
};

exports.createPost = (req, res, next) => {
    //Creating a new errors const
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect.')
        error.statusCode = 422;
        //automatically exit function execution and reach error handling middleware
        throw error;
        // return res.status(422).json({
        //     message: 'Validation failed, entered data is incorrect.', 
        //     errors: errors.array()
        // })
    }
    if (!req.file) {
        const error = new Error('No Image Found');
        error.statusCode = 422;
        throw error;
    }
    const imageURL = req.file.path;
    const title = req.body.title;
    const content = req.body.content;
    let creator;
    //create post in db
    const post = new Post({
        title: title, 
        content: content,
        imageURL: imageURL,
        creator: req.userId,
    })
    post
        .save()
        .then(result => {
            return User.findById(req.userId)
        })
        .then(user => {
            creator = user;
            user.posts.push(post);
            return user.save();
            
        })
        .then(result => {
            io.getIO().emit('posts', {
                action: 'create',
                post: {...post._doc, creator: {_id: req.user, name: user.name}}
            })
            res.status(201).json({
                message: "Post Created Successfully",
                post: post,
                creator: {_id: creator._id, name: creator.name}
            })
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            //throw doesnt work for async code. Use next
            next(error);
        });
    
}

exports.getPost = (req, res, next) => {
    const postId = req.params.postId;
    Post
        .findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error('Could not find post');
                error.statusCode = 404;
                //if you throw an error inside of an if the next catch block will be reached
                throw error;
            }
            res.status(200).json({
                message: 'Post Fetched', 
                post: post
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

exports.updatePost = (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect.')
        error.statusCode = 422;
        //automatically exit function execution and reach error handling middleware
        throw error;
    }
    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;
    let imageURL = req.body.image;
    if (req.file) {
        imageURL = req.file.path;
    }
    if (!imageURL) {
        const error = new Error('No File Picked.')
        error.statusCode = 422;
        throw error;
    }
    Post
        .findById(postId).populate('creator')
        .then(post => {
            if (!post) {
                const error = new Error('Could not find post');
                error.statusCode = 404;
                //if you throw an error inside of an if the next catch block will be reached
                throw error;
            }
            if (post.creator._id.toString() !== req.userId.toString()) {
                const error = new Error('Not Authorized');
                error.statusCode = 403;
                throw error;
            }
            if (imageURL !== post.imageURL) {
                clearImage(post.imageURL)
            }
            post.title = title;
            post.imageURL = imageURL;
            post.content = content;
            return post.save();
        })
        .then(result => {
            io.getIO().emit('post', {
                action: 'update',
                post: result
            })
            res.status(200).json({
                message: "Post Updated", 
                post: result
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

exports.deletePost = (req, res, next) => {
    const postId = req.params.postId;
    Post
        .findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error('Could not find post');
                error.statusCode = 404;
                //if you throw an error inside of an if the next catch block will be reached
                throw error;
            }
            if (post.creator.toString() !== req.userId.toString()) {
                const error = new Error('Not Authorized');
                error.statusCode = 403;
                throw error;
            }
            //check logged in user
            clearImage(post.imageURL);
            return Post.findByIdAndRemove(postId);
        })
        .then(result => {
            return User.findById(req.userId)
        })
        .then(user => {
            user.posts.pull(postId);
            return user.save();
        })
        .then(result => {
            io.getIO().emit('post', {
                action: 'delete',
                post: postId
            })
            res.status(200).json({
                message: "Post Deleted."
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

const clearImage = filePath => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, err => console.log(err));
}
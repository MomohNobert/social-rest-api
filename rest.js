//import fs(file-system) package. Core
const fs = require('fs');

//import path package. Core
const path = require('path');

//Import Express
const express = require('express');

//usinf body parser || gain access to req body
const bodyParser = require('body-parser');

//to gain access to mongoose for db
const mongoose = require('mongoose');

//multer middleware for file uploads
const multer = require('multer');

//importing the auth controller
const auth = require('./middleware/auth')

//importing express-graphql package
const graphqlHttp = require('express-graphql')

//importing schema from graphql folder
const graphqlSchema = require('./graphql/schema')

//importing resolvers from graphql folder
const graphqlResolver = require('./graphql/resolvers')

// //registering the feed route in rest.js
// const feedRoutes = require('./routes/feed')

// //registering the user route in rest.js
// const authRoutes = require('./routes/auth')

//Launch Express  App
const app = express();
 
//configurng file storage for multer
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images')
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
})

//configuring file filter for multer
const fileFilter  = (req, file, cb) => {
    if(
       file.mimetype === 'image/png' || 
       file.mimetype === 'image/jpg' || 
       file.mimetype === 'image/jpeg'
    ) {
        cb(null, true);
    } else {
        cb(null, false);
    }
}

//different configuration for body parser. not url encoded }} || .json for applications
app.use(bodyParser.json());
//register multer for use
app.use(
    multer({storage: fileStorage, fileFilter: fileFilter }).single('image')
);
//setting up middleware for any request that goes to / images || dirname gives you root folder
app.use('/images/', express.static(path.join(__dirname, 'images')));

//to avoid cors error, middleware to allow serving to various clients
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});



app.use(auth);

app.put('/post-image', (req, res, next) => {
    if (!req.isAuth) {
        throw new Error('Not Authenticated')
    }
    if (!req.file) {
        return res.status(200).json({message: 'No File Provided'});
    }
    if (req.body.oldPath) {
        clearImage(req.body.oldPath)
    }
    return res.status(201).json({message: 'File Stored', filePath: req.file.path})
})


app.use(
    '/graphql', 
    graphqlHttp({
        schema: graphqlSchema,
        rootValue: graphqlResolver,
        graphiql: true,
        formatError(err) {
            if (!err.originalError) {
                return err;
            }
            const data = err.originalError.data
            const message = err.message || 'An Error Occurred'
            const code = err.originalError.code || 500
            return {message: message, status: code, data: data}
        }
    })
)

//made obsolete by graphql
//to use the feed routes
// app.use('/feed', feedRoutes);

// //to use the auth routes
// app.use('/auth', authRoutes);

//error handling middleware
app.use((error, res, req, next) => {
    console.log(error);
    const status = error.statusCode || 500;
    const message = error.message;
    const data = error.data;
    res.status(status).json({
        message: message,
        data: data
    })
})

//connecting mongoose
mongoose
    .connect(
        process.env.MONGO_URI || `mongodb://localhost:27017/NodeJSShop`
        )
    .then(result => {
        console.log("Database Connected")
        //Listen to server on Port
        app.listen(8080);
        //socket.io middleware for websockets
        // const io = require('./socket').init(server);
        // io.on('connection', socket => {
        //     console.log('Client Connected')
        // })
    })
    .catch(err => console.log(err))

const clearImage = filePath => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, err => console.log(err));
}


const mongoose = require('mongoose')
//import the schema to use schema
const Schema = mongoose.Schema;

//initialize the post schema
const postSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    imageURL: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true })

//export a model based on the schema
module.exports = mongoose.model('Post', postSchema)
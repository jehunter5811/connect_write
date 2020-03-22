const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'user'
  }, 
  website: {
    type: String
  }, 
  location: {
    type: String
  }, 
  bio: {
    type: String
  }, 
  twitterhandle: {
    type: String
  }, 
  publications: [
    {
      title: {
        type: String, 
        required: true
      }, 
      link: {
        type: String, 
        required: true
      }, 
      publication: {
        type: String, 
        required: true
      }, 
      description: {
        type: String
      }
    }
  ]
});

module.exports = Profile = mongoose.model('profile', ProfileSchema);
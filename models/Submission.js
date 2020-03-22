const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubmissionSchema = new mongoose.Schema({
  user: {
    type: Schema.Types.ObjectId, 
    ref: 'user'
  }, 
  title: {
    type: String, 
    required: true
  }, 
  storage_link: {
    type: String, 
    required: true
  }, 
  private: {
    type: Boolean, 
    default: true
  }, 
  private_id: {
    type: String, 
    required: true
  },
  name: {
    type: String
  },
  avatar: {
    type: String
  },
  reviews: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "users"
      },
      text: {
        type: String,
        required: true
      },
      name: {
        type: String
      },
      avatar: {
        type: String
      },
      storage_link: {
        type: String, 
        required: true
      }, 
      date: {
        type: Date, 
        default: Date.now
      }
    }
  ], 
  comments: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "users"
      },
      text: {
        type: String,
        require: true
      },
      name: {
        type: String
      },
      avatar: {
        type: String
      },
      date: {
        type: Date,
        default: Date.now
      }
    }
  ],
  likes: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "users"
      }
    }
  ],
  date: {
    type: Date, 
    default: Date.now
  }
});

module.exports = Submission = mongoose.model('submission', SubmissionSchema);
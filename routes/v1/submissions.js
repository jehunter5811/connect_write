const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");
const private_submission = require("../../middleware/private_submissions");
const User = require("../../models/User");
const Submission = require("../../models/Submission");
const { v4: uuidv4 } = require('uuid');

//  @route  GET v1/submissions
//  @desc   Get all public submissions
//  @access Private
router.get("/", auth, async (req, res) => {
  try {
    //  Only get submissions that are not marked as private
    const submissions = await (await Submission.find().sort({ date: -1 })).filter((submission => submission.private !== true));
    res.json(submissions);
  } catch (error) {
    console.log(error);
    res.status(500).send("Sever error");
  }
});

//  @route  GET v1/submissions/me
//  @desc   Get all logged-in user's posts
//  @access Private

router.get("/me", auth, async (req, res) => {
  try {
    //  Only get submissions for the user in question
    const submissions = await (await Submission.find().sort({ date: -1 })).filter((submission => submission.user.toString() === req.user.id));
    res.json(submissions);
  } catch (error) {
    console.log(error);
    res.status(500).send("Sever error");
  }
});

//  @route  GET v1/submissions/:id
//  @desc   Get public submission by id
//  @access Private
router.get("/:id", auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).send({ msg: "Submission not found" });
    }

    //  Check if this is a private submission && user is not the submission owner
    if(submission.private && submission.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized'})
    }

    res.json(submission);
  } catch (error) {
    console.log(error);
    if (error.kind === "ObjectId") {
      return res.status(404).send({ msg: "Submission not found" });
    }
    res.status(500).send("Sever error");
  }
});

//  @route  GET v1/submissions/:id/:private_id
//  @desc   Get private submission by id
//  @access Private
router.get("/:id/:private_id", [auth, private_submission], async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).send({ msg: "Post not found" });
    }

    res.json(submission);
  } catch (error) {
    console.log(error);
    if (error.kind === "ObjectId") {
      return res.status(404).send({ msg: "Submission not found" });
    }
    res.status(500).send("Sever error");
  }
});

//  @route  DELETE v1/submissions/:id
//  @desc   Delete a submission
//  @access Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).send({ msg: "Submission not found" });
    }

    //  Check on user
    //  Adding toString because the userId is an ObjectId, not a string
    if (submission.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    //  @TODO - Need to remove the submission PDF from S3

    await submission.remove();

    res.json({ msg: "Submission removed" });
  } catch (error) {
    console.log(error);
    if (error.kind === "ObjectId") {
      return res.status(404).send({ msg: "Submission not found" });
    }
    res.status(500).send("Sever error");
  }
});

//  @route  PUT v1/submissions/likes/:id
//  @desc   Add a like to a public post
//  @access Private

router.put('/like/:id', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if(submission.private) {
      return res.status(404).json({ msg: 'Cannot like private submissions' });
    }

    //  Check if submission has already been liked by this user
    if(submission.likes.filter(review => review.user.toString() === req.user.id).length > 0) {
      return res.status(400).json({ msg: 'Submission already liked' });
    }

    submission.likes.unshift({ user: req.user.id });

    await submission.save();

    res.json(submission.likes);
  } catch (error) {
    console.log(error);
    res.status(500).send('Server error');
  }
});

//  @route  POST v1/submissions/unlike/:id
//  @desc   Unlike a public submission
//  @access Private

router.put('/unlike/:id', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if(submission.private) {
      return res.status(404).json({ msg: 'Cannot unlike private submissions' });
    }

    //  Check if submission has already been liked by this user
    if(submission.likes.filter(like => like.user.toString() === req.user.id).length === 0) {
      return res.status(400).json({ msg: 'Post has not yet been liked' });
    }

    //  Get remove index
    const removeIndex = submission.likes.map(like => like.user.toString()).indexOf(req.user.id);

    submission.likes.splice(removeIndex, 1);

    await submission.save();

    res.json(submission.likes);
  } catch (error) {
    console.log(error);
    res.status(500).send('Server error');
  }
});

//  @route  PUT v1/submissions/reviews/:id
//  @desc   Add a review to a public post
//  @access Private

router.put(
  "/reviews/:id",
  [
    auth,
    [
      check("text", "You must provide text for your review")
        .not()
        .isEmpty(), 
      check("storage_link", "You must provide a link to the uploaded file")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select("-password");

      const submission = await Submission.findById(req.params.id);

      //  Check if submission is private
      if(submission.private) {
        return res.status(401).json({ msg: 'User not authorized' })
      }

      //  Check if user already added a review
      const alreadyReviewed = submission.reviews.filter(review => review.user.toString() === req.user.id).length > 0;

      if(alreadyReviewed) {
        return res.status(404).json({ msg: 'Submission already reviewed by this user '});
      }

      const newReview = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id, 
        storage_link: req.body.storage_link
      };

      submission.reviews.unshift(newReview);

      await submission.save();

      res.json(submission.reviews);
    } catch (error) {
      console.log(error);
      res.status(500).send("Server error");
    }
  }
);

//  @route  PUT v1/submissions/reviews/:id/:private_id
//  @desc   Add a review to a private post
//  @access Private

router.put(
  "/reviews/:id/:private_id",
  [
    [auth, private_submission],
    [
      check("text", "You must provide text for your review")
        .not()
        .isEmpty(), 
      check("storage_link", "You must provide a link to the uploaded file")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select("-password");

      const submission = await Submission.findById(req.params.id);
      
      //  Check if user already added a review
      const alreadyReviewed = submission.reviews.filter(review => review.user.toString() === req.user.id).length > 0;

      if(alreadyReviewed) {
        return res.status(404).json({ msg: 'Submission already reviewed by this user '});
      }

      const newReview = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id, 
        storage_link: req.body.storage_link
      };

      submission.reviews.unshift(newReview);

      await submission.save();

      res.json(submission.reviews);
    } catch (error) {
      console.log(error);
      res.status(500).send("Server error");
    }
  }
);

//  @route  DELETE v1/submissions/reviews/:id/:review_id
//  @desc   Deletes a review on a public submission
//  @access Private

router.delete('/reviews/:id/:review_id', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    //  Check if submission is private
    if(submission.private) {
      return res.status(401).json({ msg: 'User not authorized' })
    }

    //  Get comment from the post
    const review = submission.reviews.find(review => review.id === req.params.review_id);

    //  Check that comments exists
    if(!review) {
      return res.status(404).send({ msg: 'Review not found' });
    }

    //  Make sure the user deleting the comment is the one who made it
    if(review.user.toString() !== req.user.id) {
      return res.status(401).send({ msg: 'User not authorized' });
    }

    //  Get comment index
    const removeIndex = submission.reviews.map(review => review.user.toString()).indexOf(req.user.id);

    submission.reviews.splice(removeIndex, 1);

    await submission.save();

    res.json(submission.reviews);
  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  }
});

//  @route  DELETE v1/submissions/reviews/:id/:review_id/:private_id
//  @desc   Deletes a review on a private submission
//  @access Private

router.delete('/reviews/:id/:review_id/:private_id', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    //  Get comment from the post
    const review = submission.reviews.find(review => review.id === req.params.review_id);

    //  Check that comments exists
    if(!review) {
      return res.status(404).send({ msg: 'Review not found' });
    }

    //  Make sure the user deleting the comment is the one who made it
    if(review.user.toString() !== req.user.id) {
      return res.status(401).send({ msg: 'User not authorized' });
    }

    //  Get comment index
    const removeIndex = submission.reviews.map(review => review.user.toString()).indexOf(req.user.id);

    submission.reviews.splice(removeIndex, 1);

    await submission.save();

    res.json(submission.reviews);
  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  }
});

//  @route  PUT v1/submissions/comment/:id
//  @desc   Comments on a public submission
//  @access Private

router.put(
  "/comment/:id",
  [
    auth,
    [
      check("text", "You must provide text for your comment")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select("-password");

      const submission = await Submission.findById(req.params.id);

      //  Check if submission is private
      if(submission.private) {
        return res.status(401).json({ msg: 'User not authorized' })
      }

      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      };

      submission.comments.unshift(newComment);

      await submission.save();

      res.json(submission.comments);
    } catch (error) {
      console.log(error);
      res.status(500).send("Server error");
    }
  }
);

//  @route  POST v1/submissions/comment/:id/:private_id
//  @desc   Comments on a private submission
//  @access Private

router.put(
  "/comment/:id/:private_id",
  [
    auth, private_submission,
    [
      check("text", "You must provide text for your comment")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select("-password");

      const submission = await Submission.findById(req.params.id);

      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      };

      submission.comments.unshift(newComment);

      await submission.save();

      res.json(submission.comments);
    } catch (error) {
      console.log(error);
      res.status(500).send("Server error");
    }
  }
);

//  @route  DELETE v1/submissions/comment/:id/:comment_id
//  @desc   Deletes a comment on a public submission
//  @access Private

router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if(submission.private) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    //  Get comment from the post
    const comment = submission.comments.find(comment => comment.id === req.params.comment_id);

    //  Check that comments exists
    if(!comment) {
      return res.status(404).send({ msg: 'Comment not found' });
    }

    //  Make sure the user deleting the comment is the one who made it
    if(comment.user.toString() !== req.user.id) {
      return res.status(401).send({ msg: 'User not authorized' });
    }

    //  Get comment index
    const removeIndex = submission.comments.map(comment => comment.user.toString()).indexOf(req.user.id);

    submission.comments.splice(removeIndex, 1);

    await submission.save();

    res.json(submission.comments);
  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  }
});

//  @route  DELETE v1/posts/comment/:id/:comment_id/:private_id
//  @desc   Deletes a comment on a public submission
//  @access Private

router.delete('/comment/:id/:comment_id/:private_id', [auth, private_submission], async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    //  Get comment from the post
    const comment = submission.comments.find(comment => comment.id === req.params.comment_id);

    //  Check that comments exists
    if(!comment) {
      return res.status(404).send({ msg: 'Comment not found' });
    }

    //  Make sure the user deleting the comment is the one who made it
    if(comment.user.toString() !== req.user.id) {
      return res.status(401).send({ msg: 'User not authorized' });
    }

    //  Get comment index
    const removeIndex = submission.comments.map(comment => comment.user.toString()).indexOf(req.user.id);

    submission.comments.splice(removeIndex, 1);

    await submission.save();

    res.json(submission.comments);
  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  }
});

//  @route  PUT v1/submissions/private/:id
//  @desc   Updates whether or not a submission is private
//  @access Private

router.put("/private/:id", auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).send({ msg: "Submission not found" });
    }

    //  Check on user
    //  Adding toString because the userId is an ObjectId, not a string
    if (submission.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    //  Check private boolean
    const privateSub = submission.private;

    //  Change the status to the opposite of that it is now
    submission.private = !privateSub;

    await submission.save();

    res.json(submission);
  } catch (error) {
    console.log(error);
    if (error.kind === "ObjectId") {
      return res.status(404).send({ msg: "Submission not found" });
    }
    res.status(500).send("Sever error");
  }
});

//  @route  POST v1/submissions
//  @desc   Create a submission
//  @access Private

router.post(
  "/",
  [
    auth,
    [
      check("title", "You must provide title for your submission")
        .not()
        .isEmpty(),
      check("storage_link", "You must provide a link to the uploaded file")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select("-password");

      const newSubmission = new Submission({
        title: req.body.title,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id, 
        private_id: uuidv4(), 
        storage_link: req.body.storage_link
      });

      const submission = await newSubmission.save();

      res.json(submission);
    } catch (error) {
      console.log(error);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;

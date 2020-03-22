const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const Post = require("../../models/Post");
const Profile = require("../../models/Profile");

//  @route  GET v1/posts
//  @desc   Get all posts
//  @access Private
router.get("/", auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (error) {
    console.log(error);
    res.status(500).send("Sever error");
  }
});

//  @route  GET v1/posts/:id
//  @desc   Get post by id
//  @access Private
router.get("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).send({ msg: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    console.log(error);
    if (error.kind === "ObjectId") {
      return res.status(404).send({ msg: "Post not found" });
    }
    res.status(500).send("Sever error");
  }
});

//  @route  DELETE v1/posts/:id
//  @desc   Delete a post
//  @access Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).send({ msg: "Post not found" });
    }

    //  Check on user
    //  Adding toString because the userId is an ObjectId, not a string
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    await post.remove();

    res.json({ msg: "Post removed" });
  } catch (error) {
    console.log(error);
    if (error.kind === "ObjectId") {
      return res.status(404).send({ msg: "Post not found" });
    }
    res.status(500).send("Sever error");
  }
});

//  @route  PUT v1/posts/like/:id
//  @desc   Like a post
//  @access Private

router.put('/like/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    //  Check if post has already been liked by this user
    if(post.likes.filter(like => like.user.toString() === req.user.id).length > 0) {
      return res.status(400).json({ msg: 'Post already liked' });
    }

    post.likes.unshift({ user: req.user.id });

    await post.save();

    res.json(post.likes);
  } catch (error) {
    console.log(error);
    res.status(500).send('Server error');
  }
});

//  @route  PUT v1/posts/unlike/:id
//  @desc   Unlike a post
//  @access Private

router.put('/unlike/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    //  Check if post has already been liked by this user
    if(post.likes.filter(like => like.user.toString() === req.user.id).length === 0) {
      return res.status(400).json({ msg: 'Post has not yet been liked' });
    }

    //  Get remove index
    const removeIndex = post.likes.map(like => like.user.toString()).indexOf(req.user.id);

    post.likes.splice(removeIndex, 1);

    await post.save();

    res.json(post.likes);
  } catch (error) {
    console.log(error);
    res.status(500).send('Server error');
  }
});

//  @route  PUT v1/posts/comment/:id
//  @desc   Comments on a post
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

      const post = await Post.findById(req.params.id);

      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      };

      post.comments.unshift(newComment);

      await post.save();

      res.json(post.comments);
    } catch (error) {
      console.log(error);
      res.status(500).send("Server error");
    }
  }
);

//  @route  DELETE v1/posts/comment/:id/:comment_id
//  @desc   Deletes a comment on a post
//  @access Private

router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    //  Get comment from the post
    const comment = post.comments.find(comment => comment.id === req.params.comment_id);

    //  Check that comments exists
    if(!comment) {
      return res.status(404).send({ msg: 'Comment not found' });
    }

    //  Make sure the user deleting the comment is the one who made it
    if(comment.user.toString() !== req.user.id) {
      return res.status(401).send({ msg: 'User not authorized' });
    }

    //  Get comment index
    const removeIndex = post.comments.map(comment => comment.user.toString()).indexOf(req.user.id);

    post.comments.splice(removeIndex, 1);

    await post.save();

    res.json(post.comments);
  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  }
});

//  @route  POST v1/posts
//  @desc   Create a post
//  @access Private

router.post(
  "/",
  [
    auth,
    [
      check("text", "You must provide text for your post")
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

      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      });

      const post = await newPost.save();

      res.json(post);
    } catch (error) {
      console.log(error);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;

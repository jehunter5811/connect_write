const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { check, validationResult } = require("express-validator");
const Profile = require("../../models/Profile");
const User = require("../../models/User");

//  @route  GET v1/profile/me
//  @desc   Get current user's profile
//  @access Private
router.get("/me", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.user.id
    }).populate("user", ["name", "avatar"]);

    if (!profile) {
      return res.status(400).json({ msg: "There is no profile for this user" });
    }

    res.json(profile);
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
  res.send("Profile route");
});

//  @route  POST v1/profile
//  @desc   Create or update a user profile
//  @access Private

router.post("/", auth, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    website,
    location,
    bio,
    publications,
    twitterhandle,
    submissions
  } = req.body;

  const profileFields = {};
  profileFields.user = req.user.id;
  if (website) profileFields.website = website;
  if (bio) profileFields.bio = bio;
  if (location) profileFields.location = location;
  if (publications) profileFields.publications = publications;
  if (twitterhandle) profileFields.twitterhandle = twitterhandle;
  if (submissions) profileFields.submissions = submissions;

  try {
    let profile = await Profile.findOne({ user: req.user.id });

    if (profile) {
      //  Update profile
      profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $set: profileFields },
        { new: true }
      );

      return res.json(profile);
    }

    //  Create profile
    profile = new Profile(profileFields);
    await profile.save();
    return res.json(profile);
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }

  res.send("Profile created or updated");
});

//  @route  GET v1/profile
//  @desc   Get all profiles
//  @access Public

router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find().populate('user', ['name', 'avatar'])
    res.json(profiles);
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Sever error');
  }
});

//  @route  GET v1/profile/user/:user_id
//  @desc   Get profile by user ID
//  @access Public

router.get('/user/:user_id', async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.params.user_id }).populate('user', ['name', 'avatar'])
    
    if(!profile) {
      return res.status(400).json({ msg: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    console.log(error.message);
    if(error.kind === 'ObjectId') {
      return res.status(400).json({ msg: 'Profile not found' });
    }
    res.status(500).send('Sever error');
  }
});

//  @route  DELETE v1/profile
//  @desc   Delete profile, user, and post
//  @access Private

router.delete('/', auth, async (req, res) => {
  try {
    //  @TODO - remove user's posts

    //  Remove profile
    await Profile.findOneAndRemove({ user: req.user.id })

    //  Remove user
    await User.findOneAndRemove({ _id: req.user.id })
    res.json({ msg: 'User deleted' });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Sever error');
  }
});

//  @route  PUT v1/profile/publications
//  @desc   Update publications
//  @access Private

router.put('/publications', [auth, [
  check('title', 'Title is required').not().isEmpty(), 
  check('publication', 'Publication name is required').not().isEmpty(),
  check('link', 'Link to publication is required').not().isEmpty()
]], async (req, res) => {
  const errors = validationResult(req)
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, publication, link, description } = req.body;

  const newPub = {
    title, 
    publication, 
    link, 
    description
  }

  try {
    const profile = await Profile.findOne({ user: req.user.id });

    //  Pushed new publication into the beginning of the 
    //  array rather than the end
    profile.publications.unshift(newPub)

    await profile.save();

    res.json(profile);
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Sever error');
  }
});

//  @route  DELETE v1/profile/publications/:pub_id
//  @desc   Delete publication from profile
//  @access Private

router.delete('/publications/:pub_id', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });

    //  Get the index of publication to remove
    const removeIndex = profile.publications.map(item => item.id).indexOf(req.params.pub_id);
    
    profile.publications.splice(removeIndex, 1);

    await profile.save();

    res.json(profile);
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Sever error');
  }
});

module.exports = router;

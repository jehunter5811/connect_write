const express = require("express");
const router = express.Router();
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const { check, validationResult } = require("express-validator");

const User = require("../../models/User");

//  @route  POST api/users
//  @desc   Register User
//  @access Public

router.post(
  "/",
  [
    check("name", "Name is required")
      .not()
      .isEmpty(),
    check("email", "Please provide a valid email address").isEmail(),
    check(
      "password",
      "Please enter a password with 8 or more characters"
    ).isLength({ min: 8 })
  ],
  async (req, res) => {
    const errors = validationResult(req);

    //  Check if there are errors
    if (!errors.isEmpty()) {
      //  If there are errors, send error response
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      //  See if the user exists
      let user = await User.findOne({ email });
      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "User already exists" }] });
      }

      //  Get user's gravatar
      const avatar = gravatar.url(email, {
        s: "200", //size of image
        r: "pg", //rating of image - no adult content
        d: "mm" //return default image if no gravatar found
      });

      user = new User({
        name,
        email,
        avatar,
        password
      });

      //  Encrypt password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      //  Save user to DB
      await user.save();

      const payload = {
        user: {
          id: user.id
        }
      };

      //  Return JWT
      jwt.sign(
        payload,
        config.get("jwtSecret"),
        { expiresIn: 3600000 },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      ); //3600 in production
    } catch (err) {
      console.log(err.message);
      return res.status(500).send("Server error");
    }
  }
);

module.exports = router;

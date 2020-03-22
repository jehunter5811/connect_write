const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const { check, validationResult } = require("express-validator");
const User = require("../../models/User");

//  @route  GET api/auth
//  @desc   Test route
//  @access Public
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

//  @route  POST api/auth
//  @desc   Authenticate user and get token
//  @access Public

router.post(
  "/",
  [
    check("email", "Please provide a valid email address").isEmail(),
    check("password", "Password is required").exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);

    //  Check if there are errors
    if (!errors.isEmpty()) {
      //  If there are errors, send error response
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      //  See if the user exists
      let user = await User.findOne({ email });
      if (!user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "Invalid credentials" }] });
      }

      //  Verify salted/hashed password against user's password
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{ msg: "Imvalid credentials" }] });
      }

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

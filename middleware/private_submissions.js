const jwt = require('jsonwebtoken');
const config = require('config');
const Submission = require('../models/Submission');

module.exports = async function(req, res, next) {
  //  Get token from header
  const private_id = req.params.private_id;

  const submission = await Submission.findById(req.params.id);


  //  Check if no private_id
  if(!private_id) {
    return res.status(401).json({ msg: 'You must provide a private_id' });
  }

  //  Check if no private_id
  if(!submission) {
    return res.status(404).json({ msg: 'Submission not found' });
  }

  //  Verify private_id matches the private_id on the submission
  try {
    if(submission.private_id !== private_id) {
      res.status(401).json({ msg: 'Submission not found' });
    }

    //  Indicate that the private_id matches
    req.private_id_match = true;
    next();
  } catch(err) {
    res.status(401).json({ msg: 'Submission not found' });
  }
}
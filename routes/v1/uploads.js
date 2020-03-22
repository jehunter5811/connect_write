const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const validateUpload = require('../../middleware/validate_upload');
const config = require("config");
const { v4: uuidv4 } = require('uuid');

const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  accessKeyId: config.get('S3Key'),
  secretAccessKey: config.get('S3Secret')
});

//  @route  POST v1/uploads
//  @desc   Upload a PDF
//  @access Private

router.post('/', [auth, validateUpload], async (req, res) => {
  try {
    //  We only allow one file to be uploaded at a time
    //  So we grab the first file in the files array
    const { files } = req;
    const fileKey = Object.keys(files)[0]
    const file = files[fileKey];
    const params = {
      Bucket: config.get('bucketName'),
      Key: `${uuidv4()}.pdf`, 
      Body: file.data
    };

    // Uploading files to the bucket
    await s3.upload(params, function(err, data) {
        if (err) {
          console.log(err);
          res.status(500).send('Server error');
        }

        res.json(data.Location)
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Server error')
  }
});

//  @route  DELETE v1/uploads/:id
//  @desc   Delete a PDF
//  @access Private

router.delete('/:file_name', auth, async (req, res) => {
  try {
    const params = {
      Bucket: config.get('bucketName'),
      Key: req.params.file_name
    };

    await s3.deleteObject(params, (err, data) => {
      if(err) {
        console.log(err);
        res.status(500).send('Server error');
      }

      res.json({ msg: 'File deleted successfully' });
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Server error');
  }
});

module.exports = router;

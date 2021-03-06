const express = require('express')
const router = express.Router()
const Posting = require('../models').Posting
const PostingTags = require('../models').PostingTag
const Tags = require('../models').Tag
const User = require('../models').User
const multer = require('multer')
const path = require('path')
const greeting = require('../helpers/greeting')
const request = require('request');
const { uriBase, params } = require('../helpers/faceRecognition')


// setup storage
const storage = multer.diskStorage({
  destination: './public/uploads',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
})

// setup upload
const upload = multer({
  storage: storage
}).single('img')

router.use(function (req, res, next) {
  if (req.session.login) {
    next()
  } else {
    res.redirect('/')
  }
})

router.get('/', (req, res) => {
  Posting
    .findAll({
      include: {
        model: User
      }, order : [['id','DESC']]
    })
    .then((data) => {
      res.render('home', { data, card: req.session })
    })
    .catch((err) => {
      res.send(err)
    });
})

router.post('/', (req, res) => {

  upload(req, res, (err) => {
    if (err) {
      res.render('home', { msg: err })
    } else {
      console.log('===================>',req.file);
      if (!req.file) {
        Posting
          .findAll({
            include: {
              model: User
            }, order : [['id','DESC']]
          })
          .then((data) => {
            res.render('home', { data, msg: 'Error: No file selected!', card: req.session })
          })
          .catch((err) => {
            res.send(err)
          });
      } else {
        // console.log(req.file.path,"================");
        return Posting
          .create({
            path_directory: req.file.path,
            caption: req.body.caption,
            UserId: req.session.login.id
          })
          .then((data) => {
            return PostingTags.create({ TagId: req.body.TagId, PostingId: data.id })
          })
          .then(() => {
            res.redirect('/home')
          })
          .catch((err) => {
            // console.log(err);
            res.send(err)
          })
      }
    }
  })
})

router.post('/faceRecognition', (req, res) => {
  // res.send(req.body)
  // const imageUrl = 'http://postsfromthepath.com/wordpress/media/happy-child.jpg';
  // Request parameters.

  const params = {

    'returnFaceId': 'true',

    'returnFaceLandmarks': 'false',

    'returnFaceAttributes': 'age,gender,headPose,smile,facialHair,glasses,' +

      'emotion,hair,makeup,occlusion,accessories,blur,exposure,noise'

  };



  const options = {

    uri: uriBase,
    qs: params,
    body: '{"url": ' + '"' + req.body.link + '"}',
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': process.env.subscriptionKey
    }

  };

  request.post(options, (error, response, body) => {

    if (error) {
      console.log('Error: ', error);
      return;
    }

    let jsonResponse = JSON.stringify(JSON.parse(body), null, ' ');

    console.log('JSON Response\n');
    console.log(jsonResponse,"===================");
    
    let parsing = JSON.parse(jsonResponse)
    let array = []
    let emotions = parsing[0].faceAttributes.emotion
    let gender = parsing[0].faceAttributes.gender
    let age = parsing[0].faceAttributes.age
    array.push(emotions)
    var emotionToFind = array.map((e) => {
      let max = Object.values(e).filter(e => e > 0);
      for (let i in e) {
        if (e[i] == max) {
          return i
        }
      }
    })

    Tags.findOne({ where: { tag_name: emotionToFind[0] } })
      .then(data => {
        return PostingTags.findAll({ where: { TagId: data.id }, include: [{ model: Posting }] })
      })
      .then(alldata => {
        res.render('search', { data: alldata, emotion: emotionToFind[0], gender: gender, age: age, greeting : greeting, card: req.session , url: req.body.link })
        // res.send(alldata)
      })
      .catch(err => {
        res.send(err)
      })
  });

})


router.get('/tag/:emotion', (req, res) => {
  
  Tags.findOne({ where: { tag_name: req.params.emotion} })
    .then(data => {
      console.log(data,"=======");
      
      return PostingTags.findAll({ where: { TagId: data.id }, include: [{ model: Posting }] })
    })
    .then(alldata => {
      res.render('alltag', { data: alldata, emotion: req.params.emotion })
    })
    .catch(err => {
      res.send(err)
    })

})




router.post('/ByTag/', (req, res) => {
  
  Tags.findOne({ where: { tag_name: req.body.tag_name} })
    .then(data => {
      console.log(data,"=======");
      
      return PostingTags.findAll({ where: { TagId: data.id }, include: [{ model: Posting }] })
    })
    .then(alldata => {
      res.render('alltag', { data: alldata, emotion: req.params.emotion })
    })
    .catch(err => {
      res.send(err)
    })

})


module.exports = router
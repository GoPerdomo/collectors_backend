const aws = require('aws-sdk');
aws.config.region = 'eu-central-1';

const User = require('../models/User');
const Item = require('../models/Item');

// Config Vars
const S3_BUCKET = process.env.S3_BUCKET;

// Connects to AWS S3
const s3 = new aws.S3();


// Fetches all users from the DB and sends only the collections
const getAllCollections = (req, res, next) => {
  User.find({}, (err, users) => {
    if (err) {
      err = new Error("Collections not found"); // TODO: Refactor error
      err.status = 404;
      return next(err);
    } else {
      const collections = [];
      for (user of users) {
        for (collection of user.collections) {
          collections.push({ userId: user._id, collection });
        }
      }
      res.status(200).json(collections);
    }
  });
};

// Creates a new collection and assigns it to the user
const createCollection = (req, res, next) => {
  const { userId, collectionId } = req.params;
  const { name, info } = req.body;

  User.findById(userId, (err, user) => {
    if (err || !user) {
      err = new Error("User not found");
      err.status = 404;
      return next(err);
    } else {
      user.collections.push({ name, info });
      user.save(err => {
        if (err || !user) {
          err.status = 400;
          return next(err);
        } else {
          let selectedCollection = user.collections[user.collections.length - 1];
          Item.find({ collectionId }, (err, items) => {
            selectedCollection = selectedCollection.toObject();
            selectedCollection.items = items;
            res.status(200).json(selectedCollection);
          });
        }
      });
    }
  });
};

// Finds user and updates the selected collection
const updateCollection = (req, res, next) => {
  const { userId, collectionId } = req.params;
  const { name, info } = req.body;

  User.findById(userId, (err, user) => {
    if (err || !user) {
      err = new Error("User not found");
      err.status = 404;
      return next(err);
    } else {
      const selectedCollection = user.collections.find(collection => collection._id == collectionId);
      if (!selectedCollection) {
        err = new Error("Collection not found");
        err.status = 404;
        return next(err);
      } else {
        selectedCollection.name = name || selectedCollection.name;
        selectedCollection.info = info || selectedCollection.info;
        user.save(err => {
          if (err || !user) {
            err.status = 400;
            next(err);
          }
          res.status(200).json(selectedCollection);
        });
      }
    }
  });
};

// Finds user and deletes selected collection
const deleteCollection = (req, res, next) => {
  const { userId, collectionId } = req.params;
  User.findById(userId, (err, user) => {
    if (err || !user) {
      err = new Error("User not found");
      err.status = 404;
      return next(err);
    } else {
      user.collections.pull({ _id: collectionId });
      user.save(err => {
        if (err || !user) {
          err.status = 400;
          next(err);
        } else {
          Item.find({ collectionId }, (err, items) => {
            for (const item of items) {
              const prevPhoto = item.photo.slice(item.photo.indexOf(`items/${userId}`));
              
              s3.deleteObject({ Bucket: S3_BUCKET, Key: prevPhoto }, (err, data) => data);
              Item.findByIdAndRemove(item._id, (err, deletedItem) => {
                if (err) {
                  err.status = 400;
                  next(err);
                }
              });
            }
          })
          res.status(200).json({});
        }
      });
    }
  });
};

module.exports = {
  getAllCollections,
  createCollection,
  updateCollection,
  deleteCollection
};

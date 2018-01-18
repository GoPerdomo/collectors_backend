const jwt = require('jsonwebtoken');

const config = require('../config/config');
const User = require('../models/User');
const Item = require('../models/Item');


const assignToken = (user) =>
  jwt.sign(
    {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName
    },
    config.secret,
    {
      expiresIn: "1d"
    }
  );


// Fetches user from the DB
const getUser = (req, res, next) => {
  User.findById(req.params.userId, { password: 0, email: 0 }, (err, user) => {
    if (err) {
      err = new Error("User not found");
      err.status = 404;
      return next(err);
    } else {
      Item.find({}, (err, items) => {
        const { collections } = user;
        const newCollections = [];

        for (collection of collections) {
          const collectionId = collection._id;
          const collectionItems = items.filter(item => item.collectionId.toString() === collectionId.toString());

          collection = collection.toObject();
          collection.items = collectionItems;
          newCollections.push(collection);
        }

        user = user.toObject();
        user.collections = newCollections;

        res.status(200).json(user);
      });
    }
  });
};
// Fetches user from the DB

// Creates a new user and saves it to the DB
const signUp = (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;
  const newUser = new User({
    firstName: firstName,
    lastName: lastName,
    email: email,
    password: password
  });

  newUser.save((err) => {
    if (err) {
      err.status = 400;
      next(err);
    } else {
      const token = assignToken(newUser);
      res.status(200).json({ userId: newUser._id, token });
    }
  });
};
// Creates a new user and saves it to the DB

// Authenticates the user
const signIn = (req, res, next) => {
  User.findOne({ email: req.body.email }, (err, user) => {
    if (err || !user || req.body.password !== user.password) {
      err = new Error('Wrong email or password');
      err.status = 401;
      return next(err);
    } else {
      const token = assignToken(user);
      res.status(200).json({ userId: user._id, token });
    }
  });
}
// Authenticates the user

// Modifies the user info and saves the changes to the DB
const updateUser = (req, res, next) => {
  const { firstName, lastName, photo, email, password } = req.body;

  User.findById(req.params.userId, (err, user) => {
    if (err) return next(err);
    if (!user) return next();
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.photo = photo || user.photo;
    user.email = email || user.email;
    user.password = password || user.password;

    user.save((err) => {
      if (err) {
        err.status = 400;
        next(err);
      } else {
        const { password, email, ...newUser } = user._doc;

        res.status(200).json(newUser);
      }
    });
  });
};
// Modifies the user info and saves the changes to the DB

// Removes user from the DB
const deleteUser = (req, res, next) => {
  User.findByIdAndRemove(req.params.userId, (err, user) => {
    if (err) {
      err = new Error("User not found");
      err.status = 404;
      return next(err);
    } else {
      res.status(200).json({ message: "User deleted" });
    }
  });
}
// Removes user from the DB


module.exports = {
  getUser,
  signIn,
  signUp,
  updateUser,
  deleteUser
}

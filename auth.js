require('dotenv').config();
const passport = require('passport');
const LocalStrategy = require('passport-local');
const GitHubStrategy = require('passport-github').Strategy;
const bcrypt = require('bcrypt');
const { ObjectID } = require('mongodb');

module.exports = function (app, myDataBase) {
  passport.use(new LocalStrategy((username, password, done) => {
    myDataBase.findOne({ username: username }, (err, user) => {
      console.log(`User ${username} attempted to log in.`);
      if (err) return done(err);
      if (!user) return done(null, false);
      if (!bcrypt.compareSync(password, user.password)) {
        return done(null, false);
      }
      return done(null, user);
    });
  }));

  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/github/callback'
  }, (accessToken, refreshToken, profile, done) => {
    console.log(profile);
    const photo = profile.photos && profile.photos[0]
      ? profile.photos[0].value
      : '';
    const username = profile.username || profile.displayName || profile.id;

    myDataBase.findOneAndUpdate(
      { githubId: profile.id },
      {
        $setOnInsert: {
          githubId: profile.id,
          username: username,
          name: profile.displayName || username,
          photo: photo
        }
      },
      { upsert: true, returnOriginal: false },
      (err, result) => {
        if (err) return done(err);
        return done(null, result.value);
      }
    );
  }));

  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done(null, doc);
    });
  });
};
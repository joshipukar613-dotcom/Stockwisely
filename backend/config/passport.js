const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userRepository = require('../repositories/userRepository');

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

module.exports = (passport) => {
  // JWT Strategy
  passport.use(
    new JwtStrategy(opts, async (jwt_payload, done) => {
      try {
        const user = await userRepository.findById(jwt_payload.userId || jwt_payload.id);
        if (user) {
          return done(null, user);
        }
        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    })
  );

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const normalized = {
              id: profile.id,
              email: (profile.emails && profile.emails[0] && profile.emails[0].value) ? profile.emails[0].value : null,
              displayName: profile.displayName,
              given_name: profile.name?.givenName,
              family_name: profile.name?.familyName,
              picture: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
            };

            if (!normalized.email) {
              return done(new Error('Google profile missing email'), null);
            }

            let user = await userRepository.findByGoogleId(normalized.id);
            if (!user) {
              user = await userRepository.findByEmail(normalized.email);
              if (user) {
                user = await userRepository.update(user.id, {
                  googleId: normalized.id,
                  avatar: normalized.picture || user.avatar,
                  isEmailVerified: true,
                });
              } else {
                user = await userRepository.createFromGoogle(normalized);
              }
            }

            return done(null, user);
          } catch (error) {
            return done(error, null);
          }
        }
      )
    );
  }

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await userRepository.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

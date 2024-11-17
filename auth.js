const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(
    new GoogleStrategy(
        {
            clientID: '1032129588279-fjhfrlauc8s0d98ievv5v8o62tjm3u73.apps.googleusercontent.com',
            clientSecret: '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',
            callbackURL: 'http://localhost:5000/auth/google/callback',
        },
        (accessToken, refreshToken, profile, done) => {
            // Save user data or implement custom logic
            done(null, profile);
        }
    )
);

// Serialize and deserialize user
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

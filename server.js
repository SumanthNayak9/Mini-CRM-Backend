const express = require('express');
const passport = require('passport');
const session = require('cookie-session');
require('./auth');

const app = express();

app.use(
    session({
        name: 'session',
        keys: ['key1', 'key2'],
    })
);

app.use(passport.initialize());
app.use(passport.session());

// Google OAuth routes
app.get(
    '/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })    
);

app.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('http://localhost:3000/dashboard'); // Redirect to frontend
    }
);

// Logout route
app.get('/logout', (req, res) => {
    req.logout(err => {
        if (err) return res.send(err);
        res.redirect('/');
    });
});

// User info route
app.get('/user', (req, res) => {
    res.send(req.user || null);
});

app.listen(5000, () => console.log('Server running on http://localhost:5000'));

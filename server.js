// Biswas, Maitz, Mitterdorfer
// (c) 2020
// Moodify (for Spotify)

// =================================================================
// CONSTS

// server spefific
const domain = "https://moodify2.glitch.me/";

// spotify (environment variables in .env file!)
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = domain + "auth/";
const scopes = "user-read-private user-read-email";
// =================================================================

/*
 *  Here we inititalize express, app, https and request
 *  we need a few npm packages: express for the API, 
 *  https for https traffic 
 *  and request for making HTTP requests (GET, POST, PUT, DELETE, ..) and
 *  querystring for constructing URL parameter strings
 */
const express = require("express");
const app = express();
const https = require("https");
const request = require("request");
const querystring = require('querystring');

// =================================================================
// HTTP REQUESTS

// we want to use a static folder (pubic) that is sent to the client
app.use(express.static("public"));

/*
 *  here we handle GET requests to / (root: https://moodify2.glitch.me/)
 *  req - request object
 *  res - response object
 *  we automatically redirect the user to the spotify authorization page
 *  then spotify redirects the user to endpoint /auth
 */
app.get("/", function(req, res) {
  
  let state = generateRandomString(16);
  res.cookie('spotify_auth_state', state);
  
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scopes,
      redirect_uri: redirect_uri,
      state: state
    }));
  
});

/*
 *  here we handle GET requests to /auth (https://moodify2.glitch.me/auth)
 *  req - request object
 *  res - response object
 *  spotify redirects the user to that endpoint
 *  then we get the user's object via a GET request to the spotify web API
 *  STEPS:
 *    - get code in URI params
 *    - send POST request to API endpoint in order to get the cient's credentails
 *    - send GET request to API endpoint in order to get client's object (in JSON format)
 */
app.get("/auth", function(req, res) {
  
  // (1) get the user's client code
  let code = req.query.code || null;
  
  // (2) get the user's credentials from the API
  let authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
  };
  
  request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        let access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 
            'Authorization': 'Bearer ' + access_token 
          },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log("new user: ", body);
          
          // pass parameters also over to the browser
          res.redirect('/' + 
            body.display_name || 'no_user'+ 
            querystring.stringify({
                access_token: access_token,
                refresh_token: refresh_token
            }));
          
        });

      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  
  res.send("<h1 style='font-family: sans-serif'>Success!</h1>");
  
});

app.get('/:display_name', function(res, req) {
  res.send(res.params.display_name);
})

// =================================================================

// the app should listen for requests on the PORT specified in .env (process.env.PORT)
// after setting up the listener, callback function is called
const listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});

// =================================================================
// FUNCTIONS

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  let text = '';
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

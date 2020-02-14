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
 *  and request for making HTTP requests (GET, POST, PUT, DELETE, ..)
 */
const express = require("express");
const app = express();
const https = require("https");
const request = require("request");

// =================================================================
// HTTP requests

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
  let auth =
    "https://accounts.spotify.com/authorize?client_id=" +
    client_id +
    "&redirect_uri=" +
    redirect_uri +
    "&response_type=code";
  res.redirect(auth);
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
  // (1) 
  // get the user's client id
  let code = req.query.code;
  // log it to the console
  console.log("new client logged in: " + code);
  // (2)
  // send a GET request to the API in order to get a cuser's credentails back
  // reference: https://developer.spotify.com/documentation/web-api/reference/users-profile/get-current-users-profile/
  // API endpoint: https://api.spotify.com/v1/me
  //               + Authorization header with client_id
  let url = "https://accounts.spotify.com/api/token";
  request(url, {
    method: "POST",
    qs: {
      'grant_type': 'authorization_code',
      'code': code,
      'redirect_uri': redirect_uri,
      'client_id': client_id,
      'client_secret': client_secret
    }
  }, function(error, res, body) {
    console.log(error);
    console.log(res);
    console.log(body);
    // res.send(error + " " + body + " " + res);
  });
  // send something back to the client
   res.send('success');
});
// =================================================================

// the app should listen for requests on the PORT specified in .env (process.env.PORT)
// after setting up the listener, callback function is called
const listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});

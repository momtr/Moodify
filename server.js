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
const querystring = require("querystring");
const cookieParser = require("cookie-parser");

// =================================================================
// HTTP REQUESTS

// we want to use a static folder (public) that is sent to the client
app.use(express.static("public"));
app.use(cookieParser());

/*
 *  here we handle GET requests to / (root: https://moodify2.glitch.me/)
 *  req - request object
 *  res - response object
 *  we automatically redirect the user to the spotify authorization page
 *  then spotify redirects the user to endpoint /auth
 */
app.get("/", function(req, res) {
  let state = generateRandomString(16);
  res.cookie("spotify_auth_state", state);

  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scopes,
        redirect_uri: redirect_uri
        // state: state
      })
  );
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

  console.log("code: " + code);

  if (!code) {
    console.log("code is not there!");
    sendResponseMessage(res, 10001, "Code is not given");
    return;
  }

  // (2) get the user's credentials from the API
  let authOptions = {
    url: "https://accounts.spotify.com/api/token",
    form: {
      code: code, //user id
      redirect_uri: redirect_uri,
      grant_type: "authorization_code"
    },
    headers: {
      Authorization:
        "Basic " +
        new Buffer(client_id + ":" + client_secret).toString("base64")
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      let access_token = body.access_token,
        refresh_token = body.refresh_token;

      // use the access token to access the Spotify Web API
      console.log("user: " + body.display_name);
      res.cookie("access_token", access_token);
      res.cookie("refresh_token", refresh_token);
      res.redirect("/users");
    } else {
      console.log("error occured: ", error);
      console.log("status code of response: " + response.statusCode);
    }
  });

  // res.send("<h1 style='font-family: sans-serif'>Success!</h1>");
});

app.get("/users", function(req, res) {
  let access_token = req.cookies.access_token;
  let refresh_token = req.cookies.refresh_token;
  // get the user from the spotify API
  var options = {
    url: "https://api.spotify.com/v1/me",
    headers: {
      Authorization: "Bearer " + access_token
    },
    json: true
  };

  // use the access token to access the Spotify Web API
  request.get(options, function(error, response, body) {
    console.log(body.images[0]);
    res.send('<img src="' + body.images[0].url + '">');
  });
});

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
function generateRandomString(length) {
  let text = "";
  let possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Sends a response to the specified res parameter
 * @param  {Object} res The response object
 * @param {number} status The status code (e.g. 200 for OK)
 * @param {string} message the message being sent
 * @return {Object} data Additional parameter. The data that should be sent
 */
function sendResponseMessage(res, status, message, data) {
  if (status && message) {
    res.send(
      JSON.stringify({
        status: status,
        message: message,
        data: data
      })
    );
  }
}

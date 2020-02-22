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
const scopes = "user-read-private user-read-email user-read-recently-played";
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
const fs = require("fs");

// =================================================================
// DB

const dbFile = "./.data/sqlite.db";
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(dbFile);

// if ./.data/sqlite.db does not exist, create it, otherwise print records to console
db.serialize(() => {
  if (!exists) {
    db.run(
      "CREATE TABLE Users (id char(100) primary key, object varchar(1000), access_token varchar(255))"
    );
    console.log("New table Users created!");
  } else {
    // if the table exitst, show all entries when starting the server
    console.log('Database "Users" ready to go!');
    db.each("SELECT * from Users", (err, row) => {
      if (row) {
        console.log(row);
      }
    });
  }
});

// =================================================================
// HTTP REQUESTS

// we want to use a static folder (public) that is sent to the client
app.use(express.static("public"));
// we want to use the cookie parser for setting and getting cookies (see package.json)
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
      res.cookie("access_token", access_token);
      res.cookie("refresh_token", refresh_token);
      res.redirect("/user");
    } else {
      console.log("error occured: ", error);
      console.log("status code of response: " + response.statusCode);
      res.send("Unfortunately, we could not log you in ): ✨");
    }
  });

  // res.send("<h1 style='font-family: sans-serif'>Success!</h1>");
});

// after the user has authenticated, we want to get his profile and his songs (playlists + recently played)
app.get("/user", function(req, res) {
  let access_token = req.cookies.access_token;
  let refresh_token = req.cookies.refresh_token;
  // get the user from the spotify API
  let options = {
    url: "https://api.spotify.com/v1/me",
    headers: {
      Authorization: "Bearer " + access_token
    },
    json: true
  };

  // use the access token to access the Spotify Web API
  request.get(options, gotUserData);

  function gotUserData(error, response, body) {
    console.log("user: " + body.id);
    res.cookie(
      "profile_picture",
      body.images.length > 0 ? body.images[0].url : "no_image"
    );
    console.log("access_token: " + access_token);
    if (!error) {
      let options_playlists = {
        url: "https://api.spotify.com/v1/me/player/recently-played?limit=50",
        headers: {
          Authorization: "Bearer " + access_token
        },
        json: true
      };
      request.get(options_playlists, gotPlaylistData);
    } else console.log("Error occured!");

    // set username as a cookie
    res.cookie("user_id", body.id);

    // put into DB
    db.run(
      "INSERT INTO Users (id, object, access_token) VALUES ('" +
        body.id +
        "','" +
        JSON.stringify(body) +
        "','" +
        access_token +
        "')",
      err => {
        if (err) {
          // console.log("Error: " + err);
          db.run(
            "UPDATE Users SET access_token = '" +
              access_token +
              "' WHERE id = '" +
              body.id +
              "'",
            err => {
              if (err) {
                console.log(err);
              }
            }
          );
        } else console.log("Success (put into db)");
      }
    );
  }

  function gotPlaylistData(error, response, body) {
    // the access token may have been expired
    if (body.error && body.error.status == 401) {
      res.redirect(domain + "?message=access_token_expired");
    }
    if (!error) {
      // res.send(body);
      let tracks = body.items;
      // get the IDs of the tracks
      let ids = [];
      let track_obj = {};
      let track_names = [];
      for (let track of tracks) {
        // console.log(track);
        ids.push(track.track.id);
        track_obj[track.track.id] = track;
        console.log(track.track.name);
      }
      // res.send(ids);
      // now we call the function getSongParams with the IDs
      getSongParams(ids, track_obj);
    } else console.log("Error occured #2");
  }

  function getSongParams(ids, tracks) {
    // comma seperated-string
    let comma_ids = commaSeperatedString(ids);
    let options_params = {
      url: "https://api.spotify.com/v1/audio-features?ids=" + comma_ids,
      headers: {
        Authorization: "Bearer " + access_token
      },
      json: true
    };
    request.get(options_params, function(error, response, body) {
      // console.log(error);
      // console.log(body);
      if (!error) {
        /*
         *  Here we want to get the params of the songs
         *  Params: dancability, energy, loudness, tempo, speechiness, acousticness, instrumentalness, liveness
         */
        // the main param we use us valence
        // now we want to create timestamp -> song -> valence mappings
        let songs = {};
        let mood = [];
        for (let i of body.audio_features) {
          songs[i.id] = {
            valence: i.valence,
            energy: i.energy,
            danceability: i.danceability,
            instrumentalness: i.instrumentalness
            // track: tracks[i.id]
          };
          mood.push(i.valence);
        }
        let buffer = new Buffer(JSON.stringify(mood));
        let red_string = buffer.toString("base64");
        res.clearCookie("tracks");
        res.cookie("tracks", red_string);
        res.sendFile(__dirname + "/views/index.html");
      } else console.log("Error occured #3");
    });
  }
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

/**
 * Generates a comma-seperated string from an array, e.g. ["a", "b", "c"] => "a,b,c"
 * @param  {Array} array The array
 * @return {string} comma seperated-string from array
 */
function commaSeperatedString(array) {
  let ret = "";
  for (let i = 0; i < array.length; i++) {
    ret += array[i];
    if (i != array.length) ret += ",";
  }
  return ret;
}

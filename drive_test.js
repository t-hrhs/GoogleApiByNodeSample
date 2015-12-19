var fs = require('fs');
var aync = require('async');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.metadata'
];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'drive-nodejs-quickstart.json';

// Load client secrets from a local file.
fs.readFile('./user_info/client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Drive API.
  authorize(JSON.parse(content), downloadFiles);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

function getFileIDs(files, callback) {
  var file_ids = files.map(function(element, index, array){
    //console.log(element);
    return element.id;
  });
  callback(file_ids);
}

function downloadFile(auth,file, callback) {
  if (file.downloadUrl) {
    var accessToken = auth.credentials.access_token;
    var xhr = new XMLHttpRequest();
    xhr.responseType = "blob";
    console.log('START xhr')
    xhr.open('GET', file.downloadUrl);
    console.log(accessToken);
    xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
    xhr.onload = function() {
      callback(xhr.responseText);
    };
    /*xhr.onload = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          console.log('SUCCESS xhr');
          fs.writeFile('./hoge.txt', xhr.response);
          callback.apply(xhr.response);
        } else {
          console.error(xhr.statusText);
        }
      } else {
        console.log("test");
      }
    };*/
    xhr.onerror = function() {
      console.log('ERROR xhr');
      callback(null);
    };
    xhr.send();
  } else {
    console.log('ERROR xhr');
    callback(null);
  }
}

/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function downloadFiles(auth) {
  var service = google.drive({ version: 'v2', auth: auth});
  aync.waterfall([
    // 該当のフォルダにアクセスするgoogl apiを叩く
    function(callback) {
      service.children.list({
        //auth: auth,
        folderId: '0B0NSA59ISJnjdzhsRG1jWE55VlE',
      }, function (err, response) {
        callback(err, response);
      });
    },
    // 上記apiのレスポンスを受けて、file_idsの取得
    function(response, callback) {
      getFileIDs(response.items, function (response) {
        callback(null, response);
      });
    },
    function(response, callback) {
      var fileID = response[0];
      //console.log(fileID);
      service.files.get({
        'fileId': fileID,
      }, function (err, response) {
        callback(err, response);
      });
    },
    function(response, callback) {
      // file object
      downloadFile(auth, response, function (response){
        fs.writeFile('./hoge.tsv', response);
      });
    }
  ], function(err, response) {
    if (err) {
      console.log('The API returned an error:' + err);
      return;
    }
  });
}

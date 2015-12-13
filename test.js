var GoogleSpreadsheet = require('google-spreadsheet');

var my_sheet = new GoogleSpreadsheet('1kLjFS-uMvjfuxTpr5su_8v3AREGc96oFy6NKyqFMmRY');

var creds = require('./user_info/service_secret.json');

my_sheet.useServiceAccountAuth(creds, function(err){
    my_sheet.getInfo(function(err, sheet_info){
       console.log(sheet_info.title + ' is loaded!');
    });
})

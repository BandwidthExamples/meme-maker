var Promise = require('bluebird');
//var path = require('path');
//var Download = require('download');
var request = require('request').defaults({ encoding: null });
var Imgflipper = require('imgflipper');
var imgflipper = new Imgflipper('dtolbert', 'pw');
var bandwidth = require('node-bandwidth');
var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var http = require('http').Server(app);
app.use(bodyParser.json());
app.set('port', (process.env.PORT || 5000));

Promise.promisifyAll(imgflipper);
Promise.promisifyAll(bandwidth.Message);
Promise.promisifyAll(bandwidth.Media);
bandwidth.Client.globalOptions.userId = process.env.CATAPULT_USER_ID;
bandwidth.Client.globalOptions.apiToken = process.env.CATAPULT_API_TOKEN;
bandwidth.Client.globalOptions.apiSecret = process.env.CATAPULT_API_SECRET;

app.post('/msgcallback', function(req, res) {
	var response = {
		to: req.body.from,
		from: req.body.to,
		text: req.body.text
	};
  imgflipper.generateMemeAsync(
    61546,
    "Brace yourselves",
    req.body.text)
  .then(function (memeLocation) {
      var fileName = memeLocation.replace('http://i.imgflip.com/', '');
      return new Promise(function(resolve, reject) {
        request(memeLocation, function (err, res, buffer){
          if (err) {
            reject(err);
          }
          else {
            resolve({
              buffer: buffer,
              fileName: fileName,
              fileType: 'image/jpg'
            });
          }
        });
      });
  })
  .then(function (fileInfo) {
    var mediaLocation = 'https://api.catapult.inetwork.com/v1/users/' +
      process.env.CATAPULT_USER_ID + '/media/' + fileInfo.fileName;
    response.media = [mediaLocation];
    return bandwidth.Media.uploadAsync(
      fileInfo.fileName,
      fileInfo.buffer,
      fileInfo.fileType
    );
  })
  .then(function() {
    return bandwidth.Message.createAsync(response);
  })
	.catch(function (e) {
		console.log(e);
	});
	res.sendStatus(201); //Immediately respond to request
});

http.listen(app.get('port'), function(){
	console.log('listening on *:' + app.get('port'));
});

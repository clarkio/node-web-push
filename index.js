const express = require('express');
const webPush = require('web-push');
const bodyParser = require('body-parser');
const _ = require('lodash');
const log = console.log;

const app = express();
const port = process.env.PORT || 8626;
const runningMessage = 'Server is running on port ' + port;

// VAPID keys should only be generated only once.
var vapidKeys = {
  publicKey:
  'BNKV7LJ5IFajn46I7FWroeSCMKtyOQPAGguMCn_-mVfyVjr_pvvQn0lW_KMoOAMqEAd4qhFHZhG6GEsDTPSJJ8I',
  privateKey: 'XeVUm1IwTLWPz0ViqFpDeRTLSZ1mbnn2m8F_Az3qkH8'
};
if (vapidKeys === undefined) {
  vapidKeys = webPush.generateVAPIDKeys();
}

webPush.setVapidDetails(
  'mailto:brian@clarkio.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

var subscriptions = [];

app.use(bodyParser.json());
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

app.post('/subscribe', function (req, res) {
  const body = JSON.stringify(req.body);
  var sendMessage;
  if (_.includes(subscriptions, body)) {
    log('Subscription already stored');
    sendMessage = 'Subscription already stored';
  } else {
    subscriptions.push(body);
    log('Updated subscriptions:', subscriptions);
    sendMessage = 'Subscription stored';
  }
  res.send(sendMessage);

});

app.post('/push', function (req, res) {
  log('Body', req.body);
  // req.body.subscription
  // req.body.notificationMessage
  const pushSubscription = req.body.pushSubscription;
  const notificationMessage = req.body.notificationMessage;
  log('Current subscriptions found', subscriptions);
  log('Notification message:', notificationMessage);

  if (
    pushSubscription &&
    (typeof pushSubscription === 'string' ||
      pushSubscription instanceof String) &&
    pushSubscription.toLocaleLowerCase() === 'all'
  ) {
    subscriptions.map((subscription, index) => {
      log('Sending notification to subscription:', subscription);
      var jsonSub = JSON.parse(subscription);
      
      webPush.sendNotification(jsonSub, notificationMessage)
        .then(success => {
          res.send('Push notification published successfully');
        })
        .catch(error => {
          log(error);
        });
    });
  } else {
    log('Sending notification to subscription:', pushSubscription);
    
    webPush.sendNotification(pushSubscription, notificationMessage)
      .then(success => {
        res.send('Push notification published successfully');
      })
      .catch(error => {
        log(error);
      });
  }
});

app.listen(port, function () {
  log(runningMessage);
});

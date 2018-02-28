var backendURL = "https://example.com",
    atcode = "test";

self.addEventListener('push', function(event) {
  var payload = JSON.parse(event.data.text());
  console.log(payload);
  var message = payload.msg ? payload.msg : 'no message';

  // Here is displayed the notification
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: message
  }));
});

self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('Subscription expired');
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
    .then(function(subscription) {
      console.log('Subscribed after expiration', subscription.endpoint);
      return fetch(backendURL + '/atcodes/' + atcode + '/push', {
        method: 'post',
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });
    })
  );
});
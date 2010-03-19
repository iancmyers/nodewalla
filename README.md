Nodewalla
=========

Nodewalla is a simple library, written in Node.js, for interacting with the Gowalla API, asynchronously.

Example
-------

The example below shows the users with the most check-ins at a given user's top 10 spots.

    var sys = require('sys');
    var Nodewalla = require("./nodewalla");

    var gowalla = new Nodewalla();
    var user = 'jenwilhelm';
    gowalla.topSpots(user, function(data) {
  
      sys.puts("People with the most check-ins at " + user + "'s top spots:");
      var len = data.top_spots.length;
      for(var i = 0; i < len; i++) {
        var id = data.top_spots[i].url.split('/')[2];
        gowalla.spot(id, function(spot) {
          topUser = spot.top_10[0];
          sys.puts(spot.name + ": " + topUser.first_name + " " + topUser.last_name);
        });
      }
  
    }, 10000);
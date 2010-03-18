var http = require("http");

module.exports = Nodewalla;

function Nodewalla() {
  this.API_KEY = "c1649bce48e4487ebd7b5f3fdb098778";
  this.POOL_SIZE = 5; // Number of simultaneous HTTP requests.
  
  this.baseURL = "api.gowalla.com";  
  this.pool = [];
  this.busy = [];
  this.queue = [];
  this.requestHeaders = {
    "Host" : "api.gowalla.com",
    "Accept" : "application/json",
    "X-Gowalla-API-Key" : this.API_KEY
  }
};

Nodewalla.prototype = {
  /**
   * Fetches the information for a given user.
   *
   * @public
   * @param {String} username The Gowalla username.
   * @param {Function} callback The function to be called when the user
   *        information is retrieved. It should take one argument, which will
   *        be the user information object.
   */
  user : function(username, callback) {
    this.fetchData('/users/' + username, callback);
  },
  
  /**
   * Fetches the stamps for a given user, in order of recently visited.
   *
   * @public
   * @param {String} username The Gowalla username.
   * @param {Function} callback The function to be called when the stamps are
   *        retrieved. It should take one argument, which will be the stamps
   *        object.
   * @param {Number} limit The number of stamps to return. Limit will default
   *        to 20 if it is undefined.
   */
  stamps : function(username, callback, limit) {
    if(!limit) limit = 20;
    this.fetchData('/users/' + username + '/stamps?limit=' + limit, callback);
  },
  
  /**
   * Fetches the 10 spots a user most frequently checks in to.
   *
   * @public
   * @param {String} username The Gowalla username.
   * @param {Function} callback The function to be called when the spots are
   *        retrieved. It should take one argument, which will be the spots
   *        object.
   */
  topSpots : function(username, callback) {
    this.fetchData('/users/' + username + '/top_spots', callback);
  },
  
  /**
   * Fetches the spot in a given radius of a given latitude and longitude.
   *
   * @public
   * @param {String} lat The latitude of the location.
   * @param {String} lng The longitude of the location.
   * @param {String} radius The radius from the location you'd like to include.
   * @param {Function} callback The function to be called when the spots are
   *        retrieved. It should take one argument, which will be the spots
   *        object.
   */
  list : function(lat, lng, radius, callback) {
    this.fetchData('/spots?lat=' + lat + '&lng=' + lng + '&radius=' + radius, callback);
  },
  
  /**
   * Fetches the information for a specific spot.
   *
   * @public
   * @param {String} id The ID of the spot.
   * @param {Function} callback The function to be called when the spot is
   *        retrieved. It should take one argument, which will be the spot
   *        object.
   */
  spot : function(id, callback) {
    this.fetchData('/spots/' + id, callback);
  },
  
  /**
   * Fetches the events for a given spot.
   *
   * @public
   * @param {String} id The ID of the spot.
   * @param {Function} callback The function to be called when the events are
   *        retrieved. It should take one argument, which will be the events
   *        object.
   */
  events : function(id, callback) {
    this.fetchData('/spots/' + id + '/events', callback);
  },
  
  /**
   * Fetches the items that are at a given spot.
   *
   * @public
   * @param {String} id The ID of the spot.
   * @param {Function} callback The function to be called when the items are
   *        retrieved. It should take one argument, which will be the items
   *        object.
   */
  items : function(id, callback) {
    this.fetchData('/spots/' + id + '/items', callback);
  },
  
  /**
   * Fetches the information for all of the Gowalla categories.
   *
   * @public
   * @param {Function} callback The function to be called when the categories
   *        are retrieved. It should take one argument, which will be the 
   *        categories object.
   */
  categories : function(callback) {
    this.fetchData('/categories', callback);
  },
  
  /**
   * Fetches the information for a given category.
   *
   * @public
   * @param {String} id The ID of the category.
   * @param {Function} callback The function to be called when the category is
   *        retrieved. It should take one argument, which will be the category
   *        object.
   */  
  category : function(id, callback) {
    this.fetchData('/categories/' + id, callback);
  },
  
  /**
   * Fetches the information for a given item.
   *
   * @public
   * @param {String} id The ID of the item.
   * @param {Function} callback The function to be called when the item is
   *        retrieved. It should take one argument, which will be the item
   *        object.
   */
  item : function(id, callback) {
    this.fetchData('/items/' + id, callback);
  },
  
  /**
   * Fetches a list of trips.
   *
   * @public
   * @param {Function} callback The function to be called when the trips are
   *        retrieved. It should take one argument, which will be the trips
   *        object.
   */
  trips : function(callback) {
    this.fetchData('/trips', callback);
  },
  
  /**
   * Fetches the information for a given trip.
   * 
   * @public
   * @param {String} id The ID of the trip.
   * @param {Function} callback The function to be called when the trip is
   *        retrieved. It should take one argument, which will be the trip
   *        object.
   */
  trip : function(id, callback) {
    this.fetchData('/trips/' + id, callback);
  },
  
  /**
   * Sets the user to be authenticated on each API request.
   *
   * @public
   * @param {String} username The username of the user.
   * @param {String} password The password of the user.
   */
  setUser : function(username, password) {
    this.requestHeaders.Authorization = "Basic " + this.encode(username + ':' + password);
  },
  
  /**
   * Fetches the data from Gowalla and fires the callback function. If there
   * are requests in the queue after the callback is fired, queue servicing
   * is initiated.
   *
   * @private
   * @param {String} path The path for the API call.
   * @param {function} callback The callback to be fired when the data is
   *        received.
   */
  fetchData : function(path, callback) {
    this.getClient(function(spot) {
      var gowalla = this.busy[spot];
      var request = gowalla.request("GET", path, this.requestHeaders);
      var data = '';
      
      var self = this
      request.addListener('response', function(response) {
        response.setBodyEncoding("utf8");
        response.addListener("data", function (chunk) {
          data += chunk;
        });

        response.addListener("end", function() {
          callback.call(self, JSON.parse(data));
          self.pool.push(self.busy.splice(spot, 1)[0]);
          
          if(self.queue.length) {
            self.serviceQueue();
          }
        });
      });
      request.close();
    });
  },
  
  /**
   * Gets an HTTP client for the request or, if one is unavailable the callback
   * is pushed onto the queue.
   *
   * @private
   * @param {Function} callback The function that will add the request to the 
   *        client once the client is ready.
   */
  getClient : function(callback) {
    if(!this.queue.length) {
      var client = this.findAvailableClient();
            
      if(client) {
        this.busy.push(client);
        callback.call(this, this.busy.length - 1);
      } else {
        this.queue.push(callback);
      }
    } else {
      this.queue.push(callback);
    }
  },
  
  /**
   * Attempts to find an available client.
   *
   * @private
   * @returns {Object | null} The client object or null, if no clients are
   *        available.
   */
  findAvailableClient : function() {
    var client = null;
    if(this.pool.length) {
      client = this.pool.splice(0,1)[0];
    } else if(!this.pool.length && this.busy.length < this.POOL_SIZE) {
      client = http.createClient(80, this.baseURL);
    }
    return client;
  },
  
  /**
   * Grabs the next available client and pops a getClient callback off of the
   * queue and fires the callback.
   *
   * @private
   */
  serviceQueue : function() {
    if(this.pool.length) {
      var callback = this.queue.splice(0,1)[0];
      var client = this.pool.splice(0,1)[0];
      this.busy.push(client);
      callback.call(this, this.busy.length - 1);
    }
  },
  
  /**
   * Base64 encodes a string.
   *
   * @private
   * @param {String} input The string to be encoded.
   * @returns {String} The encoded string.
   */
  encode : function (input) {
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;
    var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    while (i < input.length) {
      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);

      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;

      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }

      output = output +
      keyStr.charAt(enc1) + keyStr.charAt(enc2) +
      keyStr.charAt(enc3) + keyStr.charAt(enc4);
    }
    return output;
  }
};

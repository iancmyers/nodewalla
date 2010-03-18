var http = require("http");

module.exports = Nodewalla;

function Nodewalla() {
  this.API_KEY = "c1649bce48e4487ebd7b5f3fdb098778";
  this.POOL_SIZE = 5;
  
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
   * @param {Function} callback Then function to be called when the spots are
   *        retrieved. It should take one arguement, which will be the spots
   *        object.
   */
  topSpots : function(username, callback) {
    this.fetchData('/users/' + username + '/top_spots', callback);
  },
  
  list : function(lat, lng, radius, callback) {
    this.fetchData('/spots?lat=' + lat + '&lng=' + lng + '&radius=' + radius, callback);
  },
  
  spot : function(id, callback) {
    this.fetchData('/spots/' + id, callback);
  },
  
  events : function(id, callback) {
    this.fetchData('/spots/' + id + '/events', callback);
  },
  
  items : function(id, callback) {
    this.fetchData('/spots/' + id + '/items', callback);
  },
  
  categories : function(callback) {
    this.fetchData('/categories', callback);
  },
  
  category : function(id, callback) {
    this.fetchData('/categories/' + id, callback);
  },
  
  item : function(id, callback) {
    this.fetchData('/items/' + id, callback);
  },
  
  trips : function(callback) {
    this.fetchData('/trips', callback);
  },
  
  trip : function(id, callback) {
    this.fetchData('/trips/' + id, callback);
  },
  
  setUser : function(username, password) {
    this.requestHeaders.Authorization = "Basic " + this.encode(username + ':' + password);
  },
  
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
  
  findAvailableClient : function() {
    var client = null;
    if(this.pool.length) {
      client = this.pool.splice(0,1)[0];
    } else if(!this.pool.length && this.busy.length < this.POOL_SIZE) {
      client = http.createClient(80, this.baseURL);
    }
    return client;
  },
  
  serviceQueue : function() {
  
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

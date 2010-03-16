var sys = require("sys"),
  http = require("http");

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
}

Nodewalla.prototype = {
  user : function(username, callback) {
    this.fetchData('/users/' + username, callback);
  },
  
  stamps : function(username, callback, limit) {
    if(!limit) limit = 20;
    this.fetchData('/users/' + username + '/stamps?limit=' + limit, callback);
  },
  
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
  
  fetchData : function(path, callback) {
    this.getClient(function(spot) {
      var gowalla = this.busy[spot];
      sys.puts("REQUEST: " + this.baseURL + path);
      var request = gowalla.request("GET", path, this.requestHeaders);
      var data = '';
      
      var self = this
      request.addListener('response', function(response) {
        sys.puts("HEADERS: " + JSON.stringify(response.headers));
        response.setBodyEncoding("utf8");
        response.addListener("data", function (chunk) {
          data += chunk;
        });

        response.addListener("end", function() {
          callback.call(self, JSON.parse(data));
          var free = self.busy.splice(spot, 1);
          self.pool.push(free);
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
        setTimeout(this.serviceQueue,20);
      }
    } else {
      this.queue.push(callback);
    }
  },
  
  findAvailableClient : function() {
    var client = null;
    if(this.pool.length) {
      client = this.pool.splice(0,1);
    } else if(!this.pool.length && this.busy.length < this.POOL_SIZE) {
      client = http.createClient(80, this.baseURL);
    }
    return client;
  },
  
  serviceQueue : function() {
    if(this.pool.length) {
      var callback = this.queue.splice(0,1);
      var client = this.pool.splice(0,1);
      this.busy.push(client);
      callback.call(this, this.busy.length - 1);
    }
    
    if(this.queue.length) {
      setTimeout(this.serviceQueue,20);
    }
  },
  
  setUser : function(username, password) {
    this.pool = [];
    this.baseURL = username + ':' + password + '@api.gowalla.com';
  }
}
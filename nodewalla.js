var sys = require("sys"),
  http = require("http");

function Nodewalla() {
  this.API_KEY = "c1649bce48e4487ebd7b5f3fdb098778";
  this.BASE_URL = "api.gowalla.com";
  this.POOL_SIZE = 5;
  this.REQUEST_HEADERS = {
    "Host" : this.BASE_URL,
    "Accept" : "application/json",
    "X-Gowalla-API-Key" : this.API_KEY
  }
  
  this.pool = [];
  this.busy = [];
  this.queue = [];
}

Nodewalla.prototype = {
  user : function(username, callback) {
    this.fetchData('/users/' + username, callback);
  },
  
  fetchData : function(path, callback) {
    this.getClient(function(spot) {
      var gowalla = this.busy[spot];
      var request = gowalla.request("GET", path, this.REQUEST_HEADERS);
      var data = '';
      
      var self = this
      request.addListener('response', function(response) {
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
      var client = findAvailableClient();
            
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
      client = http.createClient(80, this.BASE_URL);
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
  }
}

var go = new Nodewalla();
go.user('iancmyers', function(user) {
  sys.puts(JSON.stringify(user));
});
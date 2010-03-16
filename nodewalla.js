var sys = require("sys"),
  http = require("http");

function Nodewalla() {
  this.API_KEY = "c1649bce48e4487ebd7b5f3fdb098778";
  this.BASE_URL = "api.gowalla.com";
  this.POOL_SIZE = 5;
  this.REQUEST_HEADERS = {
    "Host" : "api.gowalla.com",
    "Accept" : "application/json",
    "X-Gowalla-API-Key" : this.API_KEY
  }
  
  this.pool = [];
  this.busy = [];
}

Nodewalla.prototype = {
  user : function(username) {
    this.fetchData('/users/' + username);
  },
  
  fetchData : function(path) {
    var client = this.getClient();
    var index = client[1];
    var gowalla = client[0];
    var self = this;
    sys.puts(this.BASE_URL + path);
    var request = gowalla.request("GET", this.BASE_URL + path, this.REQUEST_HEADERS);
    
    request.addListener('response', function(response) {
      response.setBodyEncoding("utf8");
      response.addListener("data", function (chunk) {
        sys.puts("BODY: " + chunk);
      });
      
      response.addListener("end", function() {
        self.busy.splice(index,1);
        self.pool.push(gowalla);
      });
    });
    request.close();
  },
  
  getClient : function() {
    var client = false;
    
    if(this.pool.length) {
      client = this.pool.splice(0,1);
    } else if(!this.pool.length && this.busy.length < this.POOL_SIZE) {
      client = http.createClient(80, this.BASE_URL);
    }
    
    if(client) {
      this.busy.push(client);
      var index = this.busy.length - 1;
      return [this.busy[index], index];
    } else {
      return this.getClient();
    }
  }
}

var go = new Nodewalla();
go.user('iancmyers');
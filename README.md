Nodewalla
=========
    
    var Nodewalla = require('./nodewalla');
    
    var gowalla = new Nodewalla();
    gowalla.user("iancmyers", function(user) {
      sys.puts(JSON.stringify(user));      
    });
var ServerClientRequire;

ServerClientRequire = function($) {
  var Lock, ServerClient;
  Lock = (function() {
    function Lock(accept_logs) {
      this.accept_logs = accept_logs != null ? accept_logs : false;
      this._locks = {};
    }

    Lock.prototype.trylock = function(url, name, _func) {
      var key;
      key = this.hash(url, name);
      if (!!this._locks[key]) {
        if (this.accept_logs) {
          console.warn("tryLock " + url + " " + name);
        }
      } else {
        this._locks[key] = _func();
      }
      return this._locks[key];
    };

    Lock.prototype.unlock = function(url, name) {
      var key;
      if (url == null) {
        url = "";
      }
      if (name == null) {
        name = "";
      }
      key = this.hash(url, name);
      if (!!this._locks[key]) {
        this._locks[key] = null;
        return true;
      } else {
        if (this.accept_logs) {
          console.warn("unlock " + url + " " + name);
        }
        return false;
      }
    };

    Lock.prototype.hash = function(url, name) {
      url || (url = "");
      name || (name = "");
      return "" + name + url;
    };

    return Lock;

  })();
  return ServerClient = (function() {
    ServerClient.version = "0.0.5";

    function ServerClient(options) {
      if (options == null) {
        options = {};
      }
      this.lock = new Lock({
        accept_logs: options.accept_logs
      });
      this.initialize.apply(this, arguments);
    }

    ServerClient.prototype.initialize = function() {};

    ServerClient.prototype._isServer = function() {
      return true;
    };

    ServerClient.prototype._ajax = function(options, async) {
      var lockname, url;
      lockname = options.type + options.lock;
      url = options.url;
      options.lock = null;
      return this.lock.trylock(url, lockname, (function(_this) {
        return function() {
          options.stub = null;
          return $.ajax(options).done(function(data, info, options) {
            if (options.status === 204) {
              return async.resolve(data);
            } else if (!data || data.result === "error") {
              return async.reject(data);
            } else {
              return async.resolve(data);
            }
          }).fail(function(err) {
            return async.reject(err);
          }).always(function() {
            return _this.lock.unlock(url, lockname);
          });
        };
      })(this));
    };

    ServerClient.prototype.ajax = function(options) {
      var async;
      async = $.Deferred();
      options || (options = {});
      if (this._isServer()) {
        this._ajax(options, async);
      } else {
        if (options.stub != null) {
          if (typeof options.stub === "function") {
            options.stub(async);
          }
        } else {
          this._ajax(options, async);
        }
      }
      return async.promise();
    };

    ServerClient.prototype.get = function(options) {
      options || (options = {});
      options.type = "GET";
      return this.ajax(options);
    };

    ServerClient.prototype.post = function(options) {
      options || (options = {});
      options.type = "POST";
      return this.ajax(options);
    };

    ServerClient.prototype.put = function(options) {
      options || (options = {});
      options.type = "PUT";
      return this.ajax(options);
    };

    ServerClient.prototype.patch = function(options) {
      options || (options = {});
      options.type = "PATCH";
      return this.ajax(options);
    };

    ServerClient.prototype["delete"] = function(options) {
      var async;
      options || (options = {});
      async = $.Deferred();
      options.type = "DELETE";
      return this.ajax(options);
    };

    return ServerClient;

  })();
};

if ((typeof define === 'function') && (typeof define.amd === 'object') && define.amd) {
  define(["jquery"], function($) {
    return ServerClientRequire($);
  });
} else {
  window.ServerClient = ServerClientRequire(jQuery || $);
}

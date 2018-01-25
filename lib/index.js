var mongoose = require('mongoose');
var ShortId = require('./generator');

var defaultSave = mongoose.Model.prototype.save;

mongoose.Model.prototype.save = function(options, fn) {
    var isPromise;
    if (typeof options === 'function') {
        fn = options;
        options = undefined;
    }

    if (typeof fn == "undefined") {
        isPromise = true;
    }

    if (this.isNew && this._id === undefined) {
        var idType = this.schema.tree['_id'];

        if (idType === ShortId || idType.type === ShortId) {
            var idInfo = this.schema.path('_id');
            var retries = 5;
            var self = this;

            var deferred = new Promise((resolve, reject) => {
                (function attemptSave() {
                    idInfo.generator(idInfo.len, function(err, id) {
                        if (err) {
                            fn && fn(err);
                            reject(err);
                            return;
                        }
                        self._id = id;
                        defaultSave.call(self,options, function(err, obj) {
                            if (err && err.code == 11000 && err.errmsg.indexOf('_id') !== -1 && retries > 0) {
                                --retries;
                                attemptSave();
                            } else {
                                fn && fn(err, obj);
                                if(err){
                                    reject(err);
                                }else{
                                    resolve(obj);
                                }
                            }
                        });
                    });
                })();
            });

            return isPromise && deferred;
        }
    }

    return defaultSave.call(this,options, fn);
};

module.exports = exports = ShortId;
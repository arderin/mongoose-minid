var mongoose = require('mongoose');
var ShortId = require('./generator');

var defaultSave = mongoose.Model.prototype.save;

mongoose.Model.prototype.save = function(cb) {
    var isPromise;
    if (typeof cb == "undefined") {
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
                            cb && cb(err);
                            reject(err);
                            return;
                        }
                        self._id = id;
                        defaultSave.call(self, function(err, obj) {
                            if (err && err.code == 11000 && err.errmsg.indexOf('_id') !== -1 && retries > 0) {
                                --retries;
                                attemptSave();
                            } else {
                                cb && cb(err, obj);
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

    return defaultSave.call(this, cb);
};

module.exports = exports = ShortId;
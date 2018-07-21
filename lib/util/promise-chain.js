'use strict';

/**
 * Synchronize and throttle async work
 */
class PromiseChain {
    constructor() {
        this.ctx = { abort: false, aborted_at: null, results: {} };
        this._promise = Promise.resolve(this.ctx);
        this.throttle = 0;
        this._step_id = null;
    }

    /**
     * 
     * @param {number} ms 
     * @return {PromiseChain}
     */
    setThrottle(ms) {
        this.throttle = ms;
        return this;
    }

    chainResults() {
        return this.ctx.results;
    }

    abortedId() {
        return this.ctx.aborted_at;
    }

    /**
     * 
     * @param {function} f 
     * @param {object} step_data 
     * @return {PromiseChain}
     */
    link(f, step_data) {
        var self = this;
        var hnd = function(f, step_data) {
            var lp = new Promise((resolve) => {
                if (self.ctx.abort) return resolve(self.ctx);

                setTimeout(() => {
                    var done = PromiseChain.prototype.done.bind(self, resolve);
                    if (step_data.id) self._step_id = step_data.id;

                    f.apply(self, [step_data, done]);
                }, self.throttle);
            });

            return lp;
        };

        this._promise = this._promise.then(hnd.bind(this, f, step_data));

        return this;
    }

    done(resolve, succ) {
        if (typeof succ == 'undefined') succ = null;

        if (this._step_id) this.ctx.results[this._step_id] = succ;

        if (succ === false) {
            this.ctx.abort = true;
            if (this._step_id) this.ctx.aborted_at = this._step_id;
        }

        resolve(this.ctx);
    }

    /**
     * @return {Promise}
     */
    run() {
        var self = this;

        return new Promise((resolve, reject) => {

            self._promise.then((ctx) => {
                if (ctx.abort) reject(self);
                else resolve(self);
            });

        });
    }
}

module.exports = PromiseChain;
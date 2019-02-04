"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise = require("./promise");
const fp_1 = require("./fp");
class Observable {
    constructor() {
        // -----
        // State
        // -----
        this.completed = false;
        this.queue = [];
        this.parallel = 0;
        // -------------
        // Subscriptions
        // -------------
        this.subscriptions = [];
        this.endHandlers = [];
        this.errorHandlers = [];
        this.activeTasks = {};
        this.getId = uniqueId();
    }
    // --------
    // Creators
    // --------
    static create(creator) {
        const obs = new Observable();
        // Create on next frame.
        // This allows subscriptions to occur before the creator function is called.
        setTimeout(() => {
            creator({
                next: d => obs.next(d),
                end: () => obs.end(),
                error: e => obs.error(e),
            });
        }, 1);
        return obs;
    }
    static fromPromises(promises) {
        const obs = Observable.create(creator => {
            promises.forEach(promise => {
                promise.then(creator.next);
                promise.catch(creator.error);
            });
            Promise.all(promises).then(creator.end);
        });
        return obs;
    }
    static fromArray(arr) {
        const obs = Observable.create(creator => {
            sendArray(creator.next, creator.end, arr);
        });
        return obs;
    }
    static fromEvent(event, events = { data: 'data', error: 'error', end: 'end' }) {
        const obs = new Observable();
        event.on(events.data, d => obs.next(d));
        event.on(events.error, e => obs.error(e));
        event.on(events.end, () => obs.end());
        return obs;
    }
    static fromCreator() {
        const obs = new Observable();
        return {
            observable: obs,
            creator: {
                next: (d) => obs.next(d),
                end: () => obs.end(),
                error: (e) => obs.error(e),
            },
        };
    }
    subscribe(sub) {
        this.subscriptions.push(sub);
        return this;
    }
    onEnd(f) {
        this.endHandlers.push(f);
    }
    onError(f) {
        this.errorHandlers.push(f);
    }
    // ---------------------
    // Special Subscriptions
    // ---------------------
    map(sub) {
        const obs = new Observable();
        this.subscribe((data) => __awaiter(this, void 0, void 0, function* () {
            const r = yield sub(data);
            obs.next(r);
        }));
        this.bindEndAndError(obs);
        return obs;
    }
    flatMap(sub) {
        const obs = new Observable();
        this.subscribe((data) => __awaiter(this, void 0, void 0, function* () {
            const r = sub(data);
            if (r instanceof Observable)
                return r.bind(obs);
            if (r instanceof Promise)
                return obs.next(yield r);
            if (Array.isArray(r))
                return sendArray(d => obs.next(d), () => { }, r);
        }));
        this.bindEndAndError(obs);
        return obs;
    }
    filter(test) {
        const obs = new Observable();
        this.subscribe((data) => __awaiter(this, void 0, void 0, function* () {
            const filter = yield test(data);
            if (filter)
                obs.next(data);
        }));
        this.bindEndAndError(obs);
        return obs;
    }
    filterUndefined() {
        return this.filter(d => typeof d !== 'undefined');
    }
    partition(pred) {
        const left = new Observable();
        const right = new Observable();
        this.subscribe((data) => __awaiter(this, void 0, void 0, function* () {
            const filter = yield pred(data);
            if (filter)
                left.next(data);
            else
                right.next(data);
        }));
        this.bindEndAndError(left);
        this.bindEndAndError(right);
        return [left, right];
    }
    // ---------
    // Data Flow
    // ---------
    next(data) {
        if (this.completed || this.err)
            return;
        this.queue.push(data);
        this.execute();
    }
    end() {
        if (this.completed || this.err)
            return;
        this.completed = true;
        this.flush().then(() => {
            this.endHandlers.forEach(fp_1.invoke);
            this.dispose();
        });
    }
    error(e) {
        if (this.completed || this.err)
            return;
        this.err = e;
        this.flush().then(() => {
            this.errorHandlers.forEach(f => f(e));
            this.dispose();
        });
    }
    then(f) {
        return __awaiter(this, void 0, void 0, function* () {
            // if this observable is already done, just return
            if (this.completed || this.err)
                return f && f();
            // otherwise, return once the `end` or `error` function is called
            return new Promise((resolve, reject) => {
                this.onEnd(resolve);
                this.onError(reject);
            }).then(f);
        });
    }
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            const remaining = this.queue.length;
            if (remaining === 0)
                return;
            const active = Object.keys(this.activeTasks).length;
            const shouldExecute = this.parallel > 0 ? min(this.parallel - active, remaining) : remaining;
            // make sure I don't create an infinite loop of empty promises
            // ^^^ that got awfully existential 0.0
            if (shouldExecute === 0)
                return;
            for (let i = 0; i < shouldExecute; ++i) {
                const id = this.getId();
                const d = this.queue.shift();
                const task = promise.map(this.subscriptions, s => s(d));
                this.activeTasks[id] = task.then(() => {
                    delete this.activeTasks[id];
                    // ensure control loop clears before running again
                    return promise.delay(5)
                        .then(() => this.execute());
                });
            }
            yield promise.allValues(this.activeTasks);
        });
    }
    flush() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.execute();
            yield promise.allValues(this.activeTasks);
            this.queue = [];
        });
    }
    // ------------------
    // Advanced Functions
    // ------------------
    collect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.completed || this.err)
                return [];
            const collection = [];
            this.subscribe(d => collection.push(d));
            return this.then(() => collection);
        });
    }
    group(num) {
        const obs = new Observable();
        let collection = [];
        this.subscribe(d => {
            collection.push(d);
            if (collection.length === num) {
                obs.next(collection);
                collection = [];
            }
        });
        this.onEnd(() => {
            obs.next(collection);
            collection = [];
            obs.end();
        });
        this.onError(e => {
            obs.next(collection);
            collection = [];
            obs.error(e);
        });
        return obs;
    }
    concat(obs) {
        const joint = new Observable();
        this.subscribe(d => joint.next(d));
        this.onError(e => joint.error(e));
        obs.subscribe(d => joint.next(d));
        obs.onError(e => joint.error(e));
        // only end when both have ended
        let otherEnded = false;
        this.onEnd(() => {
            if (otherEnded)
                joint.end();
            otherEnded = true;
        });
        obs.onEnd(() => {
            if (otherEnded)
                joint.end();
            otherEnded = true;
        });
        return joint;
    }
    take(num) {
        const obs = new Observable();
        let i = 0;
        this.subscribe(d => {
            if (i >= num)
                this.end();
            else
                obs.next(d);
            i++;
        });
        this.bindEndAndError(obs);
        return obs;
    }
    last() {
        let last;
        this.subscribe(d => last = d);
        return this.then(() => {
            if (!last)
                throw new Error('Never observed any data so no last item found');
            return last;
        });
    }
    bottleneck(num) {
        this.parallel = num;
        return this;
    }
    // ---------
    // Utilities
    // ---------
    bindEndAndError(obs) {
        this.onEnd(() => obs.end());
        this.onError(e => obs.error(e));
    }
    bind(obs) {
        this.bindEndAndError(obs);
        this.subscribe(d => obs.next(d));
    }
    toNumerical() {
        return NumericalObservable.fromObservable(this);
    }
    dispose() {
        if (!(this.completed || this.err))
            this.end();
        this.activeTasks = {};
        this.queue = [];
        this.errorHandlers = [];
        this.endHandlers = [];
        this.subscriptions = [];
    }
}
exports.Observable = Observable;
class NumericalObservable extends Observable {
    static fromObservable(obs) {
        const num = new NumericalObservable();
        obs.subscribe(d => {
            if (typeof d !== 'number') {
                num.error(new Error('Expected to only receive numerical data'));
                return;
            }
            num.next(d);
        });
        obs.onError(e => num.error(e));
        obs.onEnd(() => num.end());
        return num;
    }
    blockAverage(window) {
        const obs = new NumericalObservable();
        let mean = 0;
        let count = 0;
        this.subscribe((x) => {
            mean += x;
            count++;
            if (count === window) {
                obs.next(mean / count);
                mean = 0;
                count = 0;
            }
        });
        this.onEnd(() => {
            obs.next(mean / count);
            obs.end();
        });
        this.onError(e => {
            obs.next(mean / count);
            obs.error(e);
        });
        return obs;
    }
    movingAverage(window) {
        const obs = new NumericalObservable();
        const gamma = 2 / (window + 1);
        let mean;
        this.subscribe(x => {
            // if mean is undefined, start it out as x
            mean = mean === undefined ? x : mean;
            mean = gamma * x + (1 - gamma) * mean;
            obs.next(mean);
        });
        this.bindEndAndError(obs);
        return obs;
    }
    sum() {
        const obs = new NumericalObservable();
        let sum = 0;
        this.subscribe(x => {
            sum += x;
            obs.next(sum);
        });
        this.bindEndAndError(obs);
        return obs;
    }
}
exports.NumericalObservable = NumericalObservable;
const sendArray = (next, end, arr) => {
    // use setTimeout to release the control loop after each item is processed
    const send = (i) => {
        if (i >= arr.length)
            return Promise.resolve(end());
        next(arr[i]);
        return promise.delay(5)
            .then(() => send(i + 1));
    };
    return send(0);
};
const uniqueId = () => {
    let i = 0;
    return () => i++;
};
const min = (a, b) => a < b ? a : b;
//# sourceMappingURL=observable.js.map
import * as promise from './promise';
import { invoke } from './fp';
import { EventEmitter } from 'events';
import { Milliseconds } from './time';
import { Writable } from 'stream';

export interface RawObservable<T> {
    next(data: OrPromise<T>): any;
    end(): any;
    error(e: Error | string): any;
}

type OrPromise<T> = T | Promise<T>;
export type ObservableCreatorFunction<T> = (obs: RawObservable<T>) => any;
export type ObservableSubscriptionFunction<T> = (data: T) => any;
export type ObservableMapFunction<T, R> = (data: T) => OrPromise<R>;
export type ObservableFlatMapFunction<T, R> = (data: T) => R[] | Observable<R> | Promise<R>;

export class Observable<T> {
    protected constructor() {}

    // -----
    // State
    // -----
    protected completed: Promise<void> | undefined;
    protected err: Error | string | undefined;
    protected queue: Array<OrPromise<T>> = [];
    protected parallel: number = 0;

    // --------
    // Creators
    // --------
    static create<T>(creator: ObservableCreatorFunction<T>): Observable<T> {
        const obs = new Observable<T>();

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

    static fromPromises<T>(promises: Array<Promise<T>>): Observable<T> {
        const obs = Observable.create<T>(creator => {
            promises.forEach(promise => {
                promise.then(creator.next);
                promise.catch(creator.error);
            });

            Promise.all(promises).then(creator.end);
        });

        return obs;
    }

    static fromArray<T>(arr: T[]): Observable<T> {
        const obs = Observable.create<T>(creator => {
            sendArray(creator.next, creator.end, arr);
        });

        return obs;
    }

    static fromEvent<T>(event: EventEmitter, events = { data: 'data', error: 'error', end: 'end' }) {
        const obs = new Observable<T>();

        event.on(events.data, d => obs.next(d));
        event.on(events.error, e => obs.error(e));
        event.on(events.end, () => obs.end());

        return obs;
    }

    static fromCreator<T>() {
        const obs = new Observable<T>();

        return {
            observable: obs,
            creator: {
                next: (d: OrPromise<T>) => obs.next(d),
                end: () => obs.end(),
                error: (e: Error | string) => obs.error(e),
            },
        };
    }

    // -------------
    // Subscriptions
    // -------------
    protected subscriptions: Array<ObservableSubscriptionFunction<T>> = [];
    subscribe(sub: ObservableSubscriptionFunction<T>) {
        this.subscriptions.push(sub);
        return this;
    }

    protected endHandlers: Array<() => any> = [];
    onEnd(f: () => any) {
        this.endHandlers.push(f);
    }

    protected errorHandlers: Array<(e: Error | string) => any> = [];
    onError(f: (e: Error | string) => any) {
        this.errorHandlers.push(f);
    }

    // ---------------------
    // Special Subscriptions
    // ---------------------
    map<R>(sub: ObservableMapFunction<T, R>): Observable<R> {
        const obs = new Observable<R>();

        this.subscribe(async (data) => {
            const r = await sub(data);
            obs.next(r);
        });
        this.bindEndAndError(obs);

        return obs;
    }

    flatMap<R>(sub: ObservableFlatMapFunction<T, R>): Observable<R> {
        const obs = new Observable<R>();

        this.subscribe(async (data) => {
            const r = sub(data);
            if (r instanceof Observable) return r.subscribe(d => obs.next(d));
            if (r instanceof Promise) return obs.next(await r);
            if (Array.isArray(r)) return sendArray(d => obs.next(d), () => {/* stub */}, r);
        });
        this.bindEndAndError(obs);

        return obs;
    }

    filter(test: (d: T) => OrPromise<boolean>): Observable<T> {
        const obs = new Observable<T>();

        this.subscribe(async (data) => {
            const filter = await test(data);
            if (filter) obs.next(data);
        });
        this.bindEndAndError(obs);

        return obs;
    }

    filterUndefined() {
        return this.filter(d => typeof d !== 'undefined') as any as Observable<Exclude<T, undefined>>;
    }

    partition(pred: (x: T) => OrPromise<boolean>): [Observable<T>, Observable<T>] {
        const left = new Observable<T>();
        const right = new Observable<T>();

        this.subscribe(async (data) => {
            const filter = await pred(data);
            if (filter) left.next(data);
            else right.next(data);
        });
        this.bindEndAndError(left);
        this.bindEndAndError(right);

        return [left, right];
    }

    // ---------
    // Data Flow
    // ---------
    protected next(data: OrPromise<T>) {
        if (this.completed || this.err) return;
        this.queue.push(data);
        this.execute();
    }

    protected end() {
        if (this.completed) return this.completed;
        this.completed = this.flush()
            .then(() => promise.map(this.endHandlers, invoke))
            .then(() => this.dispose());

        return this.completed;
    }

    protected error(e: Error | string) {
        if (this.completed) return this.completed;
        this.err = e;
        this.completed = this.flush()
            .then(() => promise.map(this.errorHandlers, f => f(e)))
            .then(() => this.dispose());

        return this.completed;
    }

    // -----
    // Async
    // -----
    async then(): Promise<void>;
    async then<R>(f: () => R | Promise<R>): Promise<R>;
    async then<R>(f?: () => R | Promise<R>): Promise<R | void> {
        // if this observable is already done, just return
        if (this.completed || this.err) return f && f();

        // otherwise, return once the `end` or `error` function is called
        return new Promise((resolve, reject) => {
            this.onEnd(resolve);
            this.onError(reject);
        })
            .then(() => this.end())
            .then(f);
    }

    private activeTasks: Record<string, Promise<any>> = {};
    private getId = uniqueId();
    private async execute() {
        const remaining = this.queue.length;
        if (remaining === 0) return;

        const active = Object.keys(this.activeTasks).length;
        const shouldExecute = this.parallel > 0 ? min(this.parallel - active, remaining) : remaining;

        // make sure I don't create an infinite loop of empty promises
        // ^^^ that got awfully existential 0.0
        if (shouldExecute === 0) return;

        for (let i = 0; i < shouldExecute; ++i) {
            const id = this.getId();
            const task = Promise.resolve(this.queue.shift()!)
                .then(d => promise.map(this.subscriptions, s => s(d)));

            this.activeTasks[id] = task.then(() => {
                delete this.activeTasks[id];
                // ensure control loop clears before running again
                return promise.delay(5 as Milliseconds)
                    .then(() => this.execute());
            });
        }

        await promise.allValues(this.activeTasks);
    }

    async flush() {
        await this.execute();
        await promise.allValues(this.activeTasks);
        this.queue = [];
    }

    // ------------------
    // Advanced Functions
    // ------------------
    async collect(): Promise<T[]> {
        if (this.completed || this.err) return [];

        const collection: T[] = [];
        this.subscribe(d => collection.push(d));

        return this.then(() => collection);
    }

    group(num: number): Observable<T[]> {
        const obs = new Observable<T[]>();

        let collection: T[] = [];
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

    concat(obs: Observable<T>): Observable<T> {
        const joint = new Observable<T>();
        this.subscribe(d => joint.next(d));
        this.onError(e => joint.error(e));

        obs.subscribe(d => joint.next(d));
        obs.onError(e => joint.error(e));

        // only end when both have ended
        let otherEnded = false;
        this.onEnd(() => {
            if (otherEnded) joint.end();
            otherEnded = true;
        });

        obs.onEnd(() => {
            if (otherEnded) joint.end();
            otherEnded = true;
        });

        return joint;
    }

    take(num: number): Observable<T> {
        const obs = new Observable<T>();

        let i = 0;

        this.subscribe(d => {
            if (i >= num) this.end();
            else obs.next(d);
            i++;
        });
        this.bindEndAndError(obs);

        return obs;
    }

    last(): Promise<T> {
        let last: T | undefined;

        this.subscribe(d => last = d);

        return this.then(() => {
            if (last === undefined) throw new Error('Never observed any data so no last item found');

            return last;
        });
    }

    bottleneck(num: number): Observable<T> {
        this.parallel = num;
        return this;
    }

    // ---------
    // Utilities
    // ---------
    protected bindEndAndError(obs: Observable<any>) {
        this.onEnd(() => obs.end());
        this.onError(e => obs.error(e));
    }

    protected bind(obs: Observable<T>) {
        this.bindEndAndError(obs);
        this.subscribe(d => obs.next(d));
    }

    toNumerical(): NumericalObservable {
        return NumericalObservable.fromObservable(this as any);
    }

    toWriteStream(stream: Writable) {
        this.subscribe(d => {
            stream.write(d);
        });

        this.onEnd(() => new Promise(resolve => stream.end(resolve)));
        return this;
    }

    dispose() {
        if (!(this.completed || this.err)) this.end();

        this.activeTasks = {};
        this.queue = [];
        this.errorHandlers = [];
        this.endHandlers = [];
        this.subscriptions = [];
    }
}

export class NumericalObservable extends Observable<number> {
    static fromObservable(obs: Observable<number>): NumericalObservable {
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

    blockAverage(window: number): NumericalObservable {
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
            if (count) obs.next(mean / count);
            obs.end();
        });

        this.onError(e => {
            if (count) obs.next(mean / count);
            obs.error(e);
        });

        return obs;
    }

    movingAverage(window: number): NumericalObservable {
        const obs = new NumericalObservable();

        const gamma = 2 / (window + 1);
        let mean: number | undefined;

        this.subscribe(x => {
            // if mean is undefined, start it out as x
            mean = mean === undefined ? x : mean;

            mean = gamma * x + (1 - gamma) * mean;
            obs.next(mean);
        });

        this.bindEndAndError(obs);

        return obs;
    }

    sum(): NumericalObservable {
        const obs = new NumericalObservable();

        let sum = 0;

        this.subscribe(x => {
            sum += x;
            obs.next(sum);
        });

        this.bindEndAndError(obs);

        return obs;
    }

    mean(): Promise<number> {
        let sum = 0;
        let count = 0;
        this.subscribe(x => {
            sum += x;
            count++;
        });

        return this.then(() => {
            if (count === 0) throw new Error('Cannot take mean without any data');
            return sum / count;
        });
    }
}

const sendArray = <T>(next: (t: T) => void, end: () => void, arr: T[]) => {
    // use setTimeout to release the control loop after each item is processed
    const send = (i: number): Promise<void> => {
        if (i >= arr.length) return Promise.resolve(end());
        next(arr[i]);

        return promise.delay(5 as Milliseconds)
            .then(() => send(i + 1));
    };

    return send(0);
};

const uniqueId = () => {
    let i = 0;
    return () => i++;
};

const min = (a: number, b: number) => a < b ? a : b;

'use strict';



// runner work tasks in the pool
var WorkerThread = function(parentPool) {
    this.parentPool = parentPool;
    this.workerTask = {};
    this.worker = new Worker(parentPool.script);
    this.init();
};


WorkerThread.prototype = {
    dummyCallback : function(event) {
                // pass to original callback
        this.workerTask.callback(event);
                // we should use a seperate thread to add the worker
        this.parentPool.freeWorkerThread(this);
    },
    // for now assume we only get a single callback from a worker
    // which also indicates the end of this worker.
    init: function(){
        this.worker.addEventListener('message', this.dummyCallback.bind(this), false);
    },

    run : function(workerTask) {
        this.workerTask = workerTask;
        this.worker.postMessage(workerTask.startMessage, [workerTask.startMessage.buffer]);
    }
};



var WorkerPool = function(size, script) {
    // set some defaults
    this.taskQueue = [];
    this.workerQueue = [];
    var cores = navigator.hardwareConcurrency !== undefined ? navigator.hardwareConcurrency : 4;
    this.poolSize = Math.min(cores-1, 16);
    this.script = script;
} 

WorkerPool.prototype = {

    init : function() {
        // create 'size' number of worker threads
        for (var i = 0 ; i < this.poolSize ; i++) {
            this.workerQueue.push(new WorkerThread(this));
        }
    },

    addWorkerTask: function(workerTask) {
        if (this.workerQueue.length > 0) {
            // get the worker from the front of the queue
            var workerThread = this.workerQueue.shift();
            workerThread.run(workerTask);
        } else {
            // no free workers,
            this.taskQueue.push(workerTask);
        }
    },

    freeWorkerThread: function(workerThread) {
        if (this.taskQueue.length > 0) {
            // don't put back in queue, but execute next task
            var workerTask = this.taskQueue.shift();
            workerThread.run(workerTask);
        } else {
            this.workerQueue.push(workerThread);
        }
    }
};



export default WorkerPool;
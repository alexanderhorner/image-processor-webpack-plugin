const { Sema } = require('async-sema');

const queue = new Sema(
  4, // Allow 4 concurrent async calls
  {
    capacity: 100 // Prealloc space for 100 tokens
  }
);

async function fetchData(x) {
    await queue.acquire()
    await resolveAfterXMilliseconds(x)
    queue.release();
}

async function resolveAfterXMilliseconds(x) {
    return new Promise(resolve => {
        setTimeout(() => {
            console.log("Finished after " + x + "ms")
            resolve();
        }, x);
    });
}

const time = 100

var promises = []

console.time("Test")

for (let i = 0; i < 320; i++) {
    promises.push(fetchData(time))
}

Promise.all(promises).then(() => {
    console.timeEnd("Test")
})



// fetchData(1001)
// fetchData(1102)
// fetchData(1203)
// fetchData(1303)
// fetchData(1404)
// fetchData(1005)
// fetchData(1106)
// fetchData(1207)
// fetchData(1308)
// fetchData(1409)
// fetchData(1010)
// fetchData(1111)
// fetchData(1212)
// fetchData(1313)
// fetchData(1413)
async function resolveAfterXMilliseconds(time, message) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve("Resolved2: " + message + " after " + time + "ms");
        }, time);
    });
}
var promises = [];
for (let step = 0; step < 50; step++) {
    var message = step;
    var time = Math.floor(Math.random() * (1000 - 500) + 500);
    promises.push(resolveAfterXMilliseconds(time, message));
}
async function returnAfterX(x) {
    await resolveAfterXMilliseconds(x, '');
    return [1, 2, 3];
}
test2();
async function test2() {
    var wow = await returnAfterX(599);
}
promiseEachNonBlocking(promises, '');
function promiseEachNonBlocking(promises, func) {
    // var test = Promise.race(promises).then((value) => {
    //     console.log(value)
    //     promises.forEach(promise => {
    //         const test = promise[1]
    //         console.log({ promise })
    //     });
    // })
    promises.forEach(promise => {
        promise.then((val) => {
            resolveAfterXMilliseconds(500, '');
            console.log(val);
        });
    });
}
Promise.all(promises).then(() => {
    console.log("All resolved.");
});

const eventManager = require('events');
class MyEmitter extends eventManager {}
const myEmitter = new MyEmitter();
const redis = require('redis');

const client = redis.createClient();
const publisher = redis.createClient();

// client.subscribe("notification");
// client.on("message",(ch, msg) => {
//     console.log(ch ,msg);
// });

// setInterval(()=>{
//     publisher.publish("notification", Math.random());
// }, 1000);

function dummyProcess(job){
    return new Promise((resolve, reject)=>{
        setTimeout(()=>{
            resolve(Math.random() >= 0.5);
        },10000);
    });
}

myEmitter.on("jobCompleted",(job)=>{
    client.rpop("workP",(err,data)=>{
        console.log("Job Completed", job);
    });
});

myEmitter.on("newJob",async (job)=>{
   console.log("Job Received", job);
   let output = await dummyProcess(job);
   if(output){
        job.output = output;
        myEmitter.emit("jobCompleted",job);
   }
   else{
        job.failed = job.failed + 1;   
        client.lpush("workQ", JSON.stringify(job));
   }
});

let dataset = setInterval(() => {
    client.lpush("workQ", JSON.stringify({parameter: Math.random(), failed: 0}));
}, 5000);

setInterval(() => {
    client.rpop("workP");
}, 2000);
//client.lpush("workQ", JSON.stringify({"title":"one", failed:0}));

setInterval(()=>{
    client.llen("workQ",(err, cnt)=>{
        //console.log("Work Queue Pending:", cnt);
    })

    client.llen("workP",(err, cnt)=>{
        //console.log("Work In Process:", cnt);
        if(cnt==0){
            client.rpoplpush("workQ","workP", (err , data)=>{
                if(data != null){
                    data = JSON.parse(data);
                    console.log('data', data);
                    myEmitter.emit("newJob",data);
                }
            });
        }
    })
},1000);

setTimeout(()=>{
    clearInterval(dataset);
},50000);
    




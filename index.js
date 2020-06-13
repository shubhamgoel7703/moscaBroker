// websocket port : 2222
// mqtt port : 1234

// MQTT broker
var mosca = require('mosca')
var settings = { port: 1234 }//, backend: ascoltatore 
var broker = new mosca.Server(settings)
// clinet socket
var express = require('express');
var app = express();
var server = app.listen(2222);
var socket = require('socket.io');
var io = socket(server);
var lib = require('dsp.js');
var fft = new lib.FFT(8, 44100);
var sampleSize = 128;
// mysql
var mysql = require('mysql');
var con = mysql.createConnection({
    host: "test",
    user: "test",
    password: "test",
    port: 'test',
    database: "test"
});
con.connect(function (err) {
    if (err) {
        console.log("mysql connection error ", err);
        return;
    };
    console.log("Database Connected!");
});

function jsTOMySqlDate(jsDate) {
    return jsDate.getUTCFullYear() + "-" + twoDigits(1 + jsDate.getUTCMonth()) + "-" + twoDigits(jsDate.getUTCDate()) + " " + twoDigits(jsDate.getUTCHours()) + ":" + twoDigits(jsDate.getUTCMinutes()) + ":" + twoDigits(jsDate.getUTCSeconds());
};


// sockets connection with client app
io.sockets.on('connection', newConnection);
function newConnection(socket) {
    console.log("new connection created" + socket.id);

    socket.on('filterDataByDatesFromDB', (data) => {
        console.log(data);
        let fromJsDate = new Date(data.from);
        let toJsDate = new Date(data.to);

        let fromMySqlDate = jsTOMySqlDate(new Date(fromJsDate.getTime() + 19800000));//Date.parse(data.from);
        let toMySqlDate = jsTOMySqlDate(new Date(toJsDate.getTime() + 19800000));

        console.log(fromMySqlDate, toMySqlDate);

        fetchDataFromDB(fromMySqlDate, toMySqlDate);

    });

}


// FFT parmas
fftBufferSize = 8;
fftXArray = [];
fftYArray = [];
fftZArray = [];


// mqtt broker 
broker.on('ready', () => {
    console.log('Broker is ready!')
})


broker.on('clientConnected', (client) => {
    console.log('client added ', client.id)
})


broker.on('published', (packet) => {

    try {
        message = packet.payload.toString()
        //console.log("published message", message);

        if (packet.topic == 'vibrationDataTopic') {
            io.sockets.emit('sendData', message);
            pushAxisDataToDB(JSON.parse(message).d); //pushAndEmitFFTData
        }
    }
    catch (ex) {
        console.log("exception ", ex);
    }
});


broker.on('subscribed', (subscribedTopic) => {
    // message = packet.payload.toString()
    console.log("subscribedTopic", subscribedTopic)
})


function pushAxisDataToDB(message) {

    if (con.state == 'authenticated') {
        let sqlQuery = "INSERT INTO vibrationTable (xAxis, yAxis, zAxis) VALUES (" + message.Acceleration_X_Node_0 ? message.Acceleration_X_Node_0 : 0 + "," + message.Acceleration_Y_Node_0 ? message.Acceleration_Y_Node_0 : 0 + "," + message.Acceleration_Z_Node_0 ? message.Acceleration_Z_Node_0 : 0 + ")";
        con.query(sqlQuery, function (err, result) {
            if (err) {
                console.log("error while inserting in table ", err);
            }
            console.log("insertion done" + result);
        });
    }
    else {
        console.log("DB connection issue");
    }
}


function fetchDataFromDB(fromDate, toDate) {
    if (con.state == 'authenticated') {
        let sqlQuery = "SELECT * FROM vibrationTable WHERE creationDate >='" + fromDate + "' AND creationDate <= '" + toDate + "'";
        con.query(sqlQuery, function (err, result) {
            if (err) {
                console.log("error while fetching from table ", err);
            }
            console.log("fetching done", result);
            setAndEmitFFTData(result);
        });
    }
    else {
        console.log("DB connection issue");
    }
}

function findNearestPowerOf2(n) {
    return 1 << 31 - Math.clz32(n);
}

function setAndEmitFFTData(dataFromDB) {


    console.log(dataFromDB.length);
    let bufferSize = findNearestPowerOf2(dataFromDB.length);
    console.log(bufferSize);
    if (bufferSize < 1) {
        io.sockets.emit('sendFFTData', "insufficient data");
        return;
    }

    fft = new lib.FFT(bufferSize, 44100);

    // Sample Of Object : RowDataPacket {
    // id: 9,
    // xAxis: 0.1,
    // yAxis: 0,
    // zAxis: 1,
    // creationDate: 2020-06-13T05:54:33.000Z }
    for (let i = dataFromDB.length % bufferSize; i < dataFromDB.length; i++) {
        fftXArray.push(dataFromDB[i].xAxis);
        fftYArray.push(dataFromDB[i].yAxis);
        fftZArray.push(dataFromDB[i].zAxis);
    }

    let fft_X = [], fft_Y = [], fft_Z = [];

    fft.forward(fftXArray);
    fft_X = [...fft.spectrum];

    fft.forward(fftYArray);
    fft_Y = [...fft.spectrum];

    fft.forward(fftZArray);
    fft_Z = [...fft.spectrum];

    io.sockets.emit('sendFFTData', { fft_X: fft_X, fft_Y: fft_Y, fft_Z: fft_Z });
    fftXArray = [];
    fftYArray = [];
    fftZArray = [];
}

// function pushAndEmitFFTData(message) {
//     //console.log("fft message", message);

//     if (message.Acceleration_X_Node_0 != undefined) {
//         console.log("message.Acceleration_X_Node_0", message.Acceleration_X_Node_0);
//         fftXArray.push(message.Acceleration_X_Node_0)
//         arrayShiftingLogic(fftXArray);
//     }

//     if (message.Acceleration_Y_Node_0 != undefined) {
//         fftYArray.push(message.Acceleration_Y_Node_0)
//         arrayShiftingLogic(fftYArray);
//     }

//     if (message.Acceleration_Z_Node_0 != undefined) {
//         fftZArray.push(message.Acceleration_Z_Node_0)
//         arrayShiftingLogic(fftZArray);
//     }

//     console.log({ fftXArray: fftXArray, fftYArray: fftYArray, fftZArray: fftZArray });

//     let fft_X = [];
//     if (fftXArray.length >= 8) {
//         fft.forward(fftXArray);
//         fft_X = [...fft.spectrum];
//     }
//     else
//         console.log("fftXArray ", fftXArray);

//     let fft_Y = [];
//     if (fftYArray.length >= 8) {
//         fft.forward(fftYArray);
//         fft_Y = [...fft.spectrum]
//     }

//     let fft_Z = [];
//     if (fftZArray.length >= 8) {
//         fft.forward(fftZArray);
//         fft_Z = [...fft.spectrum]
//     }

//     if (fftZArray.length >= 8) {
//         console.log({ fft_X: fft_X, fft_Y: fft_Y, fft_Z: fft_Z });
//         io.sockets.emit('sendFFTData', { fft_X: fft_X, fft_Y: fft_Y, fft_Z: fft_Z });
//         fftXArray = [];
//         fftYArray = [];
//         fftZArray = [];
//     }
// }


// function arrayShiftingLogic(array) {
//     if (array.length > fftBufferSize) {
//         array.shift(); // removes the first element from an array 
//     }
// }







// {"d":{"myName":"Node6LoWPAN","MAX_Temperature_Node_0":29.30,"Button_Counter_Node_0":0,
//   "Temperature_Node_0":29.40,"Humidity_Node_0":68.40,"Acceleration_Z_Node_0":0.98}}




// setInterval(() => {
//     console.log("emitting");
//     io.sockets.emit('sendData', 100);
// }, 5000)



function twoDigits(d) {
    if (0 <= d && d < 10) return "0" + d.toString();
    if (-10 < d && d < 0) return "-0" + (-1 * d).toString();
    return d.toString();
}

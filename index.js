// websocket port : 2222
// mqtt port : 1234

// MQTT broker
var mosca = require('mosca')

var settings = { port: 1234 }//, backend: ascoltatore 
var broker = new mosca.Server(settings)


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
            pushAndEmitFFTData(JSON.parse(message).d);
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



function pushAndEmitFFTData(message) {
    //console.log("fft message", message);

    if (message.Acceleration_X_Node_0 != undefined) {
        console.log("message.Acceleration_X_Node_0", message.Acceleration_X_Node_0);
        fftXArray.push(message.Acceleration_X_Node_0)
        arrayShiftingLogic(fftXArray);
    }

    if (message.Acceleration_Y_Node_0 != undefined) {
        fftYArray.push(message.Acceleration_Y_Node_0)
        arrayShiftingLogic(fftYArray);
    }

    if (message.Acceleration_Z_Node_0 != undefined) {
        fftZArray.push(message.Acceleration_Z_Node_0)
        arrayShiftingLogic(fftZArray);
    }

    console.log({ fftXArray: fftXArray, fftYArray: fftYArray, fftZArray: fftZArray });

    let fft_X = [];
    if (fftXArray.length >= 8) {
        fft.forward(fftXArray);
        fft_X = [...fft.spectrum];
    }
    else
        console.log("fftXArray ", fftXArray);

    let fft_Y = [];
    if (fftYArray.length >= 8) {
        fft.forward(fftYArray);
        fft_Y = [...fft.spectrum]
    }

    let fft_Z = [];
    if (fftZArray.length >= 8) {
        fft.forward(fftZArray);
        fft_Z = [...fft.spectrum]
    }

    if (fftZArray.length >= 8) {
        console.log({ fft_X: fft_X, fft_Y: fft_Y, fft_Z: fft_Z });
        io.sockets.emit('sendFFTData', { fft_X: fft_X, fft_Y: fft_Y, fft_Z: fft_Z });
        fftXArray = [];
        fftYArray = [];
        fftZArray = [];
    }
}


function arrayShiftingLogic(array) {
    if (array.length > fftBufferSize) {
        array.shift(); // removes the first element from an array 
    }
}


var lib = require('dsp.js');
var fft = new lib.FFT(8, 44100);
fftBufferSize = 8;
fftXArray = [];
fftYArray = [];
fftZArray = [];




// {"d":{"myName":"Node6LoWPAN","MAX_Temperature_Node_0":29.30,"Button_Counter_Node_0":0,
//   "Temperature_Node_0":29.40,"Humidity_Node_0":68.40,"Acceleration_Z_Node_0":0.98}}


var express = require('express');
var app = express();
var server = app.listen(2222);
var socket = require('socket.io');
var io = socket(server);

io.sockets.on('connection', newConnection);


function newConnection(socket) {
    console.log("new connection created" + socket.id);
}

// setInterval(() => {
//     console.log("emitting");
//     io.sockets.emit('sendData', 100);
// }, 5000)

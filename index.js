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
    message = packet.payload.toString()
    console.log("published ", message)
    // console.log("published packet", packet)

    if (packet.topic == 'vibrationDataTopic') {
        io.sockets.emit('sendData', Number(message));
    }
})

broker.on('subscribed', (subscribedTopic) => {
    // message = packet.payload.toString()
    console.log("subscribedTopic", subscribedTopic)
})






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

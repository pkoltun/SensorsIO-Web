var util = require("util");
var sensorsio = require('sensors-io');
var sensor = sensorsio.Sensor;
var express = require('express')
var app = express()
var http = require('http').Server(app);
var io = require('socket.io')(http);
var SocketioServer = require("../lib/SocketIOServer.js");
var assign = require('object-assign');

var serverPort = 3000;

app.use('/scripts', express.static('scripts'));
app.use('/css', express.static('css'));


app.use(express.static('views'));



function CustomSensor() {
    var customState = {
        on: false,
        name: "None"
    };
    sensor.Sensor.call(this, assign({}, customState));
    this.readOnly = false;
}

util.inherits(CustomSensor, sensor.Sensor);



var createServer = SocketioServer.getServerCreator(io);

var sensorsServer = new sensorsio.SensorsServer.Server(http, serverPort, [createServer]);

var sensorState = {};

var changingSensor = new CustomSensor();

var sensorWithMessage = new CustomSensor();

changingSensor.name = "Sensor with server state updates";
sensorWithMessage.name = "Same sensor with 2 different paths";


var changeState = function () {
    var lastState = changingSensor.getLastAvaliableState();
    var newState = {
        on: !lastState.on,
        name: (new Date()).getSeconds().toString()
    }
    sensorWithMessage.toString();
    changingSensor.setState(newState);
}

setInterval(changeState, 1500);



sensorsServer.addSensor(changingSensor, 'modifyStateTest');
sensorsServer.addSensor(sensorWithMessage, 'modifyStateWithMessageTest');
sensorsServer.addSensor(sensorWithMessage, 'copySensor');

var getSensorsList = function (z){
    var sensorsList = sensorsServer.sensorsWithSocket.map(function (x){
        var sensor = x.sensor;
        
        return {
            path: x.path, 
            name : sensor.name,
            readOnly: sensor.readOnly === true,
            state: sensor.state
        }
    })
    io.emit('sensorsListResponse', sensorsList);
}

io.on('connection', function (socket) {
    socket.on("getSenorsList", getSensorsList)
    //TODO send only to this socket
});;


http.listen(serverPort, function () {
    console.log('listening on *:3000');
});
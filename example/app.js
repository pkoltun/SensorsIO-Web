var util = require("util");
var sensorsio = require('sensors-io');
var sensor = sensorsio.Sensor;
var http = require('http');
var SocketioServer = require("../lib/SocketIOServer.js");
var assign = require('object-assign');
var read = require('fs').readFileSync;


function CustomSensor() {
    var customState = {
        on: false,
        name: "None"
    };
    sensor.Sensor.call(this, assign({}, customState));
    this.readOnly = false;
}

util.inherits(CustomSensor, sensor.Sensor);

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

var serverPort = 3000;
var serverPair = SocketioServer.configureSimpleServers(http, serverPort, true);
var sensorsServer = serverPair.sensorsServer;
var server = serverPair.httpServer;

sensorsServer.addSensor(changingSensor, 'modifyStateTest');
sensorsServer.addSensor(sensorWithMessage, 'modifyStateWithMessageTest');
sensorsServer.addSensor(sensorWithMessage, 'copySensor');


server.listen(serverPort, function () {
    console.log('listening on *:3000');
});
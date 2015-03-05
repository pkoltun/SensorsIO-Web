var sensorsio = require('sensors-io');
var socketio = require('socket.io');
var http = require("http");
var SocketioServer = require("../lib/SocketIOServer.js");
var Connection = SocketioServer.Connection;

var serverPort = 8084;
var createServer = function (addSensors, done) {
    httpServer = http.createServer(function (req, res) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Test server');
    });
    var io = new socketio(httpServer);
    
    var createServer = function (path, logger, handleMessage) {
        return new SocketioServer.SocketIOServer(io, path, logger, handleMessage);
    }
    var server = new sensorsio.SensorsServer.Server(server, serverPort, createServer);
    addSensors(server);
    server.io = io;
    
    httpServer.listen(serverPort, function () {
        done();
    });
    return server;
}

var destroySensorServer = function (sensorsServer) {
    console.log("dupa");
    sensorsServer.io.close();
    //sensorsServer.httpServer.close();
}


var serverAddress = 'http://localhost:' + serverPort;
var createConnection = function (sensorPath) {
    return new Connection(serverAddress, sensorPath);
}

sensorsio.SensorsServerTest.generateTests(serverPort, createServer, destroySensorServer, createConnection,1000);
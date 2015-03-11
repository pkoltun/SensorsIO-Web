var socketio = require('socket.io');
var socket = require('socket.io-client');

var url = require('url');
var events = require('events');
var util = require("util");

function SocketIOServer(io, path, logger, handleMessage) {
    this.io = io;
    var handleSendResult = function (error) {
        if (error) {
            logger("Send error:" + error, "error");
        }
    }
    
    io.on('connection', function (socket) {
        
        var address = socket.handshake.address;
      
        logger('connected web socket: ' + address, 'debug');
        
        socket.on('disconnect', function close() {
            logger(address + ' disconnected web socket');
        });
        
        socket.on('command', function (message) {
            if (message.path === path) {
                var sendResponse = function (response) {
                    socket.emit("sensorResponse", { path: path, response: response });
                }
                handleMessage(message.data, address, sendResponse);
            }
        });
    });
    
    this.broadcastToAuthorized = function (data, handleSendResult) {
        io.emit("sensorBroadcast", { path: path, data: data });    
    }
    
    this.close = function () {
        
    }

    this.path = path;
}

function Connection(ioClient, sensorPath) {
    var that = this;
    var options = {};
    
    var ws = ioClient; 
    
    ws.on('connect_error', function (err) {
    });
    
    ws.on('sensorBroadcast', function (message) {
        if (message.path === sensorPath) {
            that.emit('message', message.data);
        }
    });
    
    ws.on('sensorResponse', function (message) {
        if (message.path === sensorPath) {
            that.emit('message', message.response);
        }
    });

    ws.on('connect', function () {
       
        that.emit('open');
    });
    this.close = function (code, data) {
        ws.disconnect();
    }
    this.send = function (data, errorCallback) {
        ws.emit("command", {path: sensorPath, data: data});
    }
}

function getServerCreator(io) {
    var createServer = function (path, logger, handleMessage) {
        return new SocketIOServer(io, path, logger, handleMessage);
    }
    return createServer;
}

util.inherits(Connection, events.EventEmitter);

exports.SocketIOServer = SocketIOServer;
exports.Connection = Connection;
exports.getServerCreator = getServerCreator;


var socketio = require('socket.io');
var sensorsio = require('sensors-io');
var socket = require('socket.io-client');
var version = require('../package.json').version;

var url = require('url');
var events = require('events');
var util = require("util");
var read = require('fs').readFileSync;

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

var clientSource = read(require.resolve('../scripts/sensors-io-web.js'), 'utf-8');
var cssSource = read(require.resolve('../css/sensor.css'), 'utf-8');


function configureSocketio( io, sensorsServer ) {
    var getSensorsList = function (z) {
        var sensorsList = sensorsServer.sensorsWithSocket.map(function (x) {
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
 }

function getServerCreator(io, httpServer) {
     
    serve = function (req, res, source, header) {
        var etag = req.headers['if-none-match'];
        if (etag) {
            if (version == etag) {
                res.writeHead(304);
                res.end();
                return;
            }
        }
        
        res.setHeader('Content-Type', header);
        res.setHeader('ETag', version);
        res.writeHead(200);
        res.end(source);
    };

    var attachServe = function () {
        var url = '/sensors-io-web.js';
        var cssUrl = '/css/sensor.css';
        var evs = httpServer.listeners('request').slice(0);
        var self = this;
        httpServer.removeAllListeners('request');
        httpServer.on('request', function (req, res) {
            if (0 == req.url.indexOf(url)) {
                serve(req, res, clientSource, 'application/javascript');
            } else if (0 == req.url.indexOf(cssUrl)) {
                serve(req, res, cssSource, 'text/css');
            } else {
                for (var i = 0; i < evs.length; i++) {
                    evs[i].call(httpServer, req, res);
                }
            }
        });
    };
    
    if (httpServer) {
        attachServe(httpServer);
    }

    var createServer = function (path, logger, handleMessage) {
        return new SocketIOServer(io, path, logger, handleMessage);
    }
    return createServer;
}

var configureSimpleServers = function ( http, serverPort, addRawWebSocketServer){
    var html = read(require.resolve('../views/index.html'), 'utf-8');
    var server = http.createServer(function (req, res) {
        if (req.url === "/") {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        }
    });
    
    var io = require('socket.io')(server);
    var createServer = getServerCreator(io, server);
    
    if (addRawWebSocketServer) {
        var createWSServer = sensorsio.WebSocketServer.getWSServerCreator(server);
        serverCreators = [createWSServer,createServer];
    }
    else {
        serverCreators = [createServer];
    }
    var sensorsServer = new sensorsio.SensorsServer.Server(server, serverPort, serverCreators)
    configureSocketio(io, sensorsServer);
    return {
        httpServer: server,
        sensorsServer: sensorsServer
        }
}

util.inherits(Connection, events.EventEmitter);

exports.SocketIOServer = SocketIOServer;
exports.Connection = Connection;
exports.getServerCreator = getServerCreator;
exports.configureSimpleServers = configureSimpleServers;


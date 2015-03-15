var React = require('react');
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');
var Sensor = require('./sensor').Sensor;

var socket = io();

var SENSOR_CHANGE_EVENT = 'sensorChange';

var SensorActions = {
    requestState: function(sensorPath){
        var getStateCommand = {
            commandName: 'GetState'
        }
        socket.emit("command", {path: sensorPath, data: getStateCommand});
    },
    changeState: function(sensorPath, newState){
        var setStateCommand = {
            commandName: 'SetState',
            newState: newState
        }
        socket.emit("command", {path: sensorPath, data: setStateCommand});
    }
}

var SensorsStore = assign({}, EventEmitter.prototype, {

    emitChange: function(sensorPath, state) {
        this.emit(SENSOR_CHANGE_EVENT + sensorPath, state);
    },

    /**
     * @param {function} callback
     */
    addChangeListener: function(sensorPath,callback) {
        this.on(SENSOR_CHANGE_EVENT + sensorPath, callback);

    },

    /**
     * @param {function} callback
     */
    removeChangeListener: function(sensorPath,callback) {
        this.removeListener(SENSOR_CHANGE_EVENT + sensorPath, callback);
    }
});

socket.on('sensorBroadcast', function (message) {
    SensorsStore.emitChange(message.path, message.data.state);
    });

socket.on('sensorResponse', function (message) {
    SensorsStore.emitChange(message.path, message.response.state);
});


var SensorsManager = React.createClass({
    componentDidMount: function() {
        if (!socket.connected) {
            socket.on("connect", function (s) {
                socket.emit("getSenorsList", {});
            });
        }else{
            socket.emit("getSenorsList");
        }
        socket.on('sensorsListResponse', this.handleSensorsList);
    },

    render: function(){
        var displaySensor = function(sensor){
            return (<Sensor key={sensor.path} path={sensor.path} name = {sensor.name} readOnly={sensor.readonly} sensorActions={SensorActions} sensorsStore={SensorsStore}/>);
        }
        return (
            <div>
                {this.state.sensors.map(displaySensor)}
            </div>);
    },
    getInitialState: function()
    {
        return { sensors: [] }
    },

    handleSensorsList:function(list){
        this.setState({sensors: list});
    }
})

React.render(
    <SensorsManager/>,
    document.getElementById('app')
)
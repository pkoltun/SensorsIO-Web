(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
'use strict';

function ToObject(val) {
	if (val == null) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

module.exports = Object.assign || function (target, source) {
	var from;
	var keys;
	var to = ToObject(target);

	for (var s = 1; s < arguments.length; s++) {
		from = arguments[s];
		keys = Object.keys(Object(from));

		for (var i = 0; i < keys.length; i++) {
			to[keys[i]] = from[keys[i]];
		}
	}

	return to;
};

},{}],3:[function(require,module,exports){
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


var SensorsManager = React.createClass({displayName: "SensorsManager",
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
            return (React.createElement(Sensor, {key: sensor.path, path: sensor.path, name: sensor.name, readOnly: sensor.readonly, sensorActions: SensorActions, sensorsStore: SensorsStore}));
        }
        return (
            React.createElement("div", null, 
                this.state.sensors.map(displaySensor)
            ));
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
    React.createElement(SensorsManager, null),
    document.getElementById('app')
)

},{"./sensor":4,"events":1,"object-assign":2}],4:[function(require,module,exports){
var assign = require("object-assign");
var SensorDetailsDisplay = React.createClass({displayName: "SensorDetailsDisplay",
    render: function () {
        var sensorState = this.props.sensorState;
        var readOnly = this.props.readOnly === true;
        var that = this;
        var mapName = function (name, index) {
                        var value = sensorState[name];
                        if (readOnly){
                            return (React.createElement("tr", null, 
                                React.createElement("td", null, name, ":"), 
                                React.createElement("td", null, value.toString())
                            ))
                        }
                        var newValue = that.state.pendingState[name];
                        var updatePendingState = function( newValue ){
                            var newPendingState = assign({},that.state.pendingState);
                            //If we have the same value as before we don't won't to modify it.
                            if (newValue === value && name in newPendingState){
                                delete newPendingState[name];
                            }
                            else{
                                newPendingState[name] = newValue;
                            }
                            that.setState({pendingState:newPendingState});
                        }
                        return(React.createElement(StateInput, {name: name, value: value, newValue: newValue, valueChanged: updatePendingState}));
                      }
        var changed= Object.keys(this.state.pendingState).length === 0;
        return (
 		        React.createElement("form", {onSubmit: this.handleSubmit}, 
                    React.createElement("table", null, 
                          Object.keys(sensorState).map(mapName)
                    ), 
                    React.createElement("input", {type: "submit", value: "Update state", hidden: changed})
                )
        );
    },
    handleSubmit:function(e){
        e.preventDefault();
        this.props.changeState(this.state.pendingState);
       this.replaceState(this.getInitialState());

    },
    getInitialState: function()
    {
        return {pendingState:{}}
    }
});


var Sensor = React.createClass({displayName: "Sensor",
    componentWillMount : function(){
        this.setState(  {readOnly:this.props.readOnly} );
    },

    componentDidMount: function() {
        var lastState = this.props.sensorsStore.addChangeListener(this.props.path, this.stateChanged);
        if (lastState !== undefined) {
            this.setState({sensorState: lastState});
        }else{
            this.props.sensorActions.requestState(this.props.path);
        }
    },

    componentWillUnmount: function() {
        this.props.sensorsStore.removeChangeListener(this.props.path,  this.stateChanged);
    },

    render: function () {
        return (
            React.createElement("div", {className: "sensorBox"}, 
                React.createElement("h1", null, this.props.name), 
                React.createElement(SensorDetailsDisplay, {changeState: this.changeStateRequested, sensorState: this.state.sensorState, readOnly: this.state.readOnly})

            ));
    },
    changeStateRequested:function(pendingState){
        this.props.sensorActions.changeState(this.props.path, pendingState);
    },
    getInitialState: function()
    {
        return { readOnly:true,  sensorState: {} }
    },
    stateChanged: function(newState){
        this.setState({sensorState: newState})
    }
});


var inputID = 0;
var getInputID = function(){
    inputID = inputID + 1;
    return inputID;
}

var StateInput = React.createClass({displayName: "StateInput",
        componentWillMount : function(){
            this.id = "stateInput".concat(getInputID());// We need ids for custom checkboxes
        },
        render: function (){
            var newValue = this.props.newValue;
            var name = this.props.name;
            var value = newValue !== undefined ? newValue : this.props.value;
            var type = "string";
            var input;
            var changedOriginalValue = value === this.props.value;
            var inputClass = changedOriginalValue ? "originalValue" : "changedValue";
            var displayOriginalValue = this.props.value;

            switch (typeof value) {
                case 'boolean':
                    type = "checkbox";

                    input =  (
                        React.createElement("div", {className: "rounded ".concat(inputClass)}, 
                            React.createElement("input", {id: this.id, type: type, name: name, checked: value, onChange: this.handleChange}), 
                            React.createElement("label", {htmlFor: this.id})
                        )
                    );
                    displayOriginalValue = this.props.value ? "checked" : "unchecked";
                    break;
                    case 'number':
                    type = "number";
                    case 'string':
                    default:
                    input = React.createElement("input", {type: type, name: name, value: value, className: inputClass, onChange: this.handleChange});
                    }
            return (
                React.createElement("tr", null, 
                    React.createElement("td", null, name, ":"), 
                    React.createElement("td", null, input, 
                        React.createElement("p", {className: "genericValueTooltip", hidden: changedOriginalValue}, "Original value:", displayOriginalValue)
                    )
                )
            );
        },
        handleChange: function (event) {
            var value = event.target.value;
            switch (event.target.type) {
                case 'checkbox':
                    value = event.target.checked;
                    break;
                case 'number':
                    type = "number";
                    value = parseFloat(value);
                    break;
                case 'string':
                default:
                    value = event.target.value;
            }

            this.props.valueChanged(value);
        }
    }
)
exports.Sensor = Sensor;


},{"object-assign":2}]},{},[3]);

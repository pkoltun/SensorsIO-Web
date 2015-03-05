(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
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
                        React.createElement("tr", null, 
                            React.createElement("th", null, "Property"), 
                            React.createElement("th", null, "Value")
                        ), 
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
        this.setState(  {readOnly:this.props.readOnly, sensorState: this.props.getState()} );
    },
    render: function () {
        return (
            React.createElement("div", {className: "sensorBox"}, 
                React.createElement("h1", null, this.props.name), 
                React.createElement(SensorDetailsDisplay, {changeState: this.changeStateRequested, sensorState: this.state.sensorState, readOnly: this.state.readOnly})

            ));
    },
    changeStateRequested:function(pendingState){

    },
    getInitialState: function()
    {
        return { readOnly:true,  sensorState: {} }
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
            var inputClass = value === this.props.value ? "originalValue" : "changedValue";
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
                        React.createElement("p", {className: "genericValueTooltip"}, "Original value:", displayOriginalValue)
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


var data = [
    { name: "Sensor1", sensorState: { on: false, temp: 30, command: "abc" } },
    { name: "Sensor2", sensorState: { on: true, someBool:false, hum: 30.0, text: "bcd" } },
    { name: "Sensor3", readOnly:true,  sensorState: { on: true, someBool:false, hum: 30.0, text: "bcd" } }
];

var func = function () {
    var sensorIDNumber = 0;
    var sensors = data.map(function (sensorInfo) {
        var getState = function(){
            return sensorInfo.sensorState;
        }
        return (React.createElement(Sensor, {key: "sensor".concat(sensorIDNumber++), name: sensorInfo.name, sensorState: sensorInfo.sensorState, readOnly: sensorInfo.readOnly, getState: getState}));
    })
    return ( React.createElement("div", null, " ", sensors ) );
}

React.render(
    func(),
document.getElementById('example')
);

},{"object-assign":1}]},{},[2]);

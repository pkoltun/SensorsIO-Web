var React = require('react');
var assign = require("object-assign");
var SensorDetailsDisplay = React.createClass({
    render: function () {
        var sensorState = this.props.sensorState;
        var readOnly = this.props.readOnly === true;
        var that = this;
        var mapName = function (name, index) {
                        var value = sensorState[name];
                        if (readOnly){
                            return (<tr>
                                <td>{name}:</td>
                                <td>{value.toString()}</td>
                            </tr>)
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
                        return(<StateInput name= { name } value = {value} newValue={newValue} valueChanged={updatePendingState}/>);
                      }
        var changed= Object.keys(this.state.pendingState).length === 0;
        return (
 		        <form onSubmit={this.handleSubmit}>
                    <table>
                          {Object.keys(sensorState).map(mapName)}
                    </table>
                    <input type="submit" value="Update state" hidden={changed}/>
                </form>
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


var Sensor = React.createClass({
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
            <div className="sensorBox">
                <h1>{this.props.name}</h1>
                <SensorDetailsDisplay changeState={this.changeStateRequested} sensorState={this.state.sensorState} readOnly={this.state.readOnly}/>

            </div>);
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

var StateInput = React.createClass({
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
                        <div className={"rounded ".concat(inputClass)}>
                            <input id={this.id} type= {type} name = {name} checked= {value} onChange={this.handleChange}/>
                            <label htmlFor={this.id} />
                        </div>
                    );
                    displayOriginalValue = this.props.value ? "checked" : "unchecked";
                    break;
                    case 'number':
                    type = "number";
                    case 'string':
                    default:
                    input = <input type= {type} name= {name} value= {value} className={inputClass} onChange={this.handleChange}/>;
                    }
            return (
                <tr>
                    <td>{name}:</td>
                    <td>{input}
                        <p className="genericValueTooltip" hidden={changedOriginalValue}>Original value:{displayOriginalValue}</p>
                    </td>
                </tr>
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

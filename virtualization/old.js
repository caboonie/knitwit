import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

import { Grid } from "react-virtualized";

var initWidth = 4;
var initHeight = 3;


function cellRenderer({columnIndex, key, rowIndex, style}) {
  console.log("render",columnIndex,rowIndex)
  style['backgroundColor'] = colorGrid[rowIndex][columnIndex]
  return (
    <div key={key} style={style} className="stitch-box">

    </div>
  );
}

function make2DArray(width,height,filling) {
    var array = []
    for (var y = 0; y < height; y++) {
        array.push(Array(width).fill(filling));
    }
    return array
}

function cornerToBounds(_corner1,_corner2) {
  var leftx = Math.min(_corner1.data("x"),_corner2.data("x"))
  var rightx = Math.max(_corner1.data("x"),_corner2.data("x"))+1
  var topy = Math.min(_corner1.data("y"),_corner2.data("y"))
  var bottomy = Math.max(_corner1.data("y"),_corner2.data("y"))+1
  return [leftx,topy,rightx,bottomy]
}

function copy(corner1 = null, corner2 = null) {
  var [leftx,topy,rightx,bottomy] = [0,0,colorGrid[0].length,colorGrid.length]
  if (corner1 !== null) {
    [leftx,topy,rightx,bottomy] = cornerToBounds(corner1, corner2);
  }
  var copiedGrid = []
  for (var y = topy; y < bottomy; y++) {
      var copyRow = []
      for (var x = leftx; x < rightx; x++) {
        copyRow.push(colorGrid[y][x])
      }
      copiedGrid.push(copyRow);
  }
  return copiedGrid
}

function paste(pattern, corner = [0,0]) {
  var leftx = corner[0];
  var topy = corner[1];
  var bottomy = Math.min(colorGrid.length, topy+pattern.length)
  var rightx = Math.min(colorGrid[0].length, leftx+pattern[0].length)
  
  // TODO - increase the width and height of the pattern box to allow ful paste
  console.log("dims",leftx,rightx,topy,bottomy)
  for (var y = topy; y < bottomy; y++){
      for (var x = leftx; x < rightx; x++) {
          colorGrid[y][x] = pattern[y-topy][x-leftx]
      }
  }
}

function changeWidth(event) {
  var newWidth = Math.max(Math.min(maxWidth,parseInt(event.target.value)),1)
  var pattern = copy()
  colorGrid = make2DArray(newWidth, pattern.length, "lightgray");
  paste(pattern)
}


var colorGrid =  make2DArray(initWidth,initHeight,"lightgray")
var selectedColor = null;
var colors = [];
var action = null;
const maxWidth = 2000;
const maxHeight = 2000;
console.log("colorgrid", colorGrid)

class App extends Component {
  constructor() {
    super();
    this.state = {
      
    }
  }
  
 

  
  
  render() {
    console.log("rendering main")
    return (
      <div className="main-window">
        <div className="control-panel">
          <span>Width:</span>
          <input type="number" value={colorGrid[0].length} onChange={changeWidth}/>
          {/*<span>Height:</span>
          <input type="number" value={this.state.pattern.height} onChange={this.changeHeight}/> */}
        </div>
        <div className = "workspace">
            <div className="tool-box">
                {/* <p>Choose a color:</p>
                <input type="color" value={colorValue} onChange={this.changeColor}/>
                <div className="classy-button" onClick={this.addColor}>
                    Select
                </div>
                {colorBoxes} */}
            </div>
            <div className="pattern-box">
              <Grid
                cellRenderer={cellRenderer}
                columnCount={colorGrid[0].length}
                columnWidth={20}
                height={300}
                rowCount={colorGrid.length}
                rowHeight={20}
                width={300}
              />
            </div>
        </div>
    </div>
      

    );
  }
}

export default App;
import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Button from 'react-bootstrap/Button'
import defaultCellRangeRenderer from './defaultCellRangeRenderer.js'

import { Grid, AutoSizer} from "react-virtualized";
import { act } from 'react-dom/test-utils';

var initWidth = 4;
var initHeight = 2;
const maxWidth = 2000;
const maxHeight = 2000;

const actions = {
  PENCIL: 'pencil',
  ARROW: 'arrow',
  SELECTION: 'selection',
  BUCKET: 'bucket',
  SQUARE: 'square',
  DROPPER: 'dropper'
}
 
function cornerToBounds(corner1,corner2,corner3=null) {
  // console.log("corners",corner1,corner2,corner3);
  var [x1,y1] = keyToXY(corner1);
  var [x2,y2] = keyToXY(corner2);
  var [x3,y3] = [x1,y1];
  if(corner3!=null) {
    [x3,y3] = keyToXY(corner3);
  }
  var leftx = Math.min(x1,x2,x3)
  var rightx = Math.max(x1,x2,x3)+1
  var topy = Math.min(y1,y2,y3)
  var bottomy = Math.max(y1,y2,y3)+1
  return [leftx,topy,rightx,bottomy]
}



function renderColorBox(color, selected, onClick) {
  var classes = "color-box"
  if (selected) {
      classes += " selected-box"
  }
  return (
      <div className = {classes}
          style = {{backgroundColor: color}}
          key = {color}
          onClick={() => onClick(color)}
      >
      </div>
  )
}

function keyToXY(key) {
  const [yStr, xStr] = key.split("-");
  return [parseInt(xStr),parseInt(yStr)]
}

function make2DArray(_width,_height,filling) {
  var array = []
  for (var y = 0; y < _height; y++) {
      array.push(Array(_width).fill(filling));
  }
  return array
}



class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
        selectedColor: null,
        colors: [],
        action: actions.PENCIL,
        dragging: false,
        selectedBox: null,
        selection:  make2DArray(initWidth, initHeight, false),
        corner2: null,
        staticCellCache: {},
        changedCells: new Set(),
        shape: "purl",
        pattern: {
            colorGrid: make2DArray(initWidth, initHeight, "lightgray"),
            shapeGrid: make2DArray(initWidth, initHeight, "purl"),
            width: initWidth,
            height: initHeight,
            stitchWidth: 20, // pixel width of individual stitch
            stitchHeight: 20,
            selectedBox: 0,
        },
        clipboard: null,
        snapshots: [],
        snapshotIndex: null,
    }

    this.changeColor = this.changeColor.bind(this);
    this.changeWidth = this.changeWidth.bind(this);
    this.changeHeight = this.changeHeight.bind(this);
    this.copy = this.copy.bind(this);
    this.clickStitchify = this.clickStitchify.bind(this);
    this.clickCopy = this.clickCopy.bind(this);
    this.clickPaste = this.clickPaste.bind(this);
    this.clickSelect = this.clickSelect.bind(this);
    this.clickBucket = this.clickBucket.bind(this);
    this.clickSquare = this.clickSquare.bind(this);
    this.addColor = this.addColor.bind(this);
    this.keydownHandler = this.keydownHandler.bind(this);
    this.takeSnapshot = this.takeSnapshot.bind(this);
    this.applySnapshot = this.applySnapshot.bind(this);
    this.copyPattern = this.copyPattern.bind(this);
    this.classyButton = this.classyButton.bind(this);
    this.cellRenderer = this.cellRenderer.bind(this);
    this.cellRangeRenderer = this.cellRangeRenderer.bind(this);

}

classyButton(onClick, text, name=null) {
  var classes = "classy-button";
  if(this.state.action == name) {
    classes += " clicked";
  }
  return (
    <div className={classes} onClick={onClick}>{text}</div>
  )
}

changeColor(event) {
    this.setState({selectedColor: event.target.value});
}

changeWidth(event) {
    var newWidth = Math.max(Math.min(maxWidth,parseInt(event.target.value) || 1),1)
    var pattern = {...this.state.pattern};
    var copied = this.copy()
    pattern.width = newWidth;
    pattern.colorGrid = make2DArray(pattern.width, pattern.height, "lightgray");
    pattern.shapeGrid = make2DArray(pattern.width, pattern.height, "purl");
    var pasted_pattern = this.paste(copied, pattern, "0-0", true)
    this.setState({pattern: pasted_pattern, selection: make2DArray(pattern.width, pattern.height, false)});
}

changeHeight(event) {
    var newHeight= Math.max(Math.min(maxHeight,parseInt(event.target.value) || 1),1)
    var pattern = {...this.state.pattern};
    var copied = this.copy()
    pattern.height = newHeight;
    pattern.colorGrid = make2DArray(pattern.width, pattern.height, "lightgray");
    pattern.shapeGrid = make2DArray(pattern.width, pattern.height, "purl");
    // this.setState({pattern: pattern});
    var pasted_pattern = this.paste(copied, pattern, "0-0", true)
    this.setState({pattern: pasted_pattern, selection: make2DArray(pattern.width, pattern.height, false)});
}

copy(corner1 = null, corner2 = null) {
    
    if (corner1 === null) {
        // by default copy the whole pattern
        // this is not a DEEP COPY
        var copied = {...this.state.pattern}
        return copied
    } 
    // this is deep
    var pattern = {}
    const [leftx,topy,rightx,bottomy] = cornerToBounds(corner1, corner2);
    var colorArray = []
    var shapeArray = []
    for (var y = topy; y < bottomy; y++) {
        var colorRow = []
        var shapeRow = []
        for (var x = leftx; x < rightx; x++) {
            colorRow.push(this.state.pattern.colorGrid[y][x])
            shapeRow.push(this.state.pattern.shapeGrid[y][x])
        }
        colorArray.push(colorRow);
        shapeArray.push(shapeRow);
    }
    pattern.colorGrid = colorArray;
    pattern.shapeGrid = shapeArray;
    pattern.width = colorArray[0].length;
    pattern.height = colorArray.length;
    return pattern
}

paste(pattern, destination, corner = "0-0", noResize = false) {
    var [leftx, topy] = keyToXY(corner);
    var bottomy = topy+pattern.height; // Math.min(destination.height, topy+pattern.height)
    var rightx = leftx+pattern.width; // Math.min(destination.width, leftx+pattern.width)

    if((bottomy > destination.height || rightx > destination.width) && !noResize) {
      var copied = this.copy();
      console.log("resizing for pasting",copied)
      destination.width = Math.max(destination.width, rightx);
      destination.height = Math.max(destination.height, bottomy);
      destination.colorGrid = make2DArray(destination.width, destination.height, "lightgray");
      destination.shapeGrid = make2DArray(destination.width, destination.height, "purl");
      destination = this.paste(copied, destination);
    }

    var bottomy = Math.min(destination.height, topy+pattern.height)
    var rightx = Math.min(destination.width, leftx+pattern.width)
    
    for (var y = topy; y < bottomy; y++){
        for (var x = leftx; x < rightx; x++) {
            destination.colorGrid[y][x] = pattern.colorGrid[y-topy][x-leftx]
            destination.shapeGrid[y][x] = pattern.shapeGrid[y-topy][x-leftx]
        }
    }
    return destination;
}

addColor(event) {
    if (!this.state.colors.includes(this.state.selectedColor) && this.state.selectedColor != null) {
        this.setState({
            colors: this.state.colors.concat([this.state.selectedColor]),
        })
    }

}

clickColor(color) {
    var selectedColor = null
    if (this.state.selectedColor !== color) {
        selectedColor = color;
        if (this.state.action === actions.ARROW) {
          this.setState({action: actions.PENCIL})
        }
        this.setState({selectedColor: selectedColor})
    }
}

boxOnMouseDown(event,x,y, key) {
    event.preventDefault()
    var selectedBox = null
    if (this.state.selectedBox !== key) {
      this.state.staticCellCache[this.state.selectedBox] = null;
      selectedBox = key;
    }

    const pattern = {...this.state.pattern};
    switch(this.state.action) {
        case actions.PENCIL:
          if(this.state.pattern.colorGrid[y][x] === this.state.selectedColor || this.state.selectedColor === null){
            break;
          }
          
          pattern.colorGrid[y][x] = this.state.selectedColor || pattern.colorGrid[y][x]; 
          this.state.staticCellCache[key] = null;
          this.setState({
            pattern: pattern,
          })
          break;
        case actions.SELECTION:
          this.setState({
            corner2: key,
          })
          break;
        case actions.BUCKET:
          this.paintBucket(key)
          break;
        case actions.SQUARE:
          this.setState({
            corner2: key,
          })
          break;
        default:

    }
    this.setState({
        dragging: true,
        selectedBox: selectedBox,
    })
}    

boxOnMouseOver(event,x, y, key) {
  event.preventDefault()
  this.state.staticCellCache[key] = null;
  if (!this.state.dragging) {
    return
  }
  
  const pattern = {...this.state.pattern};
  switch(this.state.action) {
    case actions.PENCIL:
      
      if(pattern.colorGrid[y][x] === this.state.selectedColor || this.state.selectedColor === null){
        return
      }
      pattern.colorGrid[y][x] = this.state.selectedColor; 
      this.setState({
        pattern: pattern,
      })
      break;
    case actions.SELECTION:
      if(key !== this.state.corner2){
        this.setState({
          corner2: key,
        })
      }
      
      break;
    case actions.SQUARE:
      // TODO - implement snapshots and then come back here
      // todo - have whole rows that don't need to be re-rendered
      if(key !== this.state.corner2){
        this.setState({
          corner2: key,
        })
      }
      break;
    default:  
  } 
}

boxOnMouseUp(event,x, y, key) {
  event.preventDefault()
  switch(this.state.action) {
    case actions.SQUARE:
      var pattern = {...this.state.pattern};
      const [leftx,topy,rightx,bottomy] = cornerToBounds(this.state.selectedBox, key);
      for (var y = topy; y < bottomy; y++) {
          for (var x = leftx; x < rightx; x++) {
              pattern.colorGrid[y][x] = this.state.selectedColor;
              this.state.staticCellCache[y+'-'+x] = null;
          }
      }
      this.setState({
        pattern: pattern,
        corner2: null,
        selectedBox: null,
      })
      break;
    default:
      
  }

  this.setState({
    dragging: false,
  })
}

universalMouseUp(event) {
  this.setState({
    dragging: false,
  })
}

copyPattern(pattern){
  const newPattern = {...pattern}
  const newColorGrid = []
  const newShapeGrid = []
  for(var i=0;i<pattern.height;i++) {
    newColorGrid.push({...pattern.colorGrid[i]})
    newShapeGrid.push({...pattern.shapeGrid[i]})
  }
  newPattern.colorGrid = newColorGrid
  newPattern.shapeGrid = newShapeGrid
  return newPattern
}

clickCopy() {
  console.log("calling clickCopy")
  if(this.state.action === actions.SELECTION){
    const pattern = this.copy(this.state.selectedBox, this.state.corner2)
    this.setState({action:actions.ARROW, clipboard: pattern, selectedColor: null})
    this.state.staticCellCache = {}
  }
}

clickPaste() {
  console.log("calling clicPasrw")
  if(this.state.clipboard !== null){
    console.log("here")
    const pattern = this.paste(this.state.clipboard, {...this.state.pattern}, this.state.selectedBox)
    this.setState({action:actions.ARROW, pattern:pattern, selectedColor: null})
    this.state.staticCellCache = {}
  }
}

clickSelect() {
  this.state.staticCellCache = {}
  if (this.state.action === actions.SELECTION) {
    this.setState({action: actions.PENCIL})
  } else {
    this.setState({action: actions.SELECTION, selectedBox:null, corner2:null})
  }
}

clickBucket() {
  if (this.state.action === actions.BUCKET) {
    this.setState({action: actions.PENCIL})
  } else {
    this.setState({action: actions.BUCKET})
  }
}

clickSquare() {
  if (this.state.action === actions.SQUARE) {
    this.setState({action: actions.PENCIL})
  } else {
    this.setState({ action: actions.SQUARE, selectedBox:null, corner2:null})
    
  }
}

clickStitchify() {
  this.state.staticCellCache = {}
  if (this.state.shape === "knit") {
    this.setState({shape: "purl"})
  } else {
    this.setState({shape: "knit"})
    
  }
}

keydownHandler(e){
  console.log("keyCode",e.keyCode, e.ctrlKey)
  if (e.ctrlKey) {
    switch (e.keyCode){
      case 90:
        console.log("Trying undo",this.state.snapshotIndex)
        break;
      case 89:
        break;
      case 83:
        e.preventDefault()
        alert("saved")        
        break;
      case 67:
        this.clickCopy()
        break;
      case 86:
        this.clickPaste()
        break;
      case 69:
        e.preventDefault()
        this.clickSelect()
        break;
      case 81:
        this.clickSquare()
        break;
      case 66:
        e.preventDefault()
        this.clickBucket()
        break;
    }
  }
  this.setState({shape:this.state.shape})
}
componentDidMount(){
  document.addEventListener('keydown',this.keydownHandler);
}
componentWillUnmount(){
  document.removeEventListener('keydown',this.keydownHandler);
}

// todo pixelize function
// todo stitchify
// potentially too slow DX
// copying IS taking too long...
// what if snapshot just stored differences in state... look at the staticCellCache (or have a changedCellSet)
// for each of those we store the current cell state
// for saving we will still want all of the relevant field
// wait - would this require backtracking through every second of mouse movement???
// at least through every entry of the mouse onto a new cell. Also how do we know how far back to go?
// ok how about we don't try using snapshots/reseting for squares?
// instead, we can use an overlay.
takeSnapshot() {
  // this.setState({snapshots: this.state.snapshots.concat({pattern:this.copyPattern(this.state.pattern), colors:{...this.state.colors}})});
  console.log("taking snapshot",this.state.changedCells)
  const priorCells = {}
  for(var key in this.state.changedCells) {
    var [x,y] = keyToXY(key);
    priorCells[key] = this.state.pattern.colorGrid[y][x];
  }
  // TODO remove the future snapshots - slice
  console.log("adding snapshot",priorCells)
  this.setState({snapshots: this.state.snapshots.concat({priorCells}), snapshotIndex:this.state.snapshotIndex+1||0});
  this.state.changedCells = new Set();
}

applySnapshot() {
  const priorCells = this.state.snapshots[this.state.snapshotIndex-2]
  console.log("snapIndex and priorCells",this.state.snapshotIndex-2,priorCells)
  for(var key of priorCells){
    var [x,y] = keyToXY(key);
    this.state.pattern.colorGrid[y][x] = priorCells[key];
  }
  this.setState({pattern:this.state.pattern, snapshotIndex:this.state.snapshotIndex-1})
}

setBoxes(pattern, func, corner1, corner2) {
    const [_leftx,_topy,_rightx,_bottomy] = cornerToBounds(corner1, corner2);
    for (var y = _topy; y < _bottomy; y++) {
        for (var x = _leftx; x < _rightx; x++) {
            func(pattern, x, y)
        }
    }

    return pattern
  }

  colorAtKey(key) {
    const [startx, starty] = keyToXY(key)
    return this.state.pattern.colorGrid[starty][startx]
  }

  paintBucket(start_box) {
    // recursive BFS 
    var pattern = this.state.pattern
    let visited = new Set();
    var color = this.colorAtKey(start_box)
    var selectedColor = this.state.selectedColor;
    var agenda = [start_box]

    while(agenda.length !== 0) {
      // console.log("agenda",agenda)
      const box_id = agenda.shift();
      visited.add(box_id);

      const [x, y] = keyToXY(box_id)
      if (pattern.colorGrid[y][x] === color) {
          pattern.colorGrid[y][x] = selectedColor
          this.state.staticCellCache[box_id] = null;
          // recurse on neighbors
          let child_id;
          for (var [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            child_id = (y+dy)+'-'+(x+dx)
            if (!visited.has(child_id)){
              if (0<=(x+dx) && (x+dx)<pattern.width){
                  if (0<=(y+dy) && (y+dy)<pattern.height){
                      agenda.push(child_id);
                  }
              }
            }
          }
      }
    }

    this.setState({pattern:pattern})
}

// todo - optimize to only update the overlay on changes
// todo - make the gridlines show up please
cellRangeRenderer(props) {
  const [children, cellCache] = defaultCellRangeRenderer(props, this.state.staticCellCache);
  this.setState({staticCellCache:cellCache})
 
  if((this.state.action === actions.SELECTION || this.state.action === actions.SQUARE) && this.state.selectedBox){

    var backgroundColor = "blue"
    var opacity = ".5"
    if(this.state.action === actions.SQUARE){
      backgroundColor = this.state.selectedColor
      opacity = ".8"
    }
    const [leftx, topy, rightx, bottomy] = cornerToBounds(this.state.selectedBox,this.state.corner2)
    var height = this.state.pattern.stitchHeight*(bottomy-topy);
    var width = this.state.pattern.stitchWidth*(rightx-leftx);
    children.unshift(<div key="hhh" style={{position:"absolute", zIndex:"1", opacity:opacity, 
                          backgroundColor:backgroundColor, height:height, width:width,
                          left:leftx*this.state.pattern.stitchWidth,
                          top:topy*this.state.pattern.stitchHeight,
                          pointerEvents:"none"}}></div>); 
  }
  
  return children;
}

  // TODO 
  // Better numbers - draggable, click and number shows
  // row tracker - should count the number of consecutive stitches - not too bad
  // save patterns - PYTHON flask XD
  // measuring tool - or a draggable ruler would be nice
  // hotkeys
  


  
  cellRenderer({columnIndex, key, rowIndex, style}) {
    var shape = this.state.shape
    if (this.state.stitchify){
      shape = "knit"
    }
    var className="stitch-shape-"+shape+"-inner"
    // todo enable multi class and option to remove borders
    if (this.state.selectedBox === key) {
      className += "-selected"
    }

    return (
      <div className="untouchable" key={key} style={style}  draggable={false}>
        
        <div className={"stitch-shape-"+shape} style={{backgroundColor: (this.state.selectedBox === key) ? "gray": "darkgray"}}
          onMouseDown = {(event) => this.boxOnMouseDown(event,columnIndex, rowIndex, key)}
          onMouseOver = {(event) => this.boxOnMouseOver(event,columnIndex, rowIndex, key)}
          onMouseUp = {(event) => this.boxOnMouseUp(event,columnIndex, rowIndex, key)}
          onDragStart= {(event) => event.preventDefault}
          onDragEnd = {(event) => event.preventDefault}
          onDragOver = {(event) => event.preventDefault}
        >

          <div className={className} style={{backgroundColor: this.state.pattern.colorGrid[rowIndex][columnIndex]}}>

          </div>


        </div>
  
      </div>
    );
  }

  
  
  render() {
    // onKeyPress={(event) => this.handleKeyPress(event)}
    var colorBoxes = [];
    for (var color of this.state.colors) {
        colorBoxes.push(renderColorBox(color, this.state.selectedColor===color, (color) => this.clickColor(color)));
    }
    var colorValue = this.state.selectedColor === null ? "#ffffff" : this.state.selectedColor
    return (
      <div className="main-window" onMouseUp = {(event) => this.universalMouseUp(event)} >
        <div className="control-panel">
          <span>Width:</span>
          <input type="number" value={this.state.pattern.width} onChange={this.changeWidth}/>
          <span>Height:</span>
          <input type="number" value={this.state.pattern.height} onChange={this.changeHeight}/>
          
          {this.classyButton(this.clickSelect, "select (ctrl+e)", actions.SELECTION)}
          {this.classyButton(this.clickCopy,"copy (ctrl+c)")}
          {this.classyButton(this.clickPaste,"paste (ctrl+v)")}
          {this.classyButton(this.clickBucket, "bucket (ctrl+b)", actions.BUCKET)}
          {this.classyButton(this.clickSquare, "square (ctrl+q)", actions.SQUARE)}
          {this.classyButton(this.clickStitchify, "stitchify")}
        </div>
        <div className = "workspace">
            <div className="tool-box">
                <p>Choose a color:</p>
                <input type="color" value={colorValue} onChange={this.changeColor}/>
                <div className="classy-button" onClick={this.addColor}>
                    Select
                </div>
                <br></br>
                {colorBoxes}
            </div>
            <div className="pattern-box">
            <AutoSizer>
              {({ width, height }) => (
                <Grid
                  cellRangeRenderer={this.cellRangeRenderer}
                  cellRenderer={this.cellRenderer}
                  columnCount={this.state.pattern.width}
                  columnWidth={this.state.pattern.stitchWidth}
                  height={height}
                  rowCount={this.state.pattern.height}
                  rowHeight={this.state.pattern.stitchHeight}
                  width={width}
                  pattern={this.state.pattern}
                  action={this.state.action}
                  selectedBox = {this.state.selectedBox}
                  staticCellCache = {this.state.staticCellCache}
                  corner2 = {this.state.corner2}
                  shape = {this.state.shape}
                />
              )}
              </AutoSizer>
            </div>
        </div>
    </div>
      

    );
  }
}

// var globalCellCache = {}

// function cellRangeRenderer(props) {
//   const [children, cellCache] = defaultCellRangeRenderer(props);
//   // this.setState({cellCache:cellCache})
//   children.push(<div key="hhh">My custom overlay</div>); // could use this for select box - much simpler no need to rerender children, jsut overlay
//   return children;
// }

export default App;
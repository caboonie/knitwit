import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Button from 'react-bootstrap/Button'

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
 
function cornerToBounds(corner1,corner2) {
  var [x1,y1] = keyToXY(corner1);
  var [x2,y2] = keyToXY(corner2);
  var leftx = Math.min(x1,x2)
  var rightx = Math.max(x1,x2)+1
  var topy = Math.min(y1,y2)
  var bottomy = Math.max(y1,y2)+1
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
    }

    this.changeColor = this.changeColor.bind(this);
    this.changeWidth = this.changeWidth.bind(this);
    this.changeHeight = this.changeHeight.bind(this);
    this.copy = this.copy.bind(this);
    this.clickCopy = this.clickCopy.bind(this);
    this.clickPaste = this.clickPaste.bind(this);
    this.clickSelect = this.clickSelect.bind(this);
    this.clickBucket = this.clickBucket.bind(this);
    this.addColor = this.addColor.bind(this);
    this.classyButton = this.classyButton.bind(this);
    this.cellRenderer = this.cellRenderer.bind(this);

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
    this.setState({pattern: pasted_pattern, action: actions.PENCIL, selection: make2DArray(pattern.width, pattern.height, false)});
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
    this.setState({pattern: pasted_pattern, action: actions.PENCIL, selection: make2DArray(pattern.width, pattern.height, false)});
}

copy(corner1 = null, corner2 = null) {
    
    if (corner1 === null) {
        // by default copy the whole pattern
        var copied = {...this.state.pattern}
        return copied
    } 
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
      destination.width = Math.max(destination.width, rightx);
      destination.height = Math.max(destination.height, bottomy);
      destination.colorGrid = make2DArray(destination.width, destination.height, "lightgray");
      destination.shapeGrid = make2DArray(destination.width, destination.height, "purl");
      destination = this.paste(copied, destination);
      this.setState({selection: make2DArray(destination.width, destination.height, false)});
    }
    
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
    }

    this.setState({selectedColor: selectedColor})
}

boxOnMouseDown(x,y, key) {

    var selectedBox = null
    if (this.state.selectedBox !== key) {
      selectedBox = key;
    }

    switch(this.state.action) {
        case actions.PENCIL:
          const pattern = {...this.state.pattern};
          pattern.colorGrid[y][x] = this.state.selectedColor || pattern.colorGrid[y][x]; 
          this.setState({
            pattern: pattern,
          })
          break;
        case actions.SELECTION:
          var selection = make2DArray(this.state.pattern.width, this.state.pattern.height, false);
          selection[y][x] = true;
          this.setState({
            selection: selection,
          })
          break;
        case actions.BUCKET:
          this.paintBucket(key)
        default:

    }
    this.setState({
        dragging: true,
        selectedBox: selectedBox,
    })
}    

boxOnMouseOver(x, y, key) {
  if (!this.state.dragging) {
    return
  }
  
  switch(this.state.action) {
    case actions.PENCIL:
      const pattern = {...this.state.pattern};
      if(pattern.colorGrid[y][x] === null || pattern.colorGrid[y][x] === this.state.selectedColor){
        return
      }
      pattern.colorGrid[y][x] = this.state.selectedColor; 
      this.setState({
        pattern: pattern,
      })
      break;
    case actions.SELECTION:
      var selection = make2DArray(this.state.pattern.width, this.state.pattern.height, false);
      const [leftx, topy, rightx, bottomy] = cornerToBounds(this.state.selectedBox, key);
      for (var _y = topy; _y < bottomy; _y++){
        for (var _x = leftx; _x < rightx; _x++) {
            selection[_y][_x] = true;
        }
      }
      this.setState({
        selection: selection,
        corner2: key,
      })
    default:  
  }
  
}

boxOnMouseUp(x, y, key) {
  
  this.setState({
    dragging: false,
  })
}

clickCopy() {
  if(this.state.action === actions.SELECTION){
    const pattern = this.copy(this.state.selectedBox, this.state.corner2)
    this.setState({action:actions.ARROW, clipboard: pattern})
  }
}

clickPaste() {
  if(this.state.clipboard !== null){
    const pattern = this.paste(this.state.clipboard, {...this.state.pattern}, this.state.selectedBox)
    this.setState({action:actions.ARROW, pattern:pattern})
  }
}

clickSelect() {
  if (this.state.action === actions.SELECTION) {
    this.setState({action: actions.PENCIL})
  } else {
    this.setState({action: actions.SELECTION})
  }
}

clickBucket() {
  if (this.state.action === actions.BUCKET) {
    this.setState({action: actions.PENCIL})
  } else {
    this.setState({action: actions.BUCKET})
  }
}

setBoxes(func, corner1, corner2) {
    const pattern = {...this.state.pattern};
    const [leftx,topy,rightx,bottomy] = cornerToBounds(corner1, corner2);
    for (var y = topy; y < bottomy; y++) {
        for (var x = leftx; x < rightx; x++) {
            func(pattern, x, y)
        }
    }

    this.setState({
        pattern: pattern,
    })
  }

  colorAtKey(key) {
    const [startx, starty] = keyToXY(key)
    return this.state.pattern.colorGrid[starty][startx]
  }

  paintBucket(start_box) {
    // recursive BFS 
    var pattern = {...this.state.pattern}
    let visited = new Set();
    var color = this.colorAtKey(start_box)
    var selectedColor = this.state.selectedColor;

    function paintBucketRecurse(box_id) {
        if (visited.has(box_id)) {
            return
        }

        visited.add(box_id);

        const [x, y] = keyToXY(box_id)
        if (pattern.colorGrid[y][x] === color) {
            pattern.colorGrid[y][x] = selectedColor
            // recurse on neighbors
            for (var [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                if (0<=(x+dx) && (x+dx)<pattern.width){
                    if (0<=(y+dy) && (y+dy)<pattern.height){
                        paintBucketRecurse((y+dy)+"-"+(x+dx))
                    }
                }
            }
        }
    }
    paintBucketRecurse(start_box)
    this.setState({pattern:pattern})
}

  // TODO optimization idea - have a set of cell that have changed and only re-render them if necessary
  // Better numbers - draggable, click and number shows
  // row tracker
  // measuring tool
  

  
  cellRenderer({columnIndex, key, rowIndex, style}) {
    var className="stitch-box" 
    if (this.state.selectedBox === key) {
      className += " selected-box"
    }
    var overlayColor = 'rgba(0,0,0,0)';
    if (this.state.action === actions.SELECTION && !this.state.selection[rowIndex][columnIndex]) {
      overlayColor = 'rgba(0,0,0,0.3)'
    }

    return (
      <div key={key} style={style} className={className} 
           onMouseDown = {() => this.boxOnMouseDown(columnIndex, rowIndex, key)}
           onMouseOver = {() => this.boxOnMouseOver(columnIndex, rowIndex, key)}
           onMouseUp = {() => this.boxOnMouseUp(columnIndex, rowIndex, key)}
      >
        
        <div style={{backgroundColor: this.state.pattern.colorGrid[rowIndex][columnIndex]}}>
          <div name = "overlay" style={{backgroundColor:overlayColor}}>

          </div>
        </div>
  
      </div>
    );
  }

  
  
  render() {
    var colorBoxes = [];
    for (var color of this.state.colors) {
        colorBoxes.push(renderColorBox(color, this.state.selectedColor===color, (color) => this.clickColor(color)));
    }
    var colorValue = this.state.selectedColor === null ? "#ffffff" : this.state.selectedColor
    return (
      <div className="main-window">
        <div className="control-panel">
          <span>Width:</span>
          <input type="number" value={this.state.pattern.width} onChange={this.changeWidth}/>
          <span>Height:</span>
          <input type="number" value={this.state.pattern.height} onChange={this.changeHeight}/>
          
          {this.classyButton(this.clickSelect, "select", actions.SELECTION)}
          {this.classyButton(this.clickCopy,"copy")}
          {this.classyButton(this.clickPaste,"paste")}
          {this.classyButton(this.clickBucket, "bucket", actions.BUCKET)}
        </div>
        <div className = "workspace">
            <div className="tool-box">
                <p>Choose a color:</p>
                <input type="color" value={colorValue} onChange={this.changeColor}/>
                <div className="classy-button" onClick={this.addColor}>
                    Select
                </div>
                {colorBoxes}
            </div>
            <div className="pattern-box">
            <AutoSizer>
              {({ width, height }) => (
                <Grid
                  cellRenderer={this.cellRenderer}
                  columnCount={this.state.pattern.width}
                  columnWidth={this.state.pattern.stitchWidth}
                  height={height}
                  rowCount={this.state.pattern.height}
                  rowHeight={this.state.pattern.stitchHeight}
                  width={width}
                  pattern={this.state.pattern}
                  action={this.state.action}
                  selection = {this.state.selection}
                  selectedBox = {this.state.selectedBox}
                />
              )}
              </AutoSizer>
            </div>
        </div>
    </div>
      

    );
  }
}


export default App;
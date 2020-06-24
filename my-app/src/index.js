import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
  
  /*
  component for each individual stitch_box
  pattern_box as parent
    
  main with state
    stores action state (str)
    stores grid of colors (str), selected (bool), previous color (str)
    onclick function for stitch box
    onmousedown, onmousedrag, onmouseup

  control_panel
  toolbox as parent
  color_box


  */
 const actions = {
     PENCIL: 'pencil',
     ARROW: 'arrow',
     SELECTION: 'selection',
     BUCKET: 'bucket',
     SQUARE: 'square',
     DROPPER: 'dropper'
 }



 function StitchBox(props) {
    var shapeClass = "stitch-shape-"+props.shape;
     return (
        <div className="stitch-box" 
             style={{width: props.stitchWidth, height:props.stitchHeight, opacity: props.opacity, backgroundColor: props.color}}
             onClick = {props.onClick}
        >
            <div className={shapeClass} style={{}}></div>
        </div>
     ); 
 }

 function renderStitch(x,y,pattern, isSelecting, onClick) {
    //  console.log(pattern.shapeGrid,y,x)
     return (
         <StitchBox
            stitchHeight={pattern.stitchHeight}
            stitchWidth={pattern.stitchWidth}
            // opacity={isSelecting ^ props.selectGrid[y][x]}
            shape={pattern.shapeGrid[y][x]}
            color={pattern.colorGrid[y][x]}
            key = {y*pattern.width+x}
            onClick={() => onClick(x,y)}
         />
     )
 }


 class PatternBox extends React.Component {
    constructor(props) {
        super(props);
        console.log("constructing patternBox")
        this.state = {}
    }



    render() {
        console.log(this.props)
        const pattern = this.props.pattern
        // console.log("shape grid",pattern.shapeGrid,"color grid", pattern.colorGrid,pattern.width,pattern.stitchWidth)
        var stitches = [];
        for (var y = 0; y < pattern.height; y++) {
            for (var x = 0; x < pattern.width; x++) {
                stitches.push(renderStitch(x,y,pattern, this.props.isSelecting, this.props.handleBoxClick));
            }
        }
        return (
            <div className="pattern-box">
                <div className="pattern-sub-box">
                    <div className="pattern-sub-sub-box" style={{width: pattern.width*pattern.stitchWidth, height: pattern.height*pattern.stitchHeight}}> 
                        {stitches}
                    </div>
                </div>
            </div>
        )
    }
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


var initWidth = 4;
var initHeight = 3;
const maxWidth = 200;
const maxHeight = 200;

 class Main extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedColor: null,
            colors: [],
            action: null,
            pattern: {
                colorGrid: this.make2DArray(initWidth, initHeight, "lightgray"),
                shapeGrid: this.make2DArray(initWidth, initHeight, "purl"),
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
        this.addColor = this.addColor.bind(this);

    }

    changeColor(event) {
        this.setState({selectedColor: event.target.value});
        console.log("colors",this.state.selectedColor)
    }

    changeWidth(event) {
        var newWidth = Math.max(Math.min(maxWidth,parseInt(event.target.value)),1)
        var pattern = {...this.state.pattern};
        var copied = this.copy()
        pattern.width = newWidth;
        pattern.colorGrid = this.make2DArray(pattern.width, pattern.height, "lightgray");
        pattern.shapeGrid = this.make2DArray(pattern.width, pattern.height, "purl");
        var pasted_pattern = this.paste(copied, pattern)
        this.setState({pattern: pasted_pattern});
    }

    changeHeight(event) {
        var newHeight= Math.max(Math.min(maxHeight,parseInt(event.target.value)),1)
        var pattern = {...this.state.pattern};
        var copied = this.copy()
        pattern.height = newHeight;
        pattern.colorGrid = this.make2DArray(pattern.width, pattern.height, "lightgray");
        pattern.shapeGrid = this.make2DArray(pattern.width, pattern.height, "purl");
        // this.setState({pattern: pattern});
        var pasted_pattern = this.paste(copied, pattern)
        this.setState({pattern: pasted_pattern});
    }

    copy(corner1 = null, corner2 = null) {
        
        if (corner1 === null) {
            // by default copy the whole pattern
            var copied = {...this.state.pattern}
            console.log("copied",copied)
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
        this.setState({clipboard: pattern})
        return pattern
    }

    paste(pattern, destination, corner = [0,0]) {
        console.log("destination",destination, "copied", pattern)
        var leftx = corner[0];
        var topy = corner[1];
        var bottomy = Math.min(destination.height, topy+pattern.height)
        var rightx = Math.min(destination.width, leftx+pattern.width)
        
        // TODO - increase the width and height of the pattern box to allow ful paste
        console.log("dims",leftx,rightx,topy,bottomy)
        for (var y = topy; y < bottomy; y++){
            for (var x = leftx; x < rightx; x++) {
                destination.colorGrid[y][x] = pattern.colorGrid[y-topy][x-leftx]
                destination.shapeGrid[y][x] = pattern.shapeGrid[y-topy][x-leftx]
            }
        }
        console.log("final destination", destination)
        return destination;
    }

    addColor(event) {
        if (!this.state.colors.includes(this.state.selectedColor) && this.state.selectedColor != null) {
            this.setState({
                colors: this.state.colors.concat([this.state.selectedColor]),
            })
            console.log("colors",this.state.colors)
        }
    }

    clickColor(color) {
        var selectedColor = null
        if (this.state.selectedColor !== color) {
            selectedColor = color;
        }
        this.setState({selectedColor: selectedColor})
    }

    handleBoxClick(x,y) {
        console.log("click on ",x,y,this.state.selectedColor)
        const pattern = {...this.state.pattern};
        if (this.state.selectedColor != null) {
            pattern.colorGrid[y][x] = this.state.selectedColor;
        }
        switch(this.state.action) {
            case actions.PENCIL:
                pattern.colorGrid[y][x] = this.state.selectedColor; // this.state.selectedColor;
            default:

        }
        this.setState({
            pattern: pattern,
        })
    }    
    
    make2DArray(_width,_height,filling) {
        var array = []
        for (var y = 0; y < _height; y++) {
            array.push(Array(_width).fill(filling));
        }
        console.log("array",array, _width, Array(_width), Array(_width).fill(filling))
        return array
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

    render() {
        // const snapshots = this.state.snapshots
        // const current = snapshots[snapshots.length-1]
        var colorBoxes = [];
        console.log("colors here",this.state.colors)
        for (var color of this.state.colors) {
            colorBoxes.push(renderColorBox(color, this.state.selectedColor===color, (color) => this.clickColor(color)));
        }
        var colorValue = this.state.selectedColor === null ? "#ffffff" : this.state.selectedColor
        console.log("rendering", this.state.pattern.width)
        return (
            <div className="main-window">
                <div className="control-panel">
                <span>Width:</span>
                <input type="number" value={this.state.pattern.width} onChange={this.changeWidth}/>
                <span>Height:</span>
                <input type="number" value={this.state.pattern.height} onChange={this.changeHeight}/>
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
                    <PatternBox 
                        pattern = {this.state.pattern}
                        isSelecting = {this.action === actions.SELECTION}
                        selectedColor = {this.state.selectedColor}
                        handleBoxClick = {(x,y) => this.handleBoxClick(x,y)}
                    />
                </div>
            </div>
        );
    }
}

function cornerToBounds(_corner1,_corner2) {
    var leftx = Math.min(_corner1.data("x"),_corner2.data("x"))
    var rightx = Math.max(_corner1.data("x"),_corner2.data("x"))+1
    var topy = Math.min(_corner1.data("y"),_corner2.data("y"))
    var bottomy = Math.max(_corner1.data("y"),_corner2.data("y"))+1
    return [leftx,topy,rightx,bottomy]
}

  // ========================================
  
  ReactDOM.render(
    <Main />,
    document.getElementById('root')
  );
  
Partial webpack.config.js
{
    alias: {
      'react-virtualized/List': 'react-virtualized/dist/es/List',
    },
    ...rest
  }

import React from 'react';
import ReactDOM from 'react-dom';
import {Grid} from 'react-virtualized';

// i can store my pattern in the global context so the cellRenderers have access
// Grid data as an array of arrays
const list = [
  ['Brian Vaughn', 'Software Engineer', 'San Jose', 'CA', 95125 /* ... */],
  // And so on...
];

function cellRenderer({columnIndex, key, rowIndex, style}) {
  return (
    <div key={key} style={style}>
      {list[rowIndex][columnIndex]}
    </div>
  );
}

// Render your grid
ReactDOM.render(
  <Grid
    cellRenderer={cellRenderer}
    columnCount={list[0].length}
    columnWidth={100}
    height={300}
    rowCount={list.length}
    rowHeight={30}
    width={300}
  />,
  <div>Hey</div>,
  document.getElementById('root'),
);
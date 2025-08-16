# Interactive Graph Visualization

A powerful, interactive graph visualization system that displays hierarchical graph structures with multiple zoom levels and detailed hover information.

## Features

### 🎯 Multi-Level Zoom Visualization
- **Low Zoom (0.1-0.3)**: View objects and their connections
- **Medium Zoom (0.3-0.7)**: See objects with internal connections
- **High Zoom (0.7-2.0)**: Detailed view of nodes and edges within objects

### 🖱️ Interactive Controls
- **Mouse Pan**: Click and drag to move around the graph
- **Mouse Wheel**: Zoom in/out to see different levels of detail
- **Hover Information**: Hover over any element to see detailed information
- **Slider Control**: Use the zoom slider for precise zoom control

### 📊 Hierarchical Structure
- **Objects**: High-level containers (processors, routers, storage, etc.)
- **Nodes**: Internal components within objects (input, output, processing, etc.)
- **Edges**: Connections between nodes within objects
- **Connections**: Links between different objects

### 💡 Hover Information
When you hover over different elements, you'll see:

**Objects:**
- ID and Type
- Performance percentage
- Capacity
- Number of internal nodes and edges

**Nodes:**
- Node ID and Type
- Current load percentage
- Parent object information

**Edges:**
- Edge ID and Type
- Bandwidth and latency
- Source and destination nodes

**Connections:**
- Connection ID and Type
- Bandwidth, latency, and length
- Source and destination objects

## Controls

### Left Panel Controls
- **Zoom Level Slider**: Adjust zoom from 0 to 100
- **Object Count**: Number of objects to generate (1-20)
- **Node Density**: Density of nodes within objects (1-10)
- **Regenerate Graph**: Create a new random graph

### Bottom Left Display
- **Current Zoom Level**: Low/Medium/High
- **Current View**: Objects/Objects + Connections/All Details

## How to Use

1. **Open the HTML file** in your web browser
2. **Navigate**: Use mouse to pan around the graph
3. **Zoom**: Use mouse wheel or slider to zoom in/out
4. **Explore**: Hover over elements to see detailed information
5. **Customize**: Adjust settings in the left panel
6. **Regenerate**: Click "Regenerate Graph" for a new layout

## Technical Details

### Architecture
- **HTML5 Canvas**: For smooth, interactive rendering
- **JavaScript Classes**: Object-oriented design for maintainability
- **Event-Driven**: Responsive to mouse and keyboard interactions
- **Color-Coded**: Different colors for different types of elements

### Performance Features
- **Efficient Rendering**: Only draws visible elements at appropriate zoom levels
- **Smooth Interactions**: 60fps rendering with optimized event handling
- **Responsive Design**: Adapts to different screen sizes
- **Memory Efficient**: Minimal object creation during interactions

### Data Structure
```javascript
// Object structure
{
  id: "obj_0",
  x: 100, y: 100,
  width: 150, height: 100,
  type: "processor",
  performance: 85.5,
  capacity: 500,
  nodes: [...],
  edges: [...]
}

// Node structure
{
  id: "node_0_0",
  x: 20, y: 20,
  type: "input",
  load: 75.2
}

// Edge structure
{
  id: "edge_0_0",
  from: node1,
  to: node2,
  type: "data",
  bandwidth: 500,
  latency: 2.5
}
```

## Customization

You can easily customize the visualization by modifying the JavaScript file:

- **Add new object types**: Modify the `getObjectColor()` function
- **Add new node types**: Modify the `getNodeColor()` function
- **Change hover information**: Modify the info display functions
- **Adjust zoom levels**: Modify the zoom threshold values
- **Add new data fields**: Extend the object/node/edge structures

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Getting Started

1. Clone or download the files
2. Open `index.html` in your web browser
3. Start exploring the interactive graph!

## Future Enhancements

- **Data Import**: Load real graph data from JSON/CSV
- **Export Features**: Save graph layouts and configurations
- **Advanced Filtering**: Filter by type, performance, etc.
- **Animation**: Animated transitions between zoom levels
- **Search**: Find specific nodes or objects
- **Path Highlighting**: Highlight paths between selected elements 
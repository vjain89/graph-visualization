# yFiles LOD Graph Visualization

This branch explores a completely different approach using **yFiles for HTML** instead of Cytoscape.js, with a focus on **Level-of-Detail (LOD) rendering**.

## Key Features

### 🎯 **Level-of-Detail Rendering**
- **Assembly View**: Shows assemblies as rectangles with input/output ports
- **Component View**: Shows internal component structure when zoomed in
- **Automatic LOD Switching**: Based on zoom level (threshold: 1.5x zoom)

### 🔌 **Port-Based Visualization**
- **Input Ports**: Green dots on the left side of assembly boxes
- **Output Ports**: Pink dots on the right side of assembly boxes
- **Precise Connectivity**: Only draws lines between actually connected ports

### 🎨 **yFiles Advantages**
- **Professional Graph Library**: Industry-standard for complex graph visualizations
- **Built-in Port Support**: Native support for port-based node layouts
- **Advanced Styling**: Rich styling options for nodes, edges, and labels
- **Performance**: Optimized for large graphs with smooth interactions

## Architecture

### Data Structure
```json
{
  "assemblies": {
    "source": {"components": {"source_branch": 12}},
    "flange": {"components": {"ribbon": 4}},
    "controller": {"components": {"digitizer": 2}}
  },
  "components": {
    "source_branch": {
      "inputs": ["pump_in"],
      "outputs": ["pump_out", "photon_out", "detector_out"]
    },
    "ribbon": {"channels": 12},
    "digitizer": {"inputs": 1}
  },
  "boxes": {
    "box_1": {
      "assemblies": {...},
      "connectivity": [...]
    }
  }
}
```

### LOD Implementation
- **Zoom Threshold**: 1.5x zoom triggers component view
- **View Modes**: Assembly (overview) ↔ Component (detail)
- **Smooth Transitions**: Automatic switching based on user interaction

## Usage

1. **Open `index.html`** in a web browser
2. **Assembly View**: Default view showing assembly boxes with ports
3. **Zoom In**: Automatically switches to component view
4. **Zoom Out**: Automatically switches back to assembly view
5. **Manual Controls**: Use buttons to force view mode changes

## Controls

- **Assembly View**: Force assembly-level view
- **Component View**: Force component-level view  
- **Reset Zoom**: Reset to default zoom level

## Technical Details

### yFiles Integration
- Uses yFiles for HTML demo version (free for evaluation)
- Full-featured graph component with professional styling
- Native port support for precise connectivity visualization

### Port Creation Logic
- **Ribbon Components**: Creates 12 channels per ribbon (4 ribbons = 48 ports)
- **Source Branch Components**: Creates input + 3 outputs per branch (12 branches = 48 ports)
- **Digitizer Components**: Creates 1 input per digitizer (2 digitizers = 2 ports)

### Connectivity Mapping
- Maps connectivity paths like `flange0.ribbon_1.1` to actual port nodes
- Only creates edges between ports that are actually connected
- Supports complex port path formats with multiple levels

## Future Enhancements

- **Hierarchical LOD**: Multiple zoom levels with different detail levels
- **Interactive Ports**: Click ports to show connection details
- **Animation**: Smooth transitions between LOD levels
- **Custom Styling**: More sophisticated visual styling
- **Performance**: Optimize for larger datasets

## Comparison with Cytoscape.js

| Feature | Cytoscape.js | yFiles for HTML |
|---------|--------------|-----------------|
| Port Support | Manual implementation | Native support |
| LOD Rendering | Custom logic | Built-in capabilities |
| Styling | CSS-based | Rich styling API |
| Performance | Good | Excellent |
| Learning Curve | Moderate | Steeper |
| Cost | Free | Commercial (demo available) |

This approach provides a more professional foundation for complex graph visualizations with better support for the specific requirements of port-based assembly visualization.

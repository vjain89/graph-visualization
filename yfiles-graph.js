/**
 * yFiles LOD Graph Visualization
 * 
 * This implementation explores level-of-detail rendering with yFiles for HTML.
 * Features:
 * - Assembly view: Shows assemblies as rectangles with ports
 * - Component view: Shows internal component structure
 * - Zoom-based LOD switching
 * - Port-based connectivity
 */

class YFilesLODGraph {
    constructor() {
        this.graphComponent = null;
        this.graph = null;
        this.currentViewMode = 'assembly';
        this.zoomThreshold = 0.5; // Switch to component view when zoomed in past this threshold
        
        this.init();
    }
    
    init() {
        // Create the graph component
        this.graphComponent = new yfiles.view.GraphComponent('graphComponent');
        this.graph = this.graphComponent.graph;
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load initial data
        this.loadData();
        
        // Create initial assembly view
        this.createAssemblyView();
        
        // Fit the graph to the viewport
        this.graphComponent.fitGraphBounds();
    }
    
    setupEventListeners() {
        // Listen for zoom changes to trigger LOD switching
        this.graphComponent.addViewportChangedListener((sender, args) => {
            this.updateZoomInfo();
            this.checkLODSwitch();
        });
        
        // Listen for selection changes
        this.graphComponent.addSelectionChangedListener((sender, args) => {
            this.onSelectionChanged();
        });
    }
    
    loadData() {
        // Load the assembly and component data
        this.assemblies = {
            "source": {
                "components": {"source_branch": 12}
            },
            "flange": {
                "components": {"ribbon": 4}
            },
            "controller": {
                "components": {"digitizer": 2}
            }
        };
        
        this.components = {
            "source_branch": {
                "inputs": ["pump_in"],
                "outputs": ["pump_out", "photon_out", "detector_out"]
            },
            "ribbon": {
                "channels": 12
            },
            "digitizer": {
                "inputs": 1
            }
        };
        
        this.boxes = {
            "box_1": {
                "assemblies": {
                    "flange": "flange0", 
                    "source": "source0", 
                    "controller": "controller0"
                },
                "connectivity": [
                    {"from": "flange0.ribbon_1.1", "to": "source0.component_1.inputs.pump_in"},
                    {"from": "flange0.ribbon_1.2", "to": "source0.component_2.inputs.pump_in"},
                    {"from": "flange0.ribbon_2.1", "to": "source0.component_1.outputs.pump_out"},
                    {"from": "flange0.ribbon_2.2", "to": "source0.component_2.outputs.pump_out"},
                    {"from": "flange0.ribbon_3.1", "to": "source0.component_1.outputs.photon_out"},
                    {"from": "flange0.ribbon_3.2", "to": "source0.component_2.outputs.photon_out"},
                    {"from": "source0.component_1.outputs.detector_out", "to": "controller0.digitizer_1"},
                    {"from": "source0.component_2.outputs.detector_out", "to": "controller0.digitizer_2"}
                ]
            }
        };
    }
    
    createAssemblyView() {
        this.currentViewMode = 'assembly';
        this.graph.clear();
        
        const box = this.boxes.box_1;
        const assemblies = box.assemblies;
        const connectivity = box.connectivity;
        
        // Create assembly nodes with ports
        const assemblyNodes = new Map();
        let x = 100;
        const y = 200;
        const spacing = 400;
        
        for (const [assemblyType, assemblyId] of Object.entries(assemblies)) {
            const assemblyNode = this.createAssemblyNode(assemblyId, assemblyType, x, y);
            assemblyNodes.set(assemblyId, assemblyNode);
            x += spacing;
        }
        
        // Create connectivity edges
        this.createConnectivityEdges(connectivity, assemblyNodes);
        
        // Update UI
        document.getElementById('viewMode').textContent = 'Assembly';
        
        // Fit the graph
        this.graphComponent.fitGraphBounds();
    }
    
    createAssemblyNode(assemblyId, assemblyType, x, y) {
        const assemblyDef = this.assemblies[assemblyType];
        
        // Create the main assembly rectangle
        const assemblyNode = this.graph.createNode({
            layout: new yfiles.geometry.Rect(x, y, 300, 200),
            style: new yfiles.styles.RectangleNodeStyle({
                fill: '#e8f4fd',
                stroke: '#4a90e2',
                strokeThickness: 3
            }),
            tag: {
                id: assemblyId,
                type: 'assembly',
                assemblyType: assemblyType
            }
        });
        
        // Add label
        this.graph.addLabel(assemblyNode, `${assemblyType}\n(${assemblyId})`, 
            new yfiles.geometry.Point(150, 100), 
            new yfiles.styles.DefaultLabelStyle({
                font: new yfiles.styles.Font('Arial', 16, yfiles.styles.FontWeight.BOLD),
                textFill: '#222'
            })
        );
        
        // Create ports based on component definitions
        this.createAssemblyPorts(assemblyNode, assemblyId, assemblyType, assemblyDef);
        
        return assemblyNode;
    }
    
    createAssemblyPorts(assemblyNode, assemblyId, assemblyType, assemblyDef) {
        if (!assemblyDef || !assemblyDef.components) return;
        
        let portIndex = 0;
        const portSpacing = 15;
        const startY = 20;
        
        for (const [componentType, count] of Object.entries(assemblyDef.components)) {
            const componentDef = this.components[componentType];
            if (!componentDef) continue;
            
            // Handle ribbon channels
            if (componentType === 'ribbon' && componentDef.channels) {
                for (let i = 0; i < count; i++) {
                    for (let j = 1; j <= componentDef.channels; j++) {
                        const portId = `${assemblyId}.ribbon_${i+1}.${j}`;
                        const portY = startY + portIndex * portSpacing;
                        
                        this.createPort(assemblyNode, portId, `${j}`, 'output', 
                            new yfiles.geometry.Point(300, portY), 'pink');
                        portIndex++;
                    }
                }
            }
            // Handle source_branch components
            else if (componentType === 'source_branch') {
                // Input ports
                if (componentDef.inputs) {
                    for (let i = 0; i < count; i++) {
                        for (let j = 0; j < componentDef.inputs.length; j++) {
                            const portId = `${assemblyId}.component_${i+1}.inputs.${componentDef.inputs[j]}`;
                            const portY = startY + portIndex * portSpacing;
                            
                            this.createPort(assemblyNode, portId, componentDef.inputs[j], 'input',
                                new yfiles.geometry.Point(0, portY), 'lightgreen');
                            portIndex++;
                        }
                    }
                }
                
                // Output ports
                if (componentDef.outputs) {
                    for (let i = 0; i < count; i++) {
                        for (let j = 0; j < componentDef.outputs.length; j++) {
                            const portId = `${assemblyId}.component_${i+1}.outputs.${componentDef.outputs[j]}`;
                            const portY = startY + portIndex * portSpacing;
                            
                            this.createPort(assemblyNode, portId, componentDef.outputs[j], 'output',
                                new yfiles.geometry.Point(300, portY), 'pink');
                            portIndex++;
                        }
                    }
                }
            }
            // Handle digitizer components
            else if (componentType === 'digitizer') {
                for (let i = 0; i < count; i++) {
                    const portId = `${assemblyId}.digitizer_${i+1}`;
                    const portY = startY + portIndex * portSpacing;
                    
                    this.createPort(assemblyNode, portId, `digitizer_${i+1}`, 'input',
                        new yfiles.geometry.Point(0, portY), 'lightgreen');
                    portIndex++;
                }
            }
        }
    }
    
    createPort(parentNode, portId, label, type, position, color) {
        // Create a port node
        const portNode = this.graph.createNode({
            layout: new yfiles.geometry.Rect(position.x - 6, position.y - 6, 12, 12),
            style: new yfiles.styles.EllipseNodeStyle({
                fill: color,
                stroke: type === 'input' ? '#228B22' : '#DC143C',
                strokeThickness: 2
            }),
            tag: {
                id: portId,
                type: 'port',
                portType: type,
                parentAssembly: parentNode.tag.id
            }
        });
        
        // Add port label
        this.graph.addLabel(portNode, label,
            new yfiles.geometry.Point(position.x, position.y),
            new yfiles.styles.DefaultLabelStyle({
                font: new yfiles.styles.Font('Arial', 10, yfiles.styles.FontWeight.BOLD),
                textFill: '#000'
            })
        );
        
        return portNode;
    }
    
    createConnectivityEdges(connectivity, assemblyNodes) {
        connectivity.forEach((conn, index) => {
            const sourcePort = this.findPortNode(conn.from);
            const targetPort = this.findPortNode(conn.to);
            
            if (sourcePort && targetPort) {
                this.graph.createEdge({
                    source: sourcePort,
                    target: targetPort,
                    style: new yfiles.styles.PolylineEdgeStyle({
                        stroke: '#ff6b6b',
                        strokeThickness: 2,
                        targetArrow: yfiles.styles.ArrowType.TRIANGLE
                    }),
                    tag: {
                        id: `conn_${index}`,
                        connection: conn
                    }
                });
            }
        });
    }
    
    findPortNode(portPath) {
        // Find the port node by its ID
        const portNodes = this.graph.nodes.filter(node => 
            node.tag && node.tag.type === 'port' && node.tag.id === portPath
        );
        return portNodes.length > 0 ? portNodes[0] : null;
    }
    
    createComponentView() {
        this.currentViewMode = 'component';
        this.graph.clear();
        
        // Create a simplified component view showing internal structure
        const componentNode = this.graph.createNode({
            layout: new yfiles.geometry.Rect(200, 200, 400, 300),
            style: new yfiles.styles.RectangleNodeStyle({
                fill: '#fff',
                stroke: '#bbb',
                strokeThickness: 2
            }),
            tag: {
                id: 'component1',
                type: 'component'
            }
        });
        
        // Add component label
        this.graph.addLabel(componentNode, 'Component Internal View',
            new yfiles.geometry.Point(400, 220),
            new yfiles.styles.DefaultLabelStyle({
                font: new yfiles.styles.Font('Arial', 18, yfiles.styles.FontWeight.BOLD),
                textFill: '#888'
            })
        );
        
        // Create some internal nodes
        const internalNodes = ['Node A', 'Node B', 'Node C', 'Node D'];
        internalNodes.forEach((label, index) => {
            const x = 250 + (index % 2) * 200;
            const y = 280 + Math.floor(index / 2) * 80;
            
            const node = this.graph.createNode({
                layout: new yfiles.geometry.Rect(x, y, 60, 40),
                style: new yfiles.styles.RectangleNodeStyle({
                    fill: '#4a90e2',
                    stroke: '#357abd',
                    strokeThickness: 2
                }),
                tag: {
                    id: `internal_${index}`,
                    type: 'internal'
                }
            });
            
            this.graph.addLabel(node, label,
                new yfiles.geometry.Point(x + 30, y + 20),
                new yfiles.styles.DefaultLabelStyle({
                    font: new yfiles.styles.Font('Arial', 12),
                    textFill: '#fff'
                })
            );
        });
        
        // Update UI
        document.getElementById('viewMode').textContent = 'Component';
        
        // Fit the graph
        this.graphComponent.fitGraphBounds();
    }
    
    checkLODSwitch() {
        const zoom = this.graphComponent.zoom;
        
        // Switch to component view when zoomed in
        if (zoom > 1.5 && this.currentViewMode === 'assembly') {
            this.createComponentView();
        }
        // Switch back to assembly view when zoomed out
        else if (zoom < 0.8 && this.currentViewMode === 'component') {
            this.createAssemblyView();
        }
    }
    
    updateZoomInfo() {
        const zoom = this.graphComponent.zoom;
        document.getElementById('zoomLevel').textContent = zoom.toFixed(2);
    }
    
    onSelectionChanged() {
        const selection = this.graphComponent.selection;
        console.log('Selection changed:', selection.selectedNodes.size, 'nodes selected');
    }
}

// Global functions for the control buttons
let graph;

function loadAssemblyView() {
    if (graph) {
        graph.createAssemblyView();
    }
}

function loadComponentView() {
    if (graph) {
        graph.createComponentView();
    }
}

function resetZoom() {
    if (graph) {
        graph.graphComponent.zoom = 1.0;
        graph.graphComponent.center = new yfiles.geometry.Point(0, 0);
    }
}

// Initialize when the page loads
window.addEventListener('load', () => {
    graph = new YFilesLODGraph();
});

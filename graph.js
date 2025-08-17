class GraphVisualization {
    constructor() {
        this.cy = null;
        this.objectTypes = {};
        this.connectionTypes = {};
        this.linkTypes = {};
        this.layout = null;
        this.simpleGraph = null;
        this.currentMode = 'layout';
        this.latticeType = 'square';
        
        this.setupEventListeners();
        this.loadData().then(() => {
            this.loadLayout();
            this.initializeCytoscape();
        });
    }
    
    async loadData() {
        try {
            const [objectsResponse, connectionsResponse, layoutResponse, simpleGraphResponse] = await Promise.all([
                fetch('objects.json?v=1'),
                fetch('connections.json?v=1'),
                fetch('layout.json?v=1'),
                fetch('graph-input.json')
            ]);
            
            const objectsData = await objectsResponse.json();
            const connectionsData = await connectionsResponse.json();
            const layoutData = await layoutResponse.json();
            const simpleGraphData = await simpleGraphResponse.json();
            
            this.objectTypes = objectsData.objectTypes;
            this.connectionTypes = connectionsData.connectionTypes;
            this.linkTypes = connectionsData.linkTypes;
            this.layout = layoutData;
            this.simpleGraph = simpleGraphData;
        } catch (error) {
            console.error('Error loading JSON data:', error);
        }
    }
    
    setupEventListeners() {
        document.getElementById('zoom-slider').addEventListener('input', (e) => {
            const zoomLevel = e.target.value / 50;
            if (this.cy) {
                this.cy.zoom({
                    level: zoomLevel,
                    renderedPosition: { x: this.cy.width() / 2, y: this.cy.height() / 2 }
                });
            }
            this.updateZoomText();
        });

        document.getElementById('layout-selector').addEventListener('change', (e) => {
            this.currentMode = e.target.value;
            this.initializeCytoscape();
        });

        document.getElementById('lattice-selector').addEventListener('change', (e) => {
            this.latticeType = e.target.value;
            if (this.currentMode === 'simple') {
                this.initializeCytoscape();
            }
        });

        document.getElementById('regenerate').addEventListener('click', () => {
            this.initializeCytoscape();
        });
    }
    
    loadLayout() {
        if (!this.layout) return;
        
        // Layout is now handled by Cytoscape.js
        // We just need to prepare the data
    }
    
    initializeCytoscape() {
        if (this.cy) {
            this.cy.destroy();
        }
        let elements, layoutConfig;
        if (this.currentMode === 'simple') {
            elements = this.createSimpleGraphElements();
            layoutConfig = {
                name: 'preset',
                positions: this.getSimpleNodePositions(),
                fit: true,
                padding: 50
            };
        } else {
            elements = this.createCytoscapeElements();
            layoutConfig = {
                name: 'preset',
                positions: this.getNodePositions(),
                fit: false,
                padding: 50
            };
        }
        this.cy = cytoscape({
            container: document.getElementById('cy'),
            elements: elements,
            style: this.getCytoscapeStyle(),
            layout: layoutConfig,
            wheelSensitivity: 0.3,
            minZoom: 0.1,
            maxZoom: 3
        });
        this.setupCytoscapeEvents();
        this.updateZoomText();
        setTimeout(() => {
            this.updateEdgeScaling();
        }, 100);
    }
    
    createCytoscapeElements() {
        const elements = [];
        
        // Create nodes (objects)
        for (const objData of this.layout.objects) {
            const objectTemplate = this.objectTypes[objData.type];
            if (!objectTemplate) continue;
            
            elements.push({
                group: 'nodes',
                data: {
                    id: objData.id,
                    label: objData.id,
                    type: objData.type,
                    color: objectTemplate.color,
                    width: objectTemplate.width,
                    height: objectTemplate.height,
                    objectType: objectTemplate,
                    inputs: objectTemplate.inputs,
                    outputs: objectTemplate.outputs
                },
                position: { x: objData.x, y: objData.y }
            });
        }
        
        // Create edges (connections)
        for (const connData of this.layout.connections) {
            const fromObj = this.layout.objects.find(o => o.id === connData.from.object);
            const toObj = this.layout.objects.find(o => o.id === connData.to.object);
            
            if (fromObj && toObj) {
                const connectionType = this.connectionTypes[connData.type];
                const edgeData = {
                    id: connData.id,
                    source: connData.from.object,
                    target: connData.to.object,
                    type: connData.type,
                    color: connectionType ? connectionType.color : '#444',
                    lineWidth: connectionType ? connectionType.lineWidth : 2,
                    length: connData.length || 100,
                    latency: connData.latency || 1.0,
                    linkType: connData.linkType || 'simple',
                    fromPort: connData.from.output,
                    toPort: connData.to.input,
                    connectionType: connectionType,
                    linkTypeData: this.linkTypes[connData.linkType || 'simple']
                };
                
                console.log('Edge data for', connData.id, ':', edgeData);
                
                console.log('Creating edge:', edgeData);
                elements.push({
                    group: 'edges',
                    data: edgeData
                });
            } else {
                console.warn('Could not find objects for connection:', connData);
            }
        }
        
        return elements;
    }

    createSimpleGraphElements() {
        if (!this.simpleGraph) return [];
        const elements = [];
        // Flatten nodes from branches
        let flatNodes = [];
        if (this.simpleGraph.branches) {
            for (const branch of this.simpleGraph.branches) {
                for (const node of branch.nodes) {
                    flatNodes.push(node);
                }
            }
        } else if (this.simpleGraph.nodes) {
            flatNodes = this.simpleGraph.nodes;
        }
        for (const node of flatNodes) {
            elements.push({
                group: 'nodes',
                data: {
                    id: node.id,
                    label: node.label || node.id,
                    color: '#4a90e2',
                    width: 40,
                    height: 40
                }
            });
        }
        for (const edge of this.simpleGraph.edges) {
            elements.push({
                group: 'edges',
                data: {
                    id: `${edge.source}-${edge.target}`,
                    source: edge.source,
                    target: edge.target,
                    color: '#aaa',
                    lineWidth: 3
                }
            });
        }
        return elements;
    }
    
    getNodePositions() {
        if (this.currentMode === 'simple') return {};
        const positions = {};
        for (const obj of this.layout.objects) {
            positions[obj.id] = { x: obj.x, y: obj.y };
        }
        return positions;
    }

    getSimpleNodePositions() {
        if (!this.simpleGraph) return {};
        const positions = {};
        const spacingX = 120;
        const spacingY = 120;
        // Map node id to branch index for quick lookup
        const nodeToBranch = {};
        if (this.simpleGraph.branches) {
            for (let b = 0; b < this.simpleGraph.branches.length; ++b) {
                const branch = this.simpleGraph.branches[b];
                for (let n = 0; n < branch.nodes.length; ++n) {
                    nodeToBranch[branch.nodes[n].id] = b;
                }
            }
        }
        // Place nodes by branch and offset entry nodes
        if (this.simpleGraph.branches) {
            for (let b = 0; b < this.simpleGraph.branches.length; ++b) {
                const branch = this.simpleGraph.branches[b];
                let xOffset = 0;
                // For the first node in the branch, check if it has an incoming edge from a previous branch
                if (branch.nodes.length > 0) {
                    const entryNode = branch.nodes[0];
                    // Find incoming edge from a node in a previous branch
                    const incoming = (this.simpleGraph.edges || []).find(e => e.target === entryNode.id && nodeToBranch[e.source] !== undefined && nodeToBranch[e.source] < b);
                    if (incoming && positions[incoming.source]) {
                        xOffset = positions[incoming.source].x + spacingX;
                    }
                }
                for (let n = 0; n < branch.nodes.length; ++n) {
                    const node = branch.nodes[n];
                    positions[node.id] = {
                        x: xOffset + n * spacingX,
                        y: 100 + b * spacingY
                    };
                }
            }
        } else if (this.simpleGraph.nodes) {
            // Fallback to old logic if no branches
            const n = this.simpleGraph.nodes.length;
            if (this.latticeType === 'square' || this.latticeType === 'rectangular') {
                const cols = Math.ceil(Math.sqrt(n));
                const rows = Math.ceil(n / cols);
                const spacingX = 120;
                const spacingY = 120;
                for (let i = 0; i < n; ++i) {
                    const row = Math.floor(i / cols);
                    const col = i % cols;
                    positions[this.simpleGraph.nodes[i].id] = {
                        x: 100 + col * spacingX,
                        y: 100 + row * spacingY
                    };
                }
            } else if (this.latticeType === 'hexagonal') {
                // Arrange nodes in a hexagonal grid
                const cols = Math.ceil(Math.sqrt(n));
                const spacingX = 120;
                const spacingY = 104; // 0.866 * spacingX
                for (let i = 0; i < n; ++i) {
                    const row = Math.floor(i / cols);
                    const col = i % cols;
                    positions[this.simpleGraph.nodes[i].id] = {
                        x: 100 + col * spacingX + (row % 2) * (spacingX / 2),
                        y: 100 + row * spacingY
                    };
                }
            } else if (this.latticeType === 'oblique') {
                // Arrange nodes in a parallelogram (oblique lattice)
                const cols = Math.ceil(Math.sqrt(n));
                const spacingX = 120;
                const spacingY = 120;
                const skew = 40;
                for (let i = 0; i < n; ++i) {
                    const row = Math.floor(i / cols);
                    const col = i % cols;
                    positions[this.simpleGraph.nodes[i].id] = {
                        x: 100 + col * spacingX + row * skew,
                        y: 100 + row * spacingY
                    };
                }
            } else if (this.latticeType === 'rhombic') {
                // Arrange nodes in a rhombic grid
                const cols = Math.ceil(Math.sqrt(n));
                const spacing = 120;
                for (let i = 0; i < n; ++i) {
                    const row = Math.floor(i / cols);
                    const col = i % cols;
                    positions[this.simpleGraph.nodes[i].id] = {
                        x: 100 + (col + row) * (spacing / 2),
                        y: 100 + (row - col) * (spacing / 2)
                    };
                }
            }
        }
        return positions;
    }
    
    getCytoscapeStyle() {
        return [
            {
                selector: 'node',
                style: {
                    'background-color': '#fff',
                    'border-color': '#4a90e2',
                    'border-width': 3,
                    'shape': 'ellipse',
                    'width': 40,
                    'height': 40,
                    'label': 'data(label)',
                    'color': '#222',
                    'font-size': '14px',
                    'font-weight': 'bold',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'text-outline-width': 2,
                    'text-outline-color': '#fff'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#4a90e2',
                    'curve-style': 'bezier',
                    'target-arrow-color': '#4a90e2',
                    'target-arrow-shape': 'triangle',
                    'arrow-scale': 1.2,
                    'opacity': 0.9
                }
            },
            {
                selector: 'node:selected',
                style: {
                    'border-width': 5,
                    'border-color': '#357abd'
                }
            },
            {
                selector: 'edge:selected',
                style: {
                    'width': 4,
                    'line-color': '#357abd',
                    'target-arrow-color': '#357abd'
                }
            }
        ];
    }
    
    setupCytoscapeEvents() {
        // Node hover events
        this.cy.on('mouseover', 'node', (evt) => {
            const node = evt.target;
            this.showObjectInfo(node);
        });
        
        // Edge hover events
        this.cy.on('mouseover', 'edge', (evt) => {
            const edge = evt.target;
            this.showConnectionInfo(edge);
        });
        
        // Mouse out events
        this.cy.on('mouseout', 'node, edge', () => {
            this.hideInfo();
        });
        
        // Zoom events
        this.cy.on('zoom', () => {
            this.updateZoomText();
        });
    }
    
    showObjectInfo(node) {
        const infoPanel = document.getElementById('info-panel');
        const infoContent = document.getElementById('info-content');
        const nodeData = node.data();
        const objectType = nodeData.objectType;
        
        infoContent.innerHTML = `
            <div class="info-item">
                <span class="info-label">ID:</span>
                <span class="info-value">${nodeData.id}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Type:</span>
                <span class="info-value">${objectType ? objectType.name : nodeData.type}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Inputs:</span>
                <span class="info-value">${nodeData.inputs.length}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Outputs:</span>
                <span class="info-value">${nodeData.outputs.length}</span>
            </div>
        `;
        
        infoPanel.style.display = 'block';
    }
    
    showConnectionInfo(edge) {
        const infoPanel = document.getElementById('info-panel');
        const infoContent = document.getElementById('info-content');
        const edgeData = edge.data();
        const connectionType = edgeData.connectionType;
        const linkTypeData = edgeData.linkTypeData;
        
        infoContent.innerHTML = `
            <div class="info-item">
                <span class="info-label">Connection ID:</span>
                <span class="info-value">${edgeData.id}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Type:</span>
                <span class="info-value">${connectionType ? connectionType.name : edgeData.type}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Length:</span>
                <span class="info-value">${edgeData.length} units</span>
            </div>
            <div class="info-item">
                <span class="info-label">Latency:</span>
                <span class="info-value">${edgeData.latency} ms</span>
            </div>
            <div class="info-item">
                <span class="info-label">Link Type:</span>
                <span class="info-value">${linkTypeData ? linkTypeData.name : edgeData.linkType}</span>
            </div>
            <div class="info-item">
                <span class="info-label">From:</span>
                <span class="info-value">${edgeData.source} → ${edgeData.fromPort}</span>
            </div>
            <div class="info-item">
                <span class="info-label">To:</span>
                <span class="info-value">${edgeData.target} → ${edgeData.toPort}</span>
            </div>
        `;
        
        infoPanel.style.display = 'block';
    }
    
    hideInfo() {
        document.getElementById('info-panel').style.display = 'none';
    }
    
    updateZoomText() {
        const zoomText = document.getElementById('zoom-text');
        const viewText = document.getElementById('view-text');
        
        let zoomLevel = 1;
        if (this.cy) {
            zoomLevel = this.cy.zoom();
        }
        
        if (zoomLevel < 0.5) {
            zoomText.textContent = 'Low';
            viewText.textContent = 'Objects';
        } else if (zoomLevel < 1.2) {
            zoomText.textContent = 'Medium';
            viewText.textContent = 'Objects + Connections';
        } else {
            zoomText.textContent = 'High';
            viewText.textContent = 'All Details';
        }
        
        document.getElementById('zoom-slider').value = zoomLevel * 50;
    }
    
    updateEdgeScaling() {
        if (!this.cy) {
            return;
        }
        if (this.currentMode === 'simple') {
            this.cy.elements('edge').forEach(edge => {
                edge.style('width', 3);
            });
        } else {
            this.cy.elements('edge').forEach(edge => {
                const edgeData = edge.data();
                const length = edgeData.length || 100;
                const scaledWidth = Math.max(1, edgeData.lineWidth * (length / 200));
                edge.data('weight', length / 100);
                edge.style('width', scaledWidth);
            });
        }
    }
}

// Initialize the visualization when the page loads
window.addEventListener('load', () => {
    new GraphVisualization();
}); 
class GraphVisualization {
    constructor() {
        this.cy = null;
        this.objectTypes = {};
        this.connectionTypes = {};
        this.linkTypes = {};
        this.layout = null;
        
        this.setupEventListeners();
        this.loadData().then(() => {
            this.loadLayout();
            this.initializeCytoscape();
        });
    }
    
    async loadData() {
        try {
            const [objectsResponse, connectionsResponse, layoutResponse] = await Promise.all([
                fetch('objects.json?v=1'),
                fetch('connections.json?v=1'),
                fetch('layout.json?v=1')
            ]);
            
            const objectsData = await objectsResponse.json();
            const connectionsData = await connectionsResponse.json();
            const layoutData = await layoutResponse.json();
            
            console.log('Loaded layout data:', layoutData);
            console.log('Connections with lengths:', layoutData.connections.map(c => ({id: c.id, length: c.length})));
            
            this.objectTypes = objectsData.objectTypes;
            this.connectionTypes = connectionsData.connectionTypes;
            this.linkTypes = connectionsData.linkTypes;
            this.layout = layoutData;
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
        

        
        document.getElementById('regenerate').addEventListener('click', () => {
            this.loadLayout();
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
        
        const elements = this.createCytoscapeElements();
        console.log('Created elements:', elements);
        
        this.cy = cytoscape({
            container: document.getElementById('cy'),
            elements: elements,
            style: this.getCytoscapeStyle(),
            layout: {
                name: 'preset',
                positions: this.getNodePositions(),
                fit: false,
                padding: 50
            },
            wheelSensitivity: 0.3,
            minZoom: 0.1,
            maxZoom: 3
        });
        
        console.log('Cytoscape initialized');
        this.setupCytoscapeEvents();
        this.updateZoomText();
        
        // Force initial edge scaling
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
    
    getNodePositions() {
        const positions = {};
        for (const obj of this.layout.objects) {
            positions[obj.id] = { x: obj.x, y: obj.y };
        }
        return positions;
    }
    
    getCytoscapeStyle() {
        return [
            {
                selector: 'node',
                style: {
                    'background-color': 'data(color)',
                    'label': 'data(label)',
                    'color': '#fff',
                    'font-size': '12px',
                    'font-weight': 'bold',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'width': 'data(width)',
                    'height': 'data(height)',
                    'border-width': 2,
                    'border-color': '#fff',
                    'border-opacity': 0.8,
                    'shape': 'rectangle'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 'data(lineWidth)',
                    'line-color': 'data(color)',
                    'curve-style': 'segments',
                    'segment-weights': [0.2, 0.6, 0.2],
                    'target-arrow-color': 'data(color)',
                    'target-arrow-shape': 'triangle',
                    'arrow-scale': 1.5,
                    'opacity': 0.8
                }
            },
            {
                selector: 'node:selected',
                style: {
                    'border-width': 4,
                    'border-color': '#4a90e2'
                }
            },
            {
                selector: 'edge:selected',
                style: {
                    'width': 'data(lineWidth)',
                    'line-color': '#4a90e2',
                    'target-arrow-color': '#4a90e2'
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
            console.log('Cytoscape not initialized');
            return;
        }
        
        console.log('Updating edge scaling to show actual lengths');
        
        // Scale edge widths based on actual lengths
        this.cy.elements('edge').forEach(edge => {
            const edgeData = edge.data();
            const length = edgeData.length || 100;
            const scaledWidth = Math.max(1, edgeData.lineWidth * (length / 200));
            edge.data('weight', length / 100);
            edge.style('width', scaledWidth);
        });
    }
}

// Initialize the visualization when the page loads
window.addEventListener('load', () => {
    new GraphVisualization();
}); 
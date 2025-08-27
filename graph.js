class GraphVisualization {
    constructor() {
        this.cy = null;
        this.objectTypes = {};
        this.connectionTypes = {};
        this.linkTypes = {};
        this.layout = null;
        this.simpleGraph = null;
        // Only use simple mode
        this.latticeType = 'square';
        this.edgeStyles = {};
        this.setupEventListeners();
        this.init();
    }
    
    async init() {
        await this.loadData();
        await this.loadEdgeStyles();
        this.initializeCytoscape();
    }
    
    async loadData() {
        try {
            const simpleGraphResponse = await fetch('graph-input.json');
            const simpleGraphData = await simpleGraphResponse.json();
            // If assemblies exist, extract the first assembly and its components
            if (simpleGraphData.assemblies && simpleGraphData.assemblies.length > 0) {
                const assembly = simpleGraphData.assemblies[0];
                this.assembly = assembly;
                this.componentDefs = {};
                if (simpleGraphData.components) {
                    for (const comp of simpleGraphData.components) {
                        this.componentDefs[comp.id] = comp;
                    }
                }
            } else if (simpleGraphData.components && simpleGraphData.components.length > 0) {
                // Fallback: single component mode
                const component = simpleGraphData.components[0];
                let nodes = [];
                if (component.branches) {
                    for (const branch of component.branches) {
                        if (branch.nodes) {
                            nodes = nodes.concat(branch.nodes);
                        }
                    }
                }
                this.simpleGraph = {
                    branches: component.branches || [],
                    nodes: nodes,
                    edges: component.edges || [],
                    inputs: component.inputs || [],
                    outputs: component.outputs || []
                };
            } else {
                this.simpleGraph = simpleGraphData;
            }
        } catch (error) {
            console.error('Error loading JSON data:', error);
        }
    }

    async loadEdgeStyles() {
        try {
            const response = await fetch('edge-styles.json');
            this.edgeStyles = await response.json();
            return Promise.resolve();
        } catch (error) {
            console.error('Error loading edge styles:', error);
            this.edgeStyles = {};
            return Promise.resolve();
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
        document.getElementById('lattice-selector').addEventListener('change', (e) => {
            this.latticeType = e.target.value;
            this.initializeCytoscape();
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
        let elements;
        // Only render the first component (not assembly view)
        elements = this.createSimpleGraphElements();
        // Debug: log elements
        console.log('initializeCytoscape elements:', elements);
        const layoutConfig = {
            name: 'preset',
            fit: true,
            padding: 50
        };
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
        // Component box parameters
        const boxCenterX = 400;
        const boxCenterY = 250;
        const boxWidth = 700;
        const boxHeight = 400;
        const boxLeft = boxCenterX - boxWidth / 2;
        const boxRight = boxCenterX + boxWidth / 2;
        const inputOffset = 60; // distance from box edge
        const outputOffset = 60;
        // Add a compound node for the component box
        elements.push({
            group: 'nodes',
            data: {
                id: 'component1',
                label: 'Component 1',
                isComponent: true
            },
            position: { x: boxCenterX, y: boxCenterY },
        });
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
        // Map node id to position for alignment
        const nodePositions = this.getSimpleNodePositions();
        // Add internal nodes
        for (const node of flatNodes) {
            elements.push({
                group: 'nodes',
                data: {
                    id: node.id,
                    label: node.label || node.id,
                    parent: 'component1',
                    color: '#4a90e2',
                    width: 40,
                    height: 40
                },
                position: nodePositions[node.id] || undefined
            });
        }
        // Add all internal edges as before (no per-element style)
        for (const edge of this.simpleGraph.edges) {
            elements.push({
                group: 'edges',
                data: {
                    id: `${edge.source}-${edge.target}`,
                    source: edge.source,
                    target: edge.target,
                    type: edge.type || '',
                    length: edge.length !== undefined ? edge.length : ''
                }
            });
        }
        // Add input nodes and edges (external world to component input)
        if (this.simpleGraph.inputs) {
            let inputIdx = 1;
            for (const input of this.simpleGraph.inputs) {
                const inputNodeId = `component1_input${inputIdx}`;
                // Align vertically with the target node
                const targetPos = nodePositions[input.target] || { x: boxLeft + 80, y: boxCenterY };
                elements.push({
                    group: 'nodes',
                    data: {
                        id: inputNodeId,
                        label: 'Input',
                        isExternal: true
                    },
                    position: { x: boxLeft - 200, y: targetPos.y }
                });
                elements.push({
                    group: 'edges',
                    data: {
                        id: `${inputNodeId}->${input.target}`,
                        source: inputNodeId,
                        target: input.target,
                        type: 'input',
                        length: 100
                    }
                });
                inputIdx++;
            }
        }
        // Add output nodes and edges (component output to external world)
        if (this.simpleGraph.outputs) {
            let outputIdx = 1;
            for (const output of this.simpleGraph.outputs) {
                const outputNodeId = `component1_output${outputIdx}`;
                // Align vertically with the source node
                const sourcePos = nodePositions[output.source] || { x: boxRight - 80, y: boxCenterY };
                elements.push({
                    group: 'nodes',
                    data: {
                        id: outputNodeId,
                        label: 'Output',
                        isExternal: true
                    },
                    position: { x: boxRight + 200, y: sourcePos.y }
                });
                elements.push({
                    group: 'edges',
                    data: {
                        id: `${output.source}->${outputNodeId}`,
                        source: output.source,
                        target: outputNodeId,
                        type: 'output',
                        length: 100
                    }
                });
                outputIdx++;
            }
        }
        return elements;
    }

    createAssemblyElements() {
        if (!this.assembly || !this.componentDefs) return [];
        const elements = [];
        const compSpacingY = 300;
        const compBoxWidth = 300;
        const compBoxHeight = 200;
        const compX = 400; // fixed x for all components
        // Place components in a vertical stack
        const compPositions = {};
        for (let i = 0; i < this.assembly.components.length; ++i) {
            const comp = this.assembly.components[i];
            const x = compX;
            const y = 200 + i * compSpacingY;
            compPositions[comp.instance_id] = { x, y };
            elements.push({
                group: 'nodes',
                data: {
                    id: comp.instance_id,
                    label: comp.instance_id,
                    isComponent: true
                },
                position: { x, y }
            });
            // Render an 'Assembly Input' for each input of the component instance
            const compDef = this.componentDefs[comp.type];
            if (compDef && compDef.inputs) {
                for (let j = 0; j < compDef.inputs.length; ++j) {
                    const inputNodeId = `${comp.instance_id}_assembly_input${j+1}`;
                    elements.push({
                        group: 'nodes',
                        data: {
                            id: inputNodeId,
                            label: 'Assembly Input',
                            isExternal: true
                        },
                        position: { x: x - compBoxWidth / 2 - 200, y: y + (j * 40) }
                    });
                    elements.push({
                        group: 'edges',
                        data: {
                            id: `${inputNodeId}->${comp.instance_id}`,
                            source: inputNodeId,
                            target: comp.instance_id,
                            type: 'assembly_input',
                            length: 100
                        },
                        style: {
                            'line-color': '#888',
                            'width': 3,
                            'opacity': 1,
                            'line-style': 'dotted'
                        }
                    });
                }
            }
            // Render an 'Assembly Output' for each output of the component instance
            if (compDef && compDef.outputs) {
                for (let j = 0; j < compDef.outputs.length; ++j) {
                    const outputNodeId = `${comp.instance_id}_assembly_output${j+1}`;
                    elements.push({
                        group: 'nodes',
                        data: {
                            id: outputNodeId,
                            label: 'Assembly Output',
                            isExternal: true
                        },
                        position: { x: x + compBoxWidth / 2 + 200, y: y + (j * 40) }
                    });
                    elements.push({
                        group: 'edges',
                        data: {
                            id: `${comp.instance_id}->${outputNodeId}`,
                            source: comp.instance_id,
                            target: outputNodeId,
                            type: 'assembly_output',
                            length: 100
                        },
                        style: {
                            'line-color': '#888',
                            'width': 3,
                            'opacity': 1,
                            'line-style': 'dotted'
                        }
                    });
                }
            }
        }
        // Draw connections between components ONLY if specified in JSON
        if (this.assembly.connections) {
            let connIdx = 1;
            for (const conn of this.assembly.connections) {
                const fromComp = conn.from.component;
                const toComp = conn.to.component;
                elements.push({
                    group: 'edges',
                    data: {
                        id: `assembly_conn_${connIdx}`,
                        source: fromComp,
                        target: toComp,
                        type: 'assembly_conn',
                        label: `${conn.from.output}→${conn.to.input}`
                    },
                    style: {
                        'line-color': '#888',
                        'width': 4,
                        'opacity': 1,
                        'line-style': 'dashed'
                    }
                });
                connIdx++;
            }
        }
        // (Assembly-level inputs/outputs from the JSON are ignored for this visual)
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
        // Use edge length for spacing
        const defaultSpacing = 120;
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
                        xOffset = positions[incoming.source].x + (incoming.length || defaultSpacing);
                    }
                }
                for (let n = 0; n < branch.nodes.length; ++n) {
                    const node = branch.nodes[n];
                    if (n === 0) {
                        positions[node.id] = {
                            x: xOffset,
                            y: 100 + b * defaultSpacing
                        };
                    } else {
                        // Find the edge from previous node to this node in the branch
                        const prevNode = branch.nodes[n - 1];
                        const edge = (this.simpleGraph.edges || []).find(e => e.source === prevNode.id && e.target === node.id);
                        const length = edge && edge.length ? edge.length : defaultSpacing;
                        positions[node.id] = {
                            x: positions[prevNode.id].x + length,
                            y: 100 + b * defaultSpacing
                        };
                    }
                }
            }
        } else if (this.simpleGraph.nodes) {
            // Fallback to old logic if no branches
            const n = this.simpleGraph.nodes.length;
            const spacingX = defaultSpacing;
            const spacingY = defaultSpacing;
            if (this.latticeType === 'square' || this.latticeType === 'rectangular') {
                const cols = Math.ceil(Math.sqrt(n));
                const rows = Math.ceil(n / cols);
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
        // Debug: log edgeStyles
        console.log('getCytoscapeStyle edgeStyles:', this.edgeStyles);
        // Use edge-styles.json for edge type styles
        const edgeTypeStyles = this.edgeStyles || {};
        const styleArr = [
            {
                selector: 'node[isComponent]',
                style: {
                    'background-opacity': 0,
                    'background-color': '#fff',
                    'border-color': '#bbb',
                    'border-width': 4,
                    'shape': 'rectangle',
                    'width': 700,
                    'height': 400,
                    'label': 'data(label)',
                    'z-index': 0,
                    'text-valign': 'top',
                    'text-halign': 'center',
                    'font-size': '20px',
                    'font-weight': 'bold',
                    'color': '#888',
                    'text-margin-y': 10
                }
            },
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
            // Edge type styles from edge-styles.json
            ...Object.entries(edgeTypeStyles).map(([type, style]) => ({
                selector: `edge[type="${type}"]`,
                style: {
                    'line-color': style.color || '#aaa',
                    'width': (typeof style.width === 'number' && !isNaN(style.width)) ? style.width : 3,
                    'opacity': typeof style.opacity === 'number' && !isNaN(style.opacity) ? style.opacity : 1
                }
            })),
            // Default edge style
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#4a90e2',
                    'curve-style': 'bezier',
                    'target-arrow-color': '#4a90e2',
                    'target-arrow-shape': 'none',
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
                    'target-arrow-color': '#357abd',
                    'target-arrow-shape': 'none'
                }
            },
            {
                selector: 'node[isExternal]',
                style: {
                    'background-color': '#eee',
                    'border-color': '#bbb',
                    'border-width': 2,
                    'shape': 'ellipse',
                    'width': 40,
                    'height': 40,
                    'label': 'data(label)',
                    'z-index': 1,
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'font-size': '14px',
                    'color': '#888'
                }
            },
            {
                selector: '.faded',
                style: {
                    'opacity': 0.2,
                    'background-color': '#ccc',
                    'line-color': '#ccc',
                    'color': '#bbb'
                }
            }
        ];
        return styleArr;
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
            const zoomLevel = this.cy.zoom();
            // Build a set of internal node IDs (children of component1)
            const internalNodeIds = new Set(this.cy.nodes('[parent="component1"]').map(n => n.id()));
            if (zoomLevel < 1.0) {
                // Fade internal nodes
                this.cy.nodes('[parent="component1"]').addClass('faded');
                // Remove faded from all edges first
                this.cy.edges().removeClass('faded');
                // Fade only internal edges (both ends inside the component box)
                this.cy.edges().forEach(edge => {
                    const srcId = edge.source().id();
                    const tgtId = edge.target().id();
                    if (internalNodeIds.has(srcId) && internalNodeIds.has(tgtId)) {
                        edge.addClass('faded');
                    }
                });
            } else {
                this.cy.nodes('[parent="component1"]').removeClass('faded');
                this.cy.edges().removeClass('faded');
            }
        });
    }
    
    showObjectInfo(node) {
        const infoPanel = document.getElementById('info-panel');
        const infoContent = document.getElementById('info-content');
        const nodeData = node.data();
        const objectType = nodeData.objectType;
        const inputs = nodeData.inputs || [];
        const outputs = nodeData.outputs || [];
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
                <span class="info-value">${inputs.length}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Outputs:</span>
                <span class="info-value">${outputs.length}</span>
            </div>
        `;
        infoPanel.style.display = 'block';
    }
    
    showConnectionInfo(edge) {
        const infoPanel = document.getElementById('info-panel');
        const infoContent = document.getElementById('info-content');
        const edgeData = edge.data();
        // For simple mode, use type/length from edge data directly
        let type = edgeData.type || '';
        let length = edgeData.length !== undefined ? edgeData.length : '';
        infoContent.innerHTML = `
            <div class="info-item">
                <span class="info-label">Connection ID:</span>
                <span class="info-value">${edgeData.id}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Type:</span>
                <span class="info-value">${type}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Length:</span>
                <span class="info-value">${length} units</span>
            </div>
            <div class="info-item">
                <span class="info-label">From/To:</span>
                <span class="info-value">${edgeData.source} → ${edgeData.target}</span>
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
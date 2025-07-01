// Level Editor JavaScript
class LevelEditor {
    constructor() {
        this.canvas = document.getElementById('editorCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.configTextarea = document.getElementById('level-config');
        
        // Editor state
        this.currentTool = null;
        this.toolType = null;
        this.toolValue = null;
        
        // Level data
        this.grid = [];
        this.semaphores = [];
        this.trains = [];
        this.targetPoint = null;
        
        // Initialize
        this.initializeGrid();
        this.setupEventListeners();
        this.setupCanvas();
        this.initializeEditor();
    }
    
    async initializeEditor() {
        // Load train images first
        await loadTrainImages();
        
        // Create tool previews after images are loaded
        this.createToolPreviews();
        
        // Initial render and config update
        this.render();
        this.updateConfig();
    }
    
    initializeGrid() {
        // Create empty grid
        this.grid = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            this.grid[y] = [];
            for (let x = 0; x < GRID_WIDTH; x++) {
                this.grid[y][x] = " ";
            }
        }
        
        // Reset other data
        this.semaphores = [];
        this.trains = [];
        this.targetPoint = null;
    }
    
    setupCanvas() {
        // Set canvas size based on grid
        this.canvas.width = GRID_WIDTH * CELL_SIZE;
        this.canvas.height = GRID_HEIGHT * CELL_SIZE;
        
        // Generate background
        this.backgroundCanvas = generateBackground(this.canvas, this.grid);
    }
    
    setupEventListeners() {
        // Tool selection
        document.querySelectorAll('.tool-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.selectTool(item);
            });
        });
        
        // Canvas clicks
        this.canvas.addEventListener('click', (e) => {
            this.handleCanvasClick(e);
        });
        
        // Control buttons
        document.getElementById('clear-grid').addEventListener('click', () => {
            this.clearGrid();
        });
        
        document.getElementById('load-level').addEventListener('click', () => {
            this.loadLevel();
        });
        
        document.getElementById('save-level').addEventListener('click', () => {
            this.saveLevel();
        });
        
        document.getElementById('import-config').addEventListener('click', () => {
            this.importConfig();
        });
        
        document.getElementById('export-config').addEventListener('click', () => {
            this.exportConfig();
        });
    }
    
    selectTool(toolItem) {
        // Remove selection from other tools
        document.querySelectorAll('.tool-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Select current tool
        toolItem.classList.add('selected');
        
        this.toolType = toolItem.dataset.type;
        this.toolValue = toolItem.dataset.value;
        this.currentTool = toolItem;
    }
    
    handleCanvasClick(e) {
        if (!this.currentTool) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
        const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
        
        if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return;
        
        this.placeTool(x, y);
    }
    

    
    placeTool(x, y) {
        switch (this.toolType) {
            case 'track':
                this.grid[y][x] = this.toolValue;
                break;
                
            case 'semaphore':
                // Check if semaphore already exists at this position
                const existingSemaphoreIndex = this.semaphores.findIndex(s => s.x === x && s.y === y);
                if (existingSemaphoreIndex !== -1) {
                    // Remove existing semaphore
                    this.semaphores.splice(existingSemaphoreIndex, 1);
                } else {
                    // Add new semaphore
                    this.semaphores.push({
                        x: x,
                        y: y,
                        isOpen: true
                    });
                }
                break;
                
            case 'station':
                // Check if station already exists at this position
                if (this.targetPoint && this.targetPoint.x === x && this.targetPoint.y === y) {
                    // Remove existing station
                    this.targetPoint = null;
                } else {
                    // Add new station
                    this.targetPoint = { x: x, y: y };
                }
                break;
                
            case 'locomotive':
            case 'wagon1':
            case 'wagon2':
                this.addTrainPart(x, y, this.toolType);
                break;
        }
        
        this.render();
        this.updateConfig();
    }
    
    addTrainPart(x, y, type) {
        // Check if there's already a train part at this position
        let existingPart = null;
        let existingTrainIndex = -1;
        let existingPartIndex = -1;
        
        for (let trainIndex = 0; trainIndex < this.trains.length; trainIndex++) {
            const train = this.trains[trainIndex];
            for (let partIndex = 0; partIndex < train.length; partIndex++) {
                if (train[partIndex].x === x && train[partIndex].y === y) {
                    existingPart = train[partIndex];
                    existingTrainIndex = trainIndex;
                    existingPartIndex = partIndex;
                    break;
                }
            }
            if (existingPart) break;
        }
        
        // If there's already a train part at this position, remove it
        if (existingPart) {
            this.trains[existingTrainIndex].splice(existingPartIndex, 1);
            
            // Remove empty trains
            this.trains = this.trains.filter(train => train.length > 0);
            return; // Don't add new part, just remove existing one
        }
        
        // Create new train part
        const part = {
            x: x,
            y: y,
            direction: 0, // Default direction (right)
        };
        
        if (type === 'locomotive') {
            part.type = 'locomotive';
            // Create new train with locomotive
            this.trains.push([part]);
        } else {
            part.type = 'wagon';
            part.wagonType = type;
            
            // Try to add to existing train or create new one
            if (this.trains.length > 0) {
                this.trains[this.trains.length - 1].push(part);
            } else {
                this.trains.push([part]);
            }
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.ctx.drawImage(this.backgroundCanvas, 0, 0);
        
        // Draw grid
        this.drawGrid();
        
        // Draw semaphores
        this.drawSemaphores();
        
        // Draw target point (station)
        this.drawTargetPoint();
        
        // Draw trains
        this.drawTrains();
    }
    
    drawGrid() {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const cellType = this.grid[y][x];
                if (cellType && cellType !== " ") {
                    // Check if this is a switch cell
                    if (this.isSwitchCell(cellType)) {
                        // Draw switch with default state (straight path)
                        drawSwitchCell(this.ctx, x, y, cellType, true);
                    } else {
                        // Draw regular cell
                        drawCell(this.ctx, x, y, cellType);
                    }
                }
            }
        }
    }
    
    isSwitchCell(cellType) {
        const switchTypes = [
            "┐|", "|┌", "┘|", "|└",  // Vertical switches
            "┐-", "-┌", "┘-", "-└"   // Horizontal switches
        ];
        return switchTypes.includes(cellType);
    }
    
    createToolPreviews() {
        const toolItems = document.querySelectorAll('.tool-item[data-type="track"]');
        const previewSize = 36;
        
        toolItems.forEach(toolItem => {
            const preview = toolItem.querySelector('.tool-preview');
            const cellType = toolItem.dataset.value;
            
            if (cellType === " ") {
                // Empty cell - keep existing styling
                return;
            }
            
            // Create mini canvas for preview
            const canvas = document.createElement('canvas');
            canvas.width = previewSize;
            canvas.height = previewSize;
            const ctx = canvas.getContext('2d');
            
            // Set light background
            ctx.fillStyle = '#f8f8f8';
            ctx.fillRect(0, 0, previewSize, previewSize);
            
            // Calculate scale to fit CELL_SIZE into preview size
            const scale = previewSize / CELL_SIZE;
            
            // Apply scaling
            ctx.save();
            ctx.scale(scale, scale);
            
            // Draw the cell type at scaled coordinates
            if (this.isSwitchCell(cellType)) {
                drawSwitchCell(ctx, 0, 0, cellType, true);
            } else {
                drawCell(ctx, 0, 0, cellType);
            }
            
            ctx.restore();
            
            // Replace text preview with canvas
            preview.innerHTML = '';
            preview.appendChild(canvas);
        });
    }
    
    drawSemaphores() {
        this.semaphores.forEach(semaphore => {
            drawSemaphoreCell(this.ctx, semaphore.x, semaphore.y, "", semaphore.isOpen);
        });
    }
    
    drawTargetPoint() {
        if (this.targetPoint) {
            drawStationCell(this.ctx, this.targetPoint.x, this.targetPoint.y, "");
        }
    }
    
    drawTrains() {
        this.trains.forEach(train => {
            train.forEach(part => {
                // Convert grid coordinates to pixel coordinates for rendering
                const partWithPixels = {
                    ...part,
                    pixelX: (part.x + 0.5) * CELL_SIZE,
                    pixelY: (part.y + 0.5) * CELL_SIZE
                };
                drawTrainPart(this.ctx, partWithPixels);
            });
        });
    }
    
    updateConfig() {
        const config = {
            grid: [...this.grid], // Deep copy
            semaphores: [...this.semaphores],
            trains: [...this.trains],
            targetPoint: this.targetPoint
        };
        
        // Format as JavaScript object with special grid formatting
        const configStr = this.formatConfig(config);
        
        this.configTextarea.value = configStr;
    }
    
    formatConfig(config) {
        // Format grid with each row on a single line
        const gridLines = config.grid.map(row => 
            '      [' + row.map(cell => '"' + cell + '"').join(', ') + ']'
        );
        const gridStr = '    grid: [\n' + gridLines.join(',\n') + '\n    ]';
        
        // Format other properties normally
        const otherProps = Object.keys(config).filter(key => key !== 'grid');
        const otherPropsStr = otherProps.map(key => {
            const value = JSON.stringify(config[key], null, 4);
            return `    ${key}: ${value}`;
        }).join(',\n');
        
        return `{\n${gridStr}${otherPropsStr ? ',\n' + otherPropsStr : ''}\n}`;
    }
    
    clearGrid() {
        if (confirm('Are you sure you want to clear the entire grid?')) {
            this.initializeGrid();
            this.render();
            this.updateConfig();
        }
    }
    
    loadLevel() {
        // Load from existing levels for demonstration
        const levelIndex = prompt('Enter level index (0, 1, 2):');
        const index = parseInt(levelIndex);
        
        if (index >= 0 && index < levels.length) {
            const level = levels[index];
            this.grid = level.grid.map(row => [...row]); // Deep copy
            this.semaphores = level.semaphores ? [...level.semaphores] : [];
            this.trains = level.trains ? [...level.trains] : [];
            this.targetPoint = level.targetPoint ? {...level.targetPoint} : null;
            
            this.render();
            this.updateConfig();
        } else {
            alert('Invalid level index');
        }
    }
    
    saveLevel() {
        // Copy config to clipboard
        this.configTextarea.select();
        document.execCommand('copy');
        alert('Level configuration copied to clipboard!');
    }
    
    importConfig() {
        try {
            const configText = this.configTextarea.value;
            const config = eval('(' + configText + ')'); // Use eval for parsing object literal
            
            if (config.grid) {
                this.grid = config.grid.map(row => [...row]);
            }
            if (config.semaphores) {
                this.semaphores = [...config.semaphores];
            }
            if (config.trains) {
                this.trains = [...config.trains];
            }
            if (config.targetPoint) {
                this.targetPoint = {...config.targetPoint};
            }
            
            this.render();
            alert('Configuration imported successfully!');
        } catch (e) {
            alert('Error importing configuration: ' + e.message);
        }
    }
    
    exportConfig() {
        this.updateConfig();
        this.configTextarea.select();
        document.execCommand('copy');
        alert('Configuration exported to clipboard!');
    }
}

// Initialize editor when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.editor = new LevelEditor();
}); 

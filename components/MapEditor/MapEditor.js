import { useState } from 'react';

// A list of available tile sheets
const tileSheets = [
  {
    id: 'sheet1',
    name: 'Reference',
    src: '/assets/tilesheets/reference.png',
    tileWidth: 32,
    tileHeight: 32,
    columns: 16,
    rows: 16,
  },
  {
    id: 'sheet2',
    name: 'Tile 1',
    src: '/assets/tilesheets/tilesheet1.webp',
    tileWidth: 32,
    tileHeight: 32,
    columns: 16,
    rows: 16,
  },
];

// Helper: create an empty 2D array
function createEmptyGrid(rows, cols, fillValue = null) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => fillValue)
  );
}

export default function MapEditor() {
  // 1) Selected tile sheet
  const [selectedAsset, setSelectedAsset] = useState(tileSheets[0]);

  // 2) For the collision layer
  // Now we have: 
  //   0=walkable, 1=blocked, 2=walk-under, 3=action, 4=teleport
  const [selectedCollision, setSelectedCollision] = useState(0);

  // 3) Map dimensions
  const [rows, setRows] = useState(8);
  const [columns, setColumns] = useState(8);

  // 4) We have 3 layers: 0=base, 1=overlay, 2=collision
  const [mapLayers, setMapLayers] = useState(() => [
    createEmptyGrid(8, 8),
    createEmptyGrid(8, 8),
    createEmptyGrid(8, 8, 0),
  ]);

  // 5) Which layer is active
  const [activeLayer, setActiveLayer] = useState(0);

  // 6) For click-and-drag painting on the map
  const [isMouseDownMap, setIsMouseDownMap] = useState(false);

  // 7) For click-and-drag selection in the tile palette
  const [isSelectingPalette, setIsSelectingPalette] = useState(false);

  // 8) The rectangular selection in the tile palette
  const [startIndex, setStartIndex] = useState(null);
  const [endIndex, setEndIndex] = useState(null);

  // 9) The final 2D array of selected tiles (our “tile brush”)
  const [selectedBrush, setSelectedBrush] = useState(null);

  // Generate empty layers
  const generateMap = () => {
    setMapLayers([
      createEmptyGrid(rows, columns),
      createEmptyGrid(rows, columns),
      createEmptyGrid(rows, columns, 0),
    ]);
  };

  // Info about the current tile sheet
  const totalTiles = selectedAsset.columns * selectedAsset.rows;

  // Build style for a tile index
  const getTileStyle = (tileIndex) => {
    const { tileWidth, tileHeight, src, columns } = selectedAsset;
    const col = tileIndex % columns;
    const row = Math.floor(tileIndex / columns);
    const xOffset = col * tileWidth;
    const yOffset = row * tileHeight;
    return {
      width: tileWidth,
      height: tileHeight,
      backgroundImage: `url("${src}")`,
      backgroundPosition: `-${xOffset}px -${yOffset}px`,
      backgroundRepeat: 'no-repeat',
    };
  };

  // ============ TILE PALETTE SELECTION LOGIC ============
  const handlePaletteMouseDown = (index) => {
    setIsSelectingPalette(true);
    setStartIndex(index);
    setEndIndex(index); // highlight at least one tile
  };

  const handlePaletteMouseEnter = (index) => {
    if (isSelectingPalette) {
      setEndIndex(index);
    }
  };

  const handlePaletteMouseUp = () => {
    setIsSelectingPalette(false);
    if (startIndex !== null && endIndex !== null) {
      const brush = buildSelectedBrush(startIndex, endIndex);
      setSelectedBrush(brush);
    }
  };

  // Build a 2D array of tile indices from startIndex..endIndex
  const buildSelectedBrush = (start, end) => {
    const { columns } = selectedAsset;
    const startRow = Math.floor(start / columns);
    const startCol = start % columns;
    const endRow = Math.floor(end / columns);
    const endCol = end % columns;

    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    const brushRows = maxRow - minRow + 1;
    const brushCols = maxCol - minCol + 1;

    const brush = [];
    for (let r = 0; r < brushRows; r++) {
      const rowArr = [];
      for (let c = 0; c < brushCols; c++) {
        const tileRow = minRow + r;
        const tileCol = minCol + c;
        const tileIndex = tileRow * columns + tileCol;
        rowArr.push(tileIndex);
      }
      brush.push(rowArr);
    }
    return brush;
  };

  // Check if a tile in the palette is within the current selection
  const isTileInSelection = (index) => {
    if (startIndex == null || endIndex == null) return false;
    const { columns } = selectedAsset;
    const startRow = Math.floor(startIndex / columns);
    const startCol = startIndex % columns;
    const endRow = Math.floor(endIndex / columns);
    const endCol = endIndex % columns;

    const row = Math.floor(index / columns);
    const col = index % columns;

    const rowMin = Math.min(startRow, endRow);
    const rowMax = Math.max(startRow, endRow);
    const colMin = Math.min(startCol, endCol);
    const colMax = Math.max(startCol, endCol);

    return row >= rowMin && row <= rowMax && col >= colMin && col <= colMax;
  };

  // ============ MAP PAINTING LOGIC ============
  const placeAtMap = (rowIndex, colIndex) => {
    setMapLayers((prevLayers) =>
      prevLayers.map((layer, layerIndex) => {
        if (layerIndex !== activeLayer) return layer;

        // If collision layer, place the selected collision code
        if (activeLayer === 2) {
          return layer.map((rowArr, r) => {
            if (r !== rowIndex) return rowArr;
            return rowArr.map((val, c) => {
              if (c !== colIndex) return val;
              return selectedCollision;
            });
          });
        }

        // Otherwise (base or overlay) use the brush
        if (!selectedBrush || selectedBrush.length === 0) {
          // If no brush, do nothing
          return layer;
        }
        return pasteBrush(layer, rowIndex, colIndex, selectedBrush);
      })
    );
  };

  const pasteBrush = (layer, rowIndex, colIndex, brush) => {
    const maxRow = layer.length;
    const maxCol = layer[0].length;
    const brushRows = brush.length;
    const brushCols = brush[0].length;

    // newLayer is a copy of the old layer
    const newLayer = layer.map((row) => [...row]);

    for (let r = 0; r < brushRows; r++) {
      for (let c = 0; c < brushCols; c++) {
        const targetRow = rowIndex + r;
        const targetCol = colIndex + c;
        if (targetRow < maxRow && targetCol < maxCol) {
          newLayer[targetRow][targetCol] = brush[r][c];
        }
      }
    }
    return newLayer;
  };

  const handleMapMouseDown = (rowIndex, colIndex) => {
    setIsMouseDownMap(true);
    placeAtMap(rowIndex, colIndex);
  };

  const handleMapMouseEnter = (rowIndex, colIndex) => {
    if (isMouseDownMap) {
      placeAtMap(rowIndex, colIndex);
    }
  };

  const handleMapMouseUp = () => {
    setIsMouseDownMap(false);
  };

  // ============ MISC ============

  const copyMapLayersToClipboard = () => {
    const exportData = {
      tileSheet: selectedAsset,
      mapLayers,
    };
    const textToCopy = JSON.stringify(exportData, null, 2);
    navigator.clipboard.writeText(textToCopy);
    alert('Map + TileSheet JSON copied to clipboard!');
  };

  const handleAssetChange = (e) => {
    const newId = e.target.value;
    const found = tileSheets.find((sheet) => sheet.id === newId);
    if (found) {
      setSelectedAsset(found);
      setSelectedBrush(null);
      setStartIndex(null);
      setEndIndex(null);
    }
  };

  const handleCollisionChange = (code) => {
    setSelectedCollision(code);
  };

  const handleLayerChange = (e) => {
    setActiveLayer(Number(e.target.value));
  };

  return (
    <div className='page-container' onMouseUp={handleMapMouseUp}>
      <h1>Map Editor</h1>
      
      {/* Select Tile Sheet */}
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="asset-select" style={{ marginRight: 8 }}>
          Select Tile Sheet:
        </label>
        <select
          id="asset-select"
          onChange={handleAssetChange}
          value={selectedAsset.id}
        >
          {tileSheets.map((sheet) => (
            <option key={sheet.id} value={sheet.id}>
              {sheet.name}
            </option>
          ))}
        </select>
      </div>

      {/* Map Size Controls */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ marginRight: 8 }}>
          Rows:
          <input
            type="number"
            value={rows}
            onChange={(e) => setRows(Number(e.target.value))}
            style={{ marginLeft: 4, width: 60 }}
          />
        </label>
        <label style={{ marginRight: 8 }}>
          Columns:
          <input
            type="number"
            value={columns}
            onChange={(e) => setColumns(Number(e.target.value))}
            style={{ marginLeft: 4, width: 60 }}
          />
        </label>
        <button onClick={generateMap}>Generate Map</button>
      </div>

      {/* Layer Selector */}
      <div style={{ marginBottom: 16 }}>
        <label>
          <input
            type="radio"
            name="layer"
            value={0}
            checked={activeLayer === 0}
            onChange={handleLayerChange}
          />
          Base Layer
        </label>
        {'  '}
        <label>
          <input
            type="radio"
            name="layer"
            value={1}
            checked={activeLayer === 1}
            onChange={handleLayerChange}
          />
          Overlay Layer
        </label>
        {'  '}
        <label>
          <input
            type="radio"
            name="layer"
            value={2}
            checked={activeLayer === 2}
            onChange={handleLayerChange}
          />
          Collision Layer
        </label>
      </div>

      {/* Collision Selector (only if collision layer) */}
      {activeLayer === 2 && (
        <div style={{ marginBottom: 16 }}>
          <strong>Collision Type:</strong>{' '}
          <label>
            <input
              type="radio"
              name="collision"
              value={0}
              checked={selectedCollision === 0}
              onChange={() => handleCollisionChange(0)}
            />
            Walkable
          </label>
          {'  '}
          <label>
            <input
              type="radio"
              name="collision"
              value={1}
              checked={selectedCollision === 1}
              onChange={() => handleCollisionChange(1)}
            />
            Blocked
          </label>
          {'  '}
          <label>
            <input
              type="radio"
              name="collision"
              value={2}
              checked={selectedCollision === 2}
              onChange={() => handleCollisionChange(2)}
            />
            Walk Under
          </label>
          {'  '}
          <label>
            <input
              type="radio"
              name="collision"
              value={3}
              checked={selectedCollision === 3}
              onChange={() => handleCollisionChange(3)}
            />
            Action
          </label>
          {'  '}
          <label>
            <input
              type="radio"
              name="collision"
              value={4}
              checked={selectedCollision === 4}
              onChange={() => handleCollisionChange(4)}
            />
            Teleport
          </label>
        </div>
      )}

      {/* TILE PALETTE */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${selectedAsset.rows}, ${selectedAsset.tileHeight}px)`,
          gridTemplateColumns: `repeat(${selectedAsset.columns}, ${selectedAsset.tileWidth}px)`,
          gap: 2,
          marginBottom: 16,
          userSelect: 'none',
        }}
        onMouseUp={handlePaletteMouseUp}
      >
        {Array.from({ length: totalTiles }, (_, index) => {
          const isSelected = isTileInSelection(index);
          return (
            <div
              key={index}
              style={{
                ...getTileStyle(index),
                border: isSelected ? '2px solid red' : '1px solid #ccc',
                cursor: 'pointer',
              }}
              onMouseDown={() => handlePaletteMouseDown(index)}
              onMouseEnter={() => handlePaletteMouseEnter(index)}
            />
          );
        })}
      </div>

      <p style={{ marginBottom: 16 }}>
        <strong>Selected Brush Size:</strong>{' '}
        {selectedBrush
          ? `${selectedBrush.length} row(s) × ${selectedBrush[0].length} col(s)`
          : 'None'}
      </p>

      {/* MAP GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${rows}, ${selectedAsset.tileHeight}px)`,
          gridTemplateColumns: `repeat(${columns}, ${selectedAsset.tileWidth}px)`,
          gap: 0,
          marginBottom: 16,
        }}
      >
        {mapLayers[0].map((_, rowIndex) =>
          mapLayers[0][rowIndex].map((__, colIndex) => {
            // Base tile
            const baseIndex = mapLayers[0][rowIndex][colIndex];
            // Overlay tile
            const overlayIndex = mapLayers[1][rowIndex][colIndex];
            // Collision code: 0..4
            const collisionCode = mapLayers[2][rowIndex][colIndex];

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                style={{
                  position: 'relative',
                  width: selectedAsset.tileWidth,
                  height: selectedAsset.tileHeight,
                  border: '1px solid rgba(0,0,0,0.2)',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                }}
                onMouseDown={() => handleMapMouseDown(rowIndex, colIndex)}
                onMouseEnter={() => handleMapMouseEnter(rowIndex, colIndex)}
              >
                {/* Base */}
                {baseIndex !== null && (
                  <div
                    style={{
                      ...getTileStyle(baseIndex),
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {/* Overlay */}
                {overlayIndex !== null && (
                  <div
                    style={{
                      ...getTileStyle(overlayIndex),
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Collision Overlays */}
                {collisionCode === 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: selectedAsset.tileWidth,
                      height: selectedAsset.tileHeight,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                      fontSize: 14,
                      fontWeight: 'bold',
                      color: 'red',
                      backgroundColor: 'rgba(255,0,0,0.1)',
                    }}
                  >
                    B
                  </div>
                )}
                {collisionCode === 2 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: selectedAsset.tileWidth,
                      height: selectedAsset.tileHeight,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                      fontSize: 14,
                      fontWeight: 'bold',
                      color: 'blue',
                      backgroundColor: 'rgba(0,0,255,0.1)',
                    }}
                  >
                    U
                  </div>
                )}
                {collisionCode === 3 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: selectedAsset.tileWidth,
                      height: selectedAsset.tileHeight,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                      fontSize: 14,
                      fontWeight: 'bold',
                      color: 'green',
                      backgroundColor: 'rgba(0,255,0,0.1)',
                    }}
                  >
                    A
                  </div>
                )}
                {collisionCode === 4 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: selectedAsset.tileWidth,
                      height: selectedAsset.tileHeight,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                      fontSize: 14,
                      fontWeight: 'bold',
                      color: 'purple',
                      backgroundColor: 'rgba(255,0,255,0.1)',
                    }}
                  >
                    T
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Debug */}
      <button onClick={copyMapLayersToClipboard} style={{ marginBottom: 8 }}>
        Copy JSON
      </button>
      <div
        style={{
          maxHeight: 100,
          overflowY: 'auto',
          border: '1px solid #ccc',
          padding: 8,
          marginBottom: 8,
          backgroundColor: '#f9f9f9',
        }}
      >
        <pre>
          {JSON.stringify(
            {
              tileSheet: selectedAsset,
              mapLayers,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}

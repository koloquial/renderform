import { useState } from 'react';

// A list of available tile sheets
const tileSheets = [
  {
    id: 'sheet1',
    name: 'Tile Sheet 1',
    src: '/assets/tilesheets/PathAndObjects.png',
    tileWidth: 32,
    tileHeight: 32,
    columns: 16,
    rows: 16,
  },
  {
    id: 'sheet2',
    name: 'Tile Sheet 2',
    src: '/assets/tilesheets/tileSheet.png',
    tileWidth: 32,
    tileHeight: 32,
    columns: 8,
    rows: 4,
  },
];

// Helper function: create an empty 2D array
function createEmptyGrid(rows, cols, fillValue = null) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => fillValue)
  );
}

export default function Home() {
  // State for the selected tile sheet (default to the first one in the array)
  const [selectedAsset, setSelectedAsset] = useState(tileSheets[0]);

  // State for the selected tile index (for layer 0 or 1)
  const [selectedTile, setSelectedTile] = useState(null);

  // State for the selected collision code (for layer 2)
  // 0 = Walkable, 1 = Blocked, 2 = Walk-under
  const [selectedCollision, setSelectedCollision] = useState(0);

  // State for the map dimensions
  const [rows, setRows] = useState(8);
  const [columns, setColumns] = useState(8);

  // We have THREE layers now:
  // layer 0 = base tiles
  // layer 1 = overlay tiles
  // layer 2 = collision data
  const [mapLayers, setMapLayers] = useState(() => [
    createEmptyGrid(rows, columns), // Base layer (tiles)
    createEmptyGrid(rows, columns), // Overlay layer (tiles)
    createEmptyGrid(rows, columns, 0), // Collision layer (integers), default to 0 = walkable
  ]);

  // Which layer is currently active? 0, 1, or 2
  const [activeLayer, setActiveLayer] = useState(0);

  // Mouse state for "click and drag" painting
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Function to generate (or regenerate) new empty layers
  // For collision layer, let's default to 0 (walkable)
  const generateMap = () => {
    const newLayer0 = createEmptyGrid(rows, columns);
    const newLayer1 = createEmptyGrid(rows, columns);
    const newLayer2 = createEmptyGrid(rows, columns, 0); // default to 0 = walkable
    setMapLayers([newLayer0, newLayer1, newLayer2]);
    // Optionally reset selectedTile, selectedCollision, etc.
    // setSelectedTile(null);
    // setSelectedCollision(0);
  };

  // Compute the total number of tiles in the current sheet
  const totalTiles = selectedAsset.columns * selectedAsset.rows;

  // Function: get inline CSS for a given tile index
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

  // Helper: place a tile or collision code at a given cell
  const placeTileOrCollision = (rowIndex, colIndex) => {
    setMapLayers((prevLayers) =>
      prevLayers.map((layer, layerIndex) => {
        if (layerIndex !== activeLayer) {
          // Not the active layer: just return it
          return layer;
        }

        // If we are editing layer 0 or 1, place a tile index
        // If we are editing layer 2, place a collision code
        return layer.map((rowArr, ri) => {
          if (ri !== rowIndex) return rowArr;
          return rowArr.map((cellVal, ci) => {
            if (ci !== colIndex) return cellVal;

            if (activeLayer < 2) {
              // layer 0 or 1: place a tile
              if (selectedTile === null) return cellVal;
              return selectedTile;
            } else {
              // layer 2: place a collision code
              return selectedCollision;
            }
          });
        });
      })
    );
  };

  // Called when user presses mouse down on a cell
  const handleMouseDownCell = (rowIndex, colIndex) => {
    setIsMouseDown(true);
    placeTileOrCollision(rowIndex, colIndex);
  };

  // Called when user enters (hovers over) a cell while mouse is down
  const handleMouseEnterCell = (rowIndex, colIndex) => {
    if (isMouseDown) {
      placeTileOrCollision(rowIndex, colIndex);
    }
  };

  // Called when the user lifts the mouse button anywhere
  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  // Called when the user selects a different tile sheet from the dropdown
  const handleAssetChange = (e) => {
    const selectedId = e.target.value;
    const newAsset = tileSheets.find((sheet) => sheet.id === selectedId);

    if (newAsset) {
      setSelectedAsset(newAsset);
      setSelectedTile(null); // optionally reset the current tile selection
      // If you also want to reset the map, uncomment:
      // setMapLayers([
      //   createEmptyGrid(rows, columns),
      //   createEmptyGrid(rows, columns),
      //   createEmptyGrid(rows, columns, 0),
      // ]);
    }
  };

  // Called when switching layers (0 = base, 1 = overlay, 2 = collision)
  const handleLayerChange = (e) => {
    setActiveLayer(Number(e.target.value));
  };

  // Copy the mapLayers JSON to the clipboard
  const copyMapLayersToClipboard = () => {
    const textToCopy = JSON.stringify(mapLayers, null, 2);
    navigator.clipboard.writeText(textToCopy);
    alert('Map layers JSON copied to clipboard!');
  };

  return (
    <div style={{ padding: 16 }} onMouseUp={handleMouseUp}>
      <h1>Map Editor</h1>

      {/* 1) Asset Selector */}
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="asset-select" style={{ marginRight: 8 }}>
          Select Tile Sheet:
        </label>
        <select id="asset-select" onChange={handleAssetChange} value={selectedAsset.id}>
          {tileSheets.map((sheet) => (
            <option key={sheet.id} value={sheet.id}>
              {sheet.name}
            </option>
          ))}
        </select>
      </div>

      {/* 2) Map Size Controls */}
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

      {/* 3) Layer Selector */}
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

      {/* 3b) Collision Type Selector (only show if collision layer is active) */}
      {activeLayer === 2 && (
        <div style={{ marginBottom: 16 }}>
          <strong>Collision Type:</strong>{' '}
          <label>
            <input
              type="radio"
              name="collision"
              value={0}
              checked={selectedCollision === 0}
              onChange={() => setSelectedCollision(0)}
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
              onChange={() => setSelectedCollision(1)}
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
              onChange={() => setSelectedCollision(2)}
            />
            Walk Under
          </label>
        </div>
      )}

      {/* 4) Tile Palette for the current tile sheet (only relevant for layers 0 and 1) */}
      {activeLayer < 2 && (
        <div
          style={{
            display: 'grid',
            gridTemplateRows: `repeat(${selectedAsset.rows}, ${selectedAsset.tileHeight}px)`,
            gridTemplateColumns: `repeat(${selectedAsset.columns}, ${selectedAsset.tileWidth}px)`,
            gap: 2,
            marginBottom: 16,
          }}
        >
          {Array.from({ length: totalTiles }, (_, index) => (
            <div
              key={index}
              style={{
                ...getTileStyle(index),
                border: selectedTile === index ? '1px solid red' : '1px solid #ccc',
                cursor: 'pointer',
              }}
              onClick={() => setSelectedTile(index)}
              title={`Tile #${index}`}
            />
          ))}
        </div>
      )}

      {/* 5) The Map Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${rows}, ${selectedAsset.tileHeight}px)`,
          gridTemplateColumns: `repeat(${columns}, ${selectedAsset.tileWidth}px)`,
          gap: 0,
          marginBottom: 16,
        }}
      >
        {mapLayers[0].map((rowArr, rowIndex) =>
          rowArr.map((_, colIndex) => {
            // Base tile (layer 0)
            const baseTileIndex = mapLayers[0][rowIndex][colIndex];
            // Overlay tile (layer 1)
            const overlayTileIndex = mapLayers[1][rowIndex][colIndex];
            // Collision code (layer 2): 0=walk,1=blocked,2=under
            const collisionCode = mapLayers[2][rowIndex][colIndex];

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                style={{
                  position: 'relative', // to stack overlay or text
                  width: selectedAsset.tileWidth,
                  height: selectedAsset.tileHeight,
                  border: '1px solid rgba(0, 0, 0, .2)',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  margin: 0,
                  padding: 0,
                }}
                // For click and drag painting:
                onMouseDown={() => handleMouseDownCell(rowIndex, colIndex)}
                onMouseEnter={() => handleMouseEnterCell(rowIndex, colIndex)}
              >
                {/* Base Layer */}
                {baseTileIndex !== null && (
                  <div
                    style={{
                      ...getTileStyle(baseTileIndex),
                      pointerEvents: 'none', // so clicks pass through to parent
                    }}
                  />
                )}

                {/* Overlay Layer */}
                {overlayTileIndex !== null && (
                  <div
                    style={{
                      ...getTileStyle(overlayTileIndex),
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Collision "rendering" (just a small text or color overlay) */}
                {collisionCode !== 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: selectedAsset.tileWidth,
                      height: selectedAsset.tileHeight,
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: 'red',
                      backgroundColor: 'rgba(255,0,0,0.1)',
                    }}
                  >
                    {collisionCode === 1 ? 'B' : 'U'}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 6) Debug: Show the data in a scrollable box */}
      <button onClick={copyMapLayersToClipboard} style={{ marginBottom: 8 }}>
        Copy JSON
      </button>
      <div
        style={{
          maxHeight: 100,
          overflowY: 'auto',
          border: '1px solid #ccc',
          padding: '8px',
          marginBottom: 8,
          backgroundColor: '#f9f9f9',
        }}
      >
        <pre>{JSON.stringify(mapLayers, null, 2)}</pre>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';

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

// A simple inventory hook
function useInventory() {
  const [inventory, setInventory] = useState({ wood: 0 });
  return { inventory, setInventory };
}

// Function to handle collecting wood
function getWood(context, qty, row, col) {
  context.removeOverlayTile(row, col);
  context.clearCollisionTile(row, col);

  context.setInventory((prev) => ({ ...prev, wood: prev.wood + qty }));
  context.setNotification(`Picked up ${qty} wood!`);
  setTimeout(() => {
    context.setNotification(null);
  }, 2000);
}

export default function MapEditor() {
  // 1) Selected tile sheet
  const [selectedAsset, setSelectedAsset] = useState(tileSheets[0]);

  // 2) Selected collision type
  // 0=walkable, 1=blocked, 2=walk-under, 3=action, 4=teleport
  const [selectedCollision, setSelectedCollision] = useState(0);

  // 3) Map dimensions
  const [rows, setRows] = useState(8);
  const [columns, setColumns] = useState(8);

  // 4) Map layers: 0=base, 1=overlay, 2=collision
  const [mapLayers, setMapLayers] = useState(() => [
    createEmptyGrid(8, 8),
    createEmptyGrid(8, 8),
    createEmptyGrid(8, 8, 0),
  ]);

  // 5) Active layer
  const [activeLayer, setActiveLayer] = useState(0);

  // 6) Click-and-drag painting
  const [isMouseDownMap, setIsMouseDownMap] = useState(false);

  // 7) Click-and-drag selection in tile palette
  const [isSelectingPalette, setIsSelectingPalette] = useState(false);

  // 8) Tile palette selection indices
  const [startIndex, setStartIndex] = useState(null);
  const [endIndex, setEndIndex] = useState(null);

  // 9) Selected brush
  const [selectedBrush, setSelectedBrush] = useState(null);

  // 10) For loading a map
  const fileInputRef = useRef(null);

  // 11) For the "action/teleport" modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInput, setModalInput] = useState('');
  const [pendingTile, setPendingTile] = useState(null);

  // 12) Inventory and notifications
  const { inventory, setInventory } = useInventory();
  const [notification, setNotification] = useState(null);

  // 13) Equipment
  const [leftHand, setLeftHand] = useState(null);
  const [rightHand, setRightHand] = useState(null);

  // 14) Menu and Inventory overlays
  const [menuOpen, setMenuOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  const menuItems = ['Resume', 'Inventory', 'Settings', 'Exit'];
  const [focusIndex, setFocusIndex] = useState(0);
  const [menuScrollActive, setMenuScrollActive] = useState(false);

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
    if (tileIndex == null) return {};
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
    setEndIndex(index);
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

        // If collision layer
        if (activeLayer === 2) {
          // If user selected collision=3 or 4, we open a modal to type the function
          if (selectedCollision === 3 || selectedCollision === 4) {
            // We'll store row/col in pendingTile, open the modal
            setPendingTile({ row: rowIndex, col: colIndex });
            setModalInput(''); // reset
            setModalOpen(true);
            return layer; // We'll place it AFTER user closes modal
          }

          // If it's 0,1,2 => just store the integer
          return layer.map((rowArr, r) => {
            if (r !== rowIndex) return rowArr;
            return rowArr.map((val, c) => {
              if (c !== colIndex) return val;
              return selectedCollision; // store as integer
            });
          });
        }

        // Otherwise (base/overlay) use the brush
        if (!selectedBrush || selectedBrush.length === 0) {
          // If no brush, do nothing
          return layer;
        }
        return pasteBrush(layer, rowIndex, colIndex, selectedBrush);
      })
    );
  };

  // After the user closes the modal, we finalize placing an object in the collision layer
  const finalizeCollisionWithModal = () => {
    if (!pendingTile) return;
    const { row, col } = pendingTile;
    setMapLayers((prevLayers) => {
      return prevLayers.map((layer, layerIndex) => {
        if (layerIndex !== 2) return layer; // only collision
        // We place an object with { code, func: modalInput }
        return layer.map((rowArr, r) => {
          if (r !== row) return rowArr;
          return rowArr.map((val, c) => {
            if (c !== col) return val;
            return { code: selectedCollision, func: modalInput };
          });
        });
      });
    });
    setPendingTile(null);
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

  // Called when user clicks "OK" in the modal
  const handleModalOk = () => {
    finalizeCollisionWithModal();
    setModalOpen(false);
  };

  // Called when user clicks "Cancel" in the modal
  const handleModalCancel = () => {
    setPendingTile(null);
    setModalOpen(false);
  };

  // ============ HANDS ACTIONS ============
  // "Use" left hand item if any, else punch
  function useLeftHand() {
    if (leftHand) {
      alert(`Using left hand item: ${leftHand}`);
      // e.g., apply item logic
    } else {
      alert('Swinging left fist!');
    }
  }

  // "Use" right hand item if any, else punch
  function useRightHand() {
    if (rightHand) {
      alert(`Using right hand item: ${rightHand}`);
      // e.g., apply item logic
    } else {
      alert('Swinging right fist!');
    }
  }

  // ============ MENU BUTTON LOGIC ============
  // This is the missing function causing the ReferenceError
  function handleMenuButton() {
    if (inventoryOpen) {
      setInventoryOpen(false);
    } else {
      setMenuOpen(!menuOpen);
    }
  }

  // ============ RENDER ============
  // Build arrays for base/overlay
  const baseTiles = [];
  const overlayTiles = [];
  for (let r = 0; r < mapLayers[0].length; r++) {
    for (let c = 0; c < mapLayers[0][r].length; c++) {
      const baseIndex = mapLayers[0][r][c];
      const overlayIndex = mapLayers[1][r][c];
      const leftPx = c * selectedAsset.tileWidth;
      const topPx = r * selectedAsset.tileHeight;
      if (baseIndex !== null) {
        baseTiles.push({ left: leftPx, top: topPx, tileIndex: baseIndex });
      }
      if (overlayIndex !== null) {
        overlayTiles.push({ left: leftPx, top: topPx, tileIndex: overlayIndex });
      }
    }
  }

  return (
    <div className='page-container' onMouseUp={handleMapMouseUp}>
      <h1>Map Editor (With Action/Teleport Modal)</h1>

      {/* Asset Selector */}
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

      {/* Load Map Button */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => fileInputRef.current.click()}>Load Map</button>
        <input
          type="file"
          accept="application/json"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
              try {
                const json = JSON.parse(event.target.result);
                // Validate the JSON structure
                if (json.tileSheet && json.mapLayers) {
                  // Find the tileSheet in tileSheets
                  const foundSheet = tileSheets.find(sheet => sheet.id === json.tileSheet.id);
                  if (foundSheet) {
                    setSelectedAsset(foundSheet);
                  } else {
                    alert('Tile sheet in JSON does not match any available tile sheets.');
                    return;
                  }
                  // Ensure the map size matches
                  const newRows = json.mapLayers[0].length;
                  const newCols = json.mapLayers[0][0].length;
                  setRows(newRows);
                  setColumns(newCols);
                  // Update map layers
                  setMapLayers(json.mapLayers);
                  // Reset brush selection
                  setSelectedBrush(null);
                  setStartIndex(null);
                  setEndIndex(null);
                  alert('Map loaded successfully!');
                } else {
                  alert('Invalid map JSON structure.');
                }
              } catch (error) {
                alert('Error parsing JSON map: ' + error.message);
              }
            };
            reader.readAsText(file);
          }}
        />
      </div>

      {/* Generate Map Button */}
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

      {/* Collision Types */}
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

      {/* Tile Palette */}
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

      {/* Map Grid */}
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
            const baseVal = mapLayers[0][rowIndex][colIndex];
            const overlayVal = mapLayers[1][rowIndex][colIndex];
            const collisionVal = mapLayers[2][rowIndex][colIndex];

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
                {/* Base tile */}
                {baseVal !== null && (
                  <div
                    style={{
                      ...getTileStyle(baseVal),
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {/* Overlay tile */}
                {overlayVal !== null && (
                  <div
                    style={{
                      ...getTileStyle(overlayVal),
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {/* Collision Overlay */}
                {renderCollisionOverlay(collisionVal)}
              </div>
            );
          })
        )}
      </div>

      {/* Debug + Copy JSON */}
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

      {/* The Modal for Action/Teleport */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: 16,
              borderRadius: 8,
              minWidth: 300,
            }}
          >
            <h3>
              {selectedCollision === 3 ? 'Action Function' : 'Teleport Target'}
            </h3>
            <p>Enter the function/target name:</p>
            <input
              type="text"
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
              style={{ width: '100%', marginBottom: 8 }}
            />
            <div style={{ textAlign: 'right' }}>
              <button onClick={handleModalCancel} style={{ marginRight: 8 }}>
                Cancel
              </button>
              <button onClick={handleModalOk}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Notification display */}
      {notification && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#fffa',
            padding: '8px 16px',
            border: '1px solid #888',
            borderRadius: 4,
            zIndex: 10000,
          }}
        >
          {notification}
        </div>
      )}

    </div>
  );
}

// Renders collision overlay
function renderCollisionOverlay(val) {
  if (val === null || val === 0) return null;
  let code = val;
  let func = null;

  // If it's an object
  if (typeof val === 'object') {
    code = val.code;
    func = val.func; // user-typed function string
  }

  if (code === 1) {
    return overlayBox('B', 'red');
  } else if (code === 2) {
    return overlayBox('U', 'blue');
  } else if (code === 3) {
    return overlayBox(func ? `A:${func}` : 'A', 'green');
  } else if (code === 4) {
    return overlayBox(func ? `T:${func}` : 'T', 'purple');
  }
  return null;
}

function overlayBox(label, color) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        fontSize: 14,
        fontWeight: 'bold',
        color,
        backgroundColor: `rgba(0,0,0,0.1)`,
      }}
    >
      {label}
    </div>
  );
}

/** Minimal Virtual Joystick */
function VirtualJoystick({ size, onMove }) {
  const radius = size / 2;
  const handleRadius = radius * 0.4;
  const centerRef = useRef({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const [handlePos, setHandlePos] = useState({ x: 0, y: 0 });

  const outerStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    backgroundColor: 'rgba(100,100,100,0.3)',
    position: 'relative',
    touchAction: 'none',
    marginRight: 16,
  };

  const handleStyle = {
    position: 'absolute',
    width: handleRadius * 2,
    height: handleRadius * 2,
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    left: radius - handleRadius + handlePos.x,
    top: radius - handleRadius + handlePos.y,
  };

  function startDrag(clientX, clientY, rect) {
    setDragging(true);
    centerRef.current = {
      x: rect.left + radius,
      y: rect.top + radius,
    };
    moveHandle(clientX, clientY);
  }

  function moveHandle(clientX, clientY) {
    const center = centerRef.current;
    const dx = clientX - center.x;
    const dy = clientY - center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const maxDist = radius - handleRadius;
    const clampedDist = Math.min(dist, maxDist);

    const nx = Math.cos(angle) * clampedDist;
    const ny = Math.sin(angle) * clampedDist;
    setHandlePos({ x: nx, y: ny });

    const norm = dist === 0 ? 1 : dist;
    const ndx = dx / norm;
    const ndy = dy / norm;
    const mag = Math.min(dist / maxDist, 1);

    onMove(ndx, ndy, mag);
  }

  function endDrag() {
    setDragging(false);
    setHandlePos({ x: 0, y: 0 });
    onMove(0, 0, 0);
  }

  function onPointerDown(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.type === 'touchstart') {
      const touch = e.touches[0];
      startDrag(touch.clientX, touch.clientY, rect);
    } else {
      startDrag(e.clientX, e.clientY, rect);
    }
  }

  function onPointerMove(e) {
    if (!dragging) return;
    if (e.type.includes('touch')) {
      const touch = e.touches[0];
      moveHandle(touch.clientX, touch.clientY);
    } else {
      moveHandle(e.clientX, e.clientY);
    }
  }

  function onPointerEnd() {
    endDrag();
  }

  return (
    <div
      style={outerStyle}
      onMouseDown={onPointerDown}
      onMouseMove={onPointerMove}
      onMouseUp={onPointerEnd}
      onMouseLeave={onPointerEnd}
      onTouchStart={onPointerDown}
      onTouchMove={onPointerMove}
      onTouchEnd={onPointerEnd}
    >
      <div style={handleStyle} />
    </div>
  );
}

// Circle button style
const circleButtonStyle = {
  width: 60,
  height: 60,
  borderRadius: '50%',
  border: '2px solid #444',
  fontSize: '0.8rem',
  cursor: 'pointer',
  backgroundColor: '#fafafa',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none',
  position: 'absolute',
};

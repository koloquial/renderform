import React, { useState, useEffect, useRef } from 'react';
import mapData from '@/maps/mapData.json'; // Adjust path as needed

function useInventory() {
  const [inventory, setInventory] = useState({ wood: 0 });
  return { inventory, setInventory };
}

function getWood(context, qty, row, col) {
  context.removeOverlayTile(row, col);
  context.clearCollisionTile(row, col);

  context.setInventory((prev) => ({ ...prev, wood: prev.wood + qty }));
  context.setNotification(`Picked up ${qty} wood!`);
  setTimeout(() => {
    context.setNotification(null);
  }, 2000);
}

export default function MapDisplay() {
  const { tileSheet, mapLayers } = mapData;
  const { src, tileWidth, tileHeight, columns, rows } = tileSheet;

  // We'll store layers in state
  const [baseLayer, setBaseLayer] = useState(mapLayers[0]);
  const [overlayLayer, setOverlayLayer] = useState(mapLayers[1]);
  const [collisionLayer, setCollisionLayer] = useState(mapLayers[2]);

  // Map info
  const mapRows = baseLayer.length;
  const mapCols = baseLayer[0].length;
  const mapPixelWidth = mapCols * tileWidth;
  const mapPixelHeight = mapRows * tileHeight;

  // Viewport
  const viewportWidth = 600;
  const viewportHeight = 400;

  // Sprite starts in middle
  const initialSpriteX = Math.floor(mapPixelWidth / 2);
  const initialSpriteY = Math.floor(mapPixelHeight / 2);

  const [spriteX, setSpriteX] = useState(initialSpriteX);
  const [spriteY, setSpriteY] = useState(initialSpriteY);

  // Camera offset
  const [cameraX, setCameraX] = useState(0);
  const [cameraY, setCameraY] = useState(0);

  // Joystick states
  const [joyDX, setJoyDX] = useState(0);
  const [joyDY, setJoyDY] = useState(0);
  const [joyMagnitude, setJoyMagnitude] = useState(0);

  // Movement speeds
  const walkSpeed = 2;
  const runSpeed = 4;
  const [isRunning, setIsRunning] = useState(false);

  // Menu / Inventory
  const [menuOpen, setMenuOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  const menuItems = ['Resume', 'Inventory', 'Settings', 'Exit'];
  const [focusIndex, setFocusIndex] = useState(0);
  const [menuScrollActive, setMenuScrollActive] = useState(false);

  // Simple inventory + notification
  const { inventory, setInventory } = useInventory();
  const [notification, setNotification] = useState(null);

  // margin for camera
  const marginX = 5 * tileWidth;
  const marginY = 5 * tileHeight;

  // adjacency
  const [adjacentActionTile, setAdjacentActionTile] = useState(null);

  //UPDATE
  // Left/Right hand items: e.g. 'sword', 'axe', or null
  // For demonstration, we assume the user can equip items from inventory or by code logic
  const [leftHand, setLeftHand] = useState(null);
  const [rightHand, setRightHand] = useState(null);

  // Helper: remove overlay tile
  function removeOverlayTile(row, col) {
    setOverlayLayer((prev) => {
      const newLayer = prev.map((rowArr) => [...rowArr]);
      newLayer[row][col] = null;
      return newLayer;
    });
  }

  // Helper: set collision to 0 => user can pass
  function clearCollisionTile(row, col) {
    setCollisionLayer((prev) => {
      const newLayer = prev.map((rowArr) => [...rowArr]);
      newLayer[row][col] = 0;
      return newLayer;
    });
  }

  // -------------- CAMERA --------------
  function updateCamera(nx, ny) {
    let desiredCamX = nx - viewportWidth / 2;
    let desiredCamY = ny - viewportHeight / 2;

    if (desiredCamX < 0) desiredCamX = 0;
    if (desiredCamX > mapPixelWidth - viewportWidth) {
      desiredCamX = mapPixelWidth - viewportWidth;
    }
    if (desiredCamY < 0) desiredCamY = 0;
    if (desiredCamY > mapPixelHeight - viewportHeight) {
      desiredCamY = mapPixelHeight - viewportHeight;
    }

    if (nx < marginX) desiredCamX = 0;
    if (nx > mapPixelWidth - marginX) {
      desiredCamX = mapPixelWidth - viewportWidth;
    }
    if (ny < marginY) desiredCamY = 0;
    if (ny > mapPixelHeight - marginY) {
      desiredCamY = mapPixelHeight - viewportHeight;
    }

    setCameraX(desiredCamX);
    setCameraY(desiredCamY);
  }

  // -------------- COLLISION --------------
  // code=1 or code=3 => blocked
  // code=2 or code=0 => pass
  function canMoveTo(px, py) {
    const col = Math.floor(px / tileWidth);
    const row = Math.floor(py / tileHeight);
    if (col < 0 || col >= mapCols || row < 0 || row >= mapRows) return false;

    let c = collisionLayer[row][col];
    if (typeof c === 'object') c = c.code;
    if (c === 1 || c === 3) return false;
    return true;
  }

  // -------------- MOVEMENT / MENU --------------
  useEffect(() => {
    let frameId;
    function loop() {
      const baseSpeed = isRunning ? runSpeed : walkSpeed;
      const speed = baseSpeed * joyMagnitude;

      if (!menuOpen && !inventoryOpen && speed > 0.01) {
        setSpriteX((prevX) => {
          const nx = prevX + joyDX * speed;
          if (canMoveTo(nx, spriteY)) {
            return Math.min(Math.max(nx, 0), mapPixelWidth);
          }
          return prevX;
        });

        setSpriteY((prevY) => {
          const ny = prevY + joyDY * speed;
          if (canMoveTo(spriteX, ny)) {
            return Math.min(Math.max(ny, 0), mapPixelHeight);
          }
          return prevY;
        });
      }

      if (menuOpen) {
        if (Math.abs(joyDY) < 0.4) setMenuScrollActive(false);
        if (!menuScrollActive) {
          if (joyDY < -0.5) {
            moveFocus(-1);
            setMenuScrollActive(true);
          } else if (joyDY > 0.5) {
            moveFocus(1);
            setMenuScrollActive(true);
          }
        }
      }

      frameId = requestAnimationFrame(loop);
    }
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [
    menuOpen,
    inventoryOpen,
    isRunning,
    joyDX,
    joyDY,
    joyMagnitude,
    spriteX,
    spriteY,
    menuScrollActive,
  ]);

  function moveFocus(dir) {
    setFocusIndex((prev) => {
      let next = prev + dir;
      if (next < 0) next = menuItems.length - 1;
      if (next >= menuItems.length) next = 0;
      return next;
    });
  }

  useEffect(() => {
    updateCamera(spriteX, spriteY);
    checkForAdjacentAction();
  }, [spriteX, spriteY]);

  // -------------- ADJACENCY CHECK --------------
  function checkForAdjacentAction() {
    const col = Math.floor(spriteX / tileWidth);
    const row = Math.floor(spriteY / tileHeight);

    const neighbors = [
      { r: row - 1, c: col },
      { r: row + 1, c: col },
      { r: row, c: col - 1 },
      { r: row, c: col + 1 },
    ];

    let foundTile = null;
    for (let n of neighbors) {
      if (n.r >= 0 && n.r < mapRows && n.c >= 0 && n.c < mapCols) {
        const cellVal = collisionLayer[n.r][n.c];
        let code = cellVal;
        let func = null;

        if (typeof cellVal === 'object') {
          code = cellVal.code;
          func = cellVal.func;
        }

        if (code === 3) {
          foundTile = { row: n.r, col: n.c, func };
          break;
        }
      }
    }
    setAdjacentActionTile(foundTile);
  }

  // -------------- SELECT --------------
  function handleSelect() {
    if (!menuOpen && !inventoryOpen && adjacentActionTile) {
      if (adjacentActionTile.func) {
        switch (adjacentActionTile.func) {
          case 'getWood':
            getWood(
              {
                removeOverlayTile,
                clearCollisionTile,
                setInventory,
                setNotification,
              },
              5,
              adjacentActionTile.row,
              adjacentActionTile.col
            );
            break;
          default:
            alert(`Firing custom function: ${adjacentActionTile.func}`);
            break;
        }
      } else {
        alert('Firing default action function!');
      }
    } 
    else if (inventoryOpen) {
      setInventoryOpen(false);
    }
    else if (menuOpen) {
      const item = menuItems[focusIndex];
      if (item === 'Resume') {
        setMenuOpen(false);
      } else if (item === 'Inventory') {
        setMenuOpen(false);
        setInventoryOpen(true);
      } else if (item === 'Exit') {
        alert('Exiting game...');
      } else {
        alert(`Selected: ${item}`);
      }
    } 
    else {
      console.log('Select pressed, but no action tile nearby');
    }
  }

  // -------------- MENU BUTTON --------------
  function handleMenuButton() {
    if (inventoryOpen) {
      setInventoryOpen(false);
    } else {
      setMenuOpen(!menuOpen);
    }
  }

  // -------------- TOGGLE RUN --------------
  function toggleRun() {
    setIsRunning((prev) => !prev);
  }

  //UPDATE
  // "Use" left hand item if any, else punch
  function useLeftHand() {
    if (leftHand) {
      alert(`Using left hand item: ${leftHand}`);
      // e.g. apply item logic
    } else {
      alert('Swinging left fist!');
    }
  }

  //UPDATE
  // "Use" right hand item if any, else punch
  function useRightHand() {
    if (rightHand) {
      alert(`Using right hand item: ${rightHand}`);
    } else {
      alert('Swinging right fist!');
    }
  }

  // Build arrays for base/overlay
  const baseTiles = [];
  const overlayTiles = [];
  for (let r = 0; r < baseLayer.length; r++) {
    for (let c = 0; c < baseLayer[r].length; c++) {
      const baseIndex = baseLayer[r][c];
      const overlayIndex = overlayLayer[r][c];
      const leftPx = c * tileWidth;
      const topPx = r * tileHeight;
      if (baseIndex !== null) {
        baseTiles.push({ left: leftPx, top: topPx, tileIndex: baseIndex });
      }
      if (overlayIndex !== null) {
        overlayTiles.push({ left: leftPx, top: topPx, tileIndex: overlayIndex });
      }
    }
  }

  function getTileStyle(tileIndex) {
    if (tileIndex == null) return {};
    const col = tileIndex % columns;
    const row = Math.floor(tileIndex / columns);
    const xOffset = col * tileWidth;
    const yOffset = row * tileHeight;
    return {
      position: 'absolute',
      width: tileWidth,
      height: tileHeight,
      backgroundImage: `url("${src}")`,
      backgroundPosition: `-${xOffset}px -${yOffset}px`,
      backgroundRepeat: 'no-repeat',
      pointerEvents: 'none',
    };
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

  const containerStyle = {
    width: viewportWidth,
    height: viewportHeight,
    overflow: 'hidden',
    border: '2px solid #444',
    position: 'relative',
    marginBottom: 16,
  };

  const worldStyle = {
    width: mapPixelWidth,
    height: mapPixelHeight,
    position: 'absolute',
    left: -cameraX,
    top: -cameraY,
  };

  const spriteStyle = {
    position: 'absolute',
    left: spriteX - tileWidth / 2,
    top: spriteY - tileHeight / 2,
    width: tileWidth,
    height: tileHeight,
    backgroundColor: 'limegreen',
    opacity: 0.7,
  };

  const selectButtonStyle = {
    ...circleButtonStyle,
    bottom: 0,
    left: 70,
    backgroundColor: adjacentActionTile && !menuOpen && !inventoryOpen ? 'green' : '#fafafa',
    color: adjacentActionTile && !menuOpen && !inventoryOpen ? '#fff' : '#000',
  };

  return (
    <div style={{ padding: 16, position: 'relative' }}>
      <div style={containerStyle}>
        <div style={worldStyle}>
          {/* PASS 1: base */}
          {baseTiles.map((tile, idx) => (
            <div
              key={`base-${idx}`}
              style={{ position: 'absolute', left: tile.left, top: tile.top }}
            >
              <div style={getTileStyle(tile.tileIndex)} />
            </div>
          ))}

          {/* PASS 2: sprite */}
          <div style={spriteStyle} />

          {/* PASS 3: overlay */}
          {overlayTiles.map((tile, idx) => (
            <div
              key={`overlay-${idx}`}
              style={{ position: 'absolute', left: tile.left, top: tile.top }}
            >
              <div style={getTileStyle(tile.tileIndex)} />
            </div>
          ))}
        </div>

        {/* Menu overlay */}
        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.6)',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <h2>Menu</h2>
            {menuItems.map((m, idx) => (
              <div
                key={m}
                style={{
                  padding: '8px 16px',
                  margin: '4px 0',
                  backgroundColor:
                    idx === focusIndex ? 'rgba(255,255,255,0.4)' : 'transparent',
                }}
              >
                {m}
              </div>
            ))}
          </div>
        )}

        {/* Inventory overlay */}
        {inventoryOpen && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.6)',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <h2>Inventory</h2>
            <div style={{ backgroundColor: '#333', padding: 16, borderRadius: 8 }}>
              <p>Wood: {inventory.wood}</p>
              <p>Left Hand: {leftHand || 'Empty'}</p>
              <p>Right Hand: {rightHand || 'Empty'}</p>
              {/* More items? */}
            </div>
          </div>
        )}
      </div>

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

      {/* Controller row */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {/* Joystick */}
        <VirtualJoystick
          size={200}
          onMove={(dx, dy, mag) => {
            setJoyDX(dx);
            setJoyDY(dy);
            setJoyMagnitude(mag);
          }}
        />

        <div style={{ position: 'relative', width: 200, height: 200 }}>
          {/* top button: menu */}
          <button
            onClick={handleMenuButton}
            style={{
              ...circleButtonStyle,
              backgroundColor: menuOpen ? '#ddd' : '#fafafa',
              top: 0,
              left: 70,
            }}
          >
            Menu
          </button>

          {/* left button => left hand */}
          <button
            onClick={useLeftHand}
            style={{
              ...circleButtonStyle,
              top: 70,
              left: 0,
            }}
          >
            L
          </button>

          {/* right button => right hand */}
          <button
            onClick={useRightHand}
            style={{
              ...circleButtonStyle,
              top: 70,
              left: 140,
            }}
          >
            R
          </button>

          {/* bottom left: run toggle */}
          <button
            onClick={toggleRun}
            style={{
              ...circleButtonStyle,
              bottom: 0,
              left: 0,
              backgroundColor: isRunning ? 'green' : '#fafafa',
              color: isRunning ? '#fff' : '#000',
            }}
          >
            {isRunning ? 'Running' : 'Run'}
          </button>

          {/* bottom middle: select => highlight if there's an adjacent action tile */}
          <button onClick={handleSelect} style={selectButtonStyle}>
            Select
          </button>
        </div>
      </div>
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

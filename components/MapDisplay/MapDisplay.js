import React, { useState, useEffect, useRef } from 'react';
import mapData from '@/maps/mapData.json'; // Adjust path as needed

export default function MapDisplay() {
  const { tileSheet, mapLayers } = mapData;
  const { src, tileWidth, tileHeight, columns, rows } = tileSheet;

  // Layers
  const baseLayer = mapLayers[0];
  const overlayLayer = mapLayers[1];
  const collisionLayer = mapLayers[2];

  // Map dimensions
  const mapRows = baseLayer.length;
  const mapCols = baseLayer[0].length;
  const mapPixelWidth = mapCols * tileWidth;
  const mapPixelHeight = mapRows * tileHeight;

  // Viewport (camera)
  const viewportWidth = 600;
  const viewportHeight = 400;

  // Sprite starts in the middle
  const initialSpriteX = Math.floor(mapPixelWidth / 2);
  const initialSpriteY = Math.floor(mapPixelHeight / 2);

  const [spriteX, setSpriteX] = useState(initialSpriteX);
  const [spriteY, setSpriteY] = useState(initialSpriteY);

  // Camera offsets
  const [cameraX, setCameraX] = useState(0);
  const [cameraY, setCameraY] = useState(0);

  // Joystick input
  const [joyDX, setJoyDX] = useState(0);
  const [joyDY, setJoyDY] = useState(0);
  const [joyMagnitude, setJoyMagnitude] = useState(0);

  // Speeds
  const walkSpeed = 2;
  const sprintSpeed = 4;
  const [isRunning, setIsRunning] = useState(false); // Run button pressed?

  // Menu open/close
  const [menuOpen, setMenuOpen] = useState(false);
  const menuItems = ['Resume', 'Inventory', 'Settings', 'Exit'];
  const [focusIndex, setFocusIndex] = useState(0);
  const [menuScrollActive, setMenuScrollActive] = useState(false);

  // === CAMERA ===
  const marginX = 5 * tileWidth;
  const marginY = 5 * tileHeight;

  function updateCamera(nextX, nextY) {
    let desiredCamX = nextX - viewportWidth / 2;
    let desiredCamY = nextY - viewportHeight / 2;

    // clamp camera
    if (desiredCamX < 0) desiredCamX = 0;
    if (desiredCamX > mapPixelWidth - viewportWidth) {
      desiredCamX = mapPixelWidth - viewportWidth;
    }
    if (desiredCamY < 0) desiredCamY = 0;
    if (desiredCamY > mapPixelHeight - viewportHeight) {
      desiredCamY = mapPixelHeight - viewportHeight;
    }

    if (nextX < marginX) desiredCamX = 0;
    if (nextX > mapPixelWidth - marginX) {
      desiredCamX = mapPixelWidth - viewportWidth;
    }
    if (nextY < marginY) desiredCamY = 0;
    if (nextY > mapPixelHeight - marginY) {
      desiredCamY = mapPixelHeight - viewportHeight;
    }

    setCameraX(desiredCamX);
    setCameraY(desiredCamY);
  }

  // === COLLISION ===
  function canMoveTo(px, py) {
    const tileCol = Math.floor(px / tileWidth);
    const tileRow = Math.floor(py / tileHeight);

    if (tileCol < 0 || tileCol >= mapCols || tileRow < 0 || tileRow >= mapRows) {
      return false; // out of bounds => blocked
    }
    if (collisionLayer[tileRow][tileCol] === 1) {
      return false; // blocked
    }
    return true;
  }

  // === MOVEMENT / MENU NAV ===
  useEffect(() => {
    let frameId;
    function loop() {
      // Determine current speed
      const baseSpeed = isRunning ? sprintSpeed : walkSpeed;
      const speed = baseSpeed * joyMagnitude;

      // If menu is closed, move sprite
      if (!menuOpen && speed > 0.01) {
        setSpriteX((prevX) => {
          const nextX = prevX + joyDX * speed;
          if (canMoveTo(nextX, spriteY)) {
            return Math.min(Math.max(nextX, 0), mapPixelWidth);
          }
          return prevX;
        });
        setSpriteY((prevY) => {
          const nextY = prevY + joyDY * speed;
          if (canMoveTo(spriteX, nextY)) {
            return Math.min(Math.max(nextY, 0), mapPixelHeight);
          }
          return prevY;
        });
      }

      // If menu is open, navigate up/down
      if (menuOpen) {
        if (Math.abs(joyDY) < 0.4) {
          setMenuScrollActive(false);
        }
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
    joyDX,
    joyDY,
    joyMagnitude,
    spriteX,
    spriteY,
    isRunning,
    menuScrollActive,
  ]);

  function moveFocus(direction) {
    setFocusIndex((prev) => {
      let next = prev + direction;
      if (next < 0) next = menuItems.length - 1;
      if (next >= menuItems.length) next = 0;
      return next;
    });
  }

  // Camera updates
  useEffect(() => {
    updateCamera(spriteX, spriteY);
  }, [spriteX, spriteY]);

  // "Select" button
  function handleSelect() {
    if (!menuOpen) {
      console.log('Select pressed, but menu is closed!');
    } else {
      const item = menuItems[focusIndex];
      if (item === 'Resume') {
        setMenuOpen(false);
      } else if (item === 'Exit') {
        alert('Exiting game...');
      } else {
        alert(`Selected: ${item}`);
      }
    }
  }

  // Render tiles
  const tiles = [];
  for (let r = 0; r < mapRows; r++) {
    for (let c = 0; c < mapCols; c++) {
      const baseIndex = baseLayer[r][c];
      const overlayIndex = overlayLayer[r][c];
      const leftPx = c * tileWidth;
      const topPx = r * tileHeight;

      tiles.push(
        <div
          key={`${r}-${c}`}
          style={{
            position: 'absolute',
            left: leftPx,
            top: topPx,
            width: tileWidth,
            height: tileHeight,
          }}
        >
          {baseIndex !== null && (
            <div style={getTileStyle(baseIndex)} />
          )}
          {overlayIndex !== null && (
            <div
              style={{
                ...getTileStyle(overlayIndex),
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            />
          )}
        </div>
      );
    }
  }

  function getTileStyle(tileIndex) {
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
      pointerEvents: 'none',
    };
  }

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

  // Handlers for Run button
  const handleRunDown = () => setIsRunning(true);
  const handleRunUp = () => setIsRunning(false);

  return (
    <div style={{ padding: 16, position: 'relative' }}>
      {/* Map Container */}
      <div style={containerStyle}>
        <div style={worldStyle}>
          {tiles}
          <div style={spriteStyle} />
        </div>

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
      </div>

      {/* On-screen "controller" below the map */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
        }}
      >
        {/* Joystick on the left */}
        <div style={{ width: 200, height: 200 }}>
          <VirtualJoystick
            size={200}
            onMove={(dx, dy, mag) => {
              setJoyDX(dx);
              setJoyDY(dy);
              setJoyMagnitude(mag);
            }}
          />
        </div>

        {/* Buttons on the right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Menu button */}
          <button onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? 'Close' : 'Menu'}
          </button>

          {/* Select button */}
          <button onClick={handleSelect}>Select</button>

          {/* Run button (hold to run) */}
          <button
            onMouseDown={handleRunDown}
            onMouseUp={handleRunUp}
            onTouchStart={handleRunDown}
            onTouchEnd={handleRunUp}
            style={{
              backgroundColor: isRunning ? '#ddd' : '',
            }}
          >
            Run
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

  const startDrag = (clientX, clientY, rect) => {
    setDragging(true);
    centerRef.current = {
      x: rect.left + radius,
      y: rect.top + radius,
    };
    moveHandle(clientX, clientY);
  };

  const moveHandle = (clientX, clientY) => {
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

    // normalized direction & magnitude
    const norm = dist === 0 ? 1 : dist;
    const ndx = dx / norm;
    const ndy = dy / norm;
    const mag = Math.min(dist / maxDist, 1);

    onMove(ndx, ndy, mag);
  };

  const endDrag = () => {
    setDragging(false);
    setHandlePos({ x: 0, y: 0 });
    onMove(0, 0, 0);
  };

  const onPointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.type === 'touchstart') {
      const touch = e.touches[0];
      startDrag(touch.clientX, touch.clientY, rect);
    } else {
      startDrag(e.clientX, e.clientY, rect);
    }
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    if (e.type.includes('touch')) {
      const touch = e.touches[0];
      moveHandle(touch.clientX, touch.clientY);
    } else {
      moveHandle(e.clientX, e.clientY);
    }
  };

  const onPointerEnd = () => {
    endDrag();
  };

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

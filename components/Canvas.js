import { useRef, useEffect } from 'react';

const TILE_SIZE = 16; // Original tile size in the tile sheet
const SCALE = 1;    // Scale factor (50% reduction)

const Canvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const tileSheet = new Image();
    tileSheet.src = "/assets/tilesheets/PathAndObjects.png"; // Path to your tile sheet

    tileSheet.onload = () => {
      // Create a temporary canvas to scale the tile sheet
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");

      const scaledWidth = tileSheet.width * SCALE;
      const scaledHeight = tileSheet.height * SCALE;

      tempCanvas.width = scaledWidth;
      tempCanvas.height = scaledHeight;

      // Draw the scaled tile sheet onto the temporary canvas
      tempCtx.drawImage(tileSheet, 0, 0, scaledWidth, scaledHeight);

      // Use the scaled tile sheet for rendering
      const map = [
        [40,]
      ];

      const scaledTileSize = TILE_SIZE * SCALE;

      map.forEach((row, rowIndex) => {
        row.forEach((tile, colIndex) => {
          const sourceX = (tile % 4) * TILE_SIZE;
          const sourceY = Math.floor(tile / 4) * TILE_SIZE;

          ctx.drawImage(
            tempCanvas, // Use the scaled tile sheet
            sourceX * SCALE,
            sourceY * SCALE,
            scaledTileSize,
            scaledTileSize,
            colIndex * scaledTileSize,
            rowIndex * scaledTileSize,
            scaledTileSize,
            scaledTileSize
          );
        });
      });
    };
  }, []);

  return <canvas ref={canvasRef} width={320} height={320} style={{ border: "1px solid black" }} />;
};

export default Canvas;

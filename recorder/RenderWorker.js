var mixOffscreen = null;
var mixCanvas = null;
var mixCtx = null;
var tempCanvas = new OffscreenCanvas(0, 0);
var tempCtx = tempCanvas.getContext("2d", {
  desynchronized: true,
  alpha: false,
});

self.onmessage = (e) => {
  if (e.data.type === "startRender") {
    mixOffscreen = e.data.mixOffscreen;
    mixCtx = mixOffscreen.getContext("2d");
    mixCanvas = mixCtx.canvas;
    self.postMessage({ type: "onStartRender" });
  }
  if (e.data.type === "drawRender") {
    // {
    //   pos: { x: 0, y: 0, xRatio: 0, yRatio: 0 },
    //   size: { w: 0, h: 0, wRatio: 1, hRatio: 1 },
    //   origin: { w: 0, h: 0 },
    // };
    let rotate = e.data.rotate;
    let mirror = e.data.mirror;
    let source = e.data.sourceInfo;
    let videoBitmap = e.data.bitmaps.videoBitmap;
    let paintBitmap = e.data.bitmaps.paintBitmap;

    if (rotate === 0 || rotate === 180) {
      if (tempCanvas.width !== videoBitmap.width) {
        tempCanvas.width = videoBitmap.width;
      }
      if (tempCanvas.height !== videoBitmap.height) {
        tempCanvas.height = videoBitmap.height;
      }
    }
    if (rotate === 90 || rotate === 270) {
      if (tempCanvas.width !== videoBitmap.height) {
        tempCanvas.width = videoBitmap.height;
      }
      if (tempCanvas.height !== videoBitmap.width) {
        tempCanvas.height = videoBitmap.width;
      }
    }
    // 來源裁切
    let sx = source.pos.xRatio * tempCanvas.width;
    let sy = source.pos.yRatio * tempCanvas.height;
    let sw = source.size.wRatio * tempCanvas.width;
    let sh = source.size.hRatio * tempCanvas.height;
    // 輸出裁切
    let dw = source.size.wRatio * tempCanvas.width;
    let dh = source.size.hRatio * tempCanvas.height;
    // 輸出裁切大小計算
    let wRatio = mixCanvas.width / dw;
    let hRatio = mixCanvas.height / dh;
    if (wRatio > hRatio) {
      dw = dw * hRatio;
      dh = dh * hRatio;
    }
    if (wRatio < hRatio) {
      dw = dw * wRatio;
      dh = dh * wRatio;
    }
    if(wRatio === hRatio){
      dw = dw * wRatio;
      dh = dh * hRatio;
    }
    
    // 輸出裁切起點計算
    let dx = (mixCanvas.width - dw) / 2;
    let dy = (mixCanvas.height - dh) / 2;

    // 旋轉、左右翻轉
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.save();
    if (rotate === 90) {
      tempCtx.translate(tempCanvas.width, 0);
    }
    if (rotate === 180) {
      tempCtx.translate(tempCanvas.width, tempCanvas.height);
    }
    if (rotate === 270) {
      tempCtx.translate(0, tempCanvas.height);
    }
    tempCtx.rotate((rotate * Math.PI) / 180);
    if (!mirror) {
      tempCtx.drawImage(videoBitmap, 0, 0, videoBitmap.width, videoBitmap.height);
      tempCtx.drawImage(paintBitmap, 0, 0, paintBitmap.width, paintBitmap.height);
    } else {
      tempCtx.scale(-1, 1);
      tempCtx.drawImage(videoBitmap, 0, 0, -videoBitmap.width, videoBitmap.height);
      tempCtx.drawImage(paintBitmap, 0, 0, -paintBitmap.width, paintBitmap.height);
    }
    tempCtx.restore();
    // 根據資料從已經旋轉、翻轉的圖像裁切畫面到錄影畫布
    mixCtx.clearRect(0, 0, mixCanvas.width, mixCanvas.height);
    mixCtx.drawImage(tempCanvas, sx, sy, sw, sh, dx, dy, dw, dh);
    
    e.data.bitmaps.videoBitmap.close();
    e.data.bitmaps.paintBitmap.close();
    setTimeout(() => {
      requestAnimationFrame(() => {
        self.postMessage({ type: "onDrawRender" });
      });
    }, 33.3333);
  }
  if (e.data.type === "stopRender") {
    self.postMessage({ type: "onStopRender" });
  }
};

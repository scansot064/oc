class QRCodeDetect {
  constructor(liveFrameElement, liveVideoElement) {
    this.videoSource = liveVideoElement; // liveVideoElemenet
    this.liveFrame = liveFrameElement; // liveFrameElement

    this.drawCanvas = null; // detectPaint 繪製顯示 QRCode 框框
    this.drawCtx = null; // detectPaint canvas ctx

    this.workerURL = new URL("./QRCodeWorker.js", import.meta.url);
    // 設定 webworker url
    this.qrCodeWorker = new Worker(this.workerURL);
    // create Worker

    // 辨識時需要兼顧 rotate、mirror 等參數
    // wRatio、hRatio 已經沒用
    this.transferInfo = {
      rotate: 0,
      wRatio: 1,
      hRatio: 1,
      mirror: false,
    };

    // 傳輸給 worker 使用的資料體
    this.postData = {};

    //
    this.calcWidth = 800;
    this.calcHeight = 600;
    this.sourceWidth = 800; // 原始影像解析度
    this.sourceHeight = 600;

    this.process = false;
    this.processIng = false;

    this.isSlowModel = false;
    this.nowFnLabel = "";
    this.prevFnLabel = "";

    // 計算是否有連續辨識成功需要用到
    this.FnInfo = {
      list: [],
      continuous: false,
    };
    // Web API EventTarget 發送和監聽
    this.listener = new EventTarget();

    this.lineSize = 8;

    this.prevPosition = null;
    this.QRCodeToward = "top";

    this.arrowArea = document.createElement("canvas");
    this.arrowCtx = this.arrowArea.getContext("2d");

    // 和 QRCode 顯示 HighLight、Spotlight的起點有關。
    this.directionInfo = {
      begin: { x: 0, y: 0 },
      apex: { x: 0, y: 0 },
      length: 0,
    };
    // 和 QRCode 顯示箭頭有關
    this.pointInfo = {
      arrowBegin: { x: 0, y: 0 },
      baseCenter: { x: 0, y: 0 },
      baseLeft: { x: 0, y: 0 },
      baseRight: { x: 0, y: 0 },
      exCenter: { x: 0, y: 0 },
      exLeft: { x: 0, y: 0 },
      exRight: { x: 0, y: 0 },
    };

    this.positionToClose = false;

    this.LastActionLabel = "";

    this.forceRedraw = false;
  }

  // 繪製 QRCode 的顯示框框
  drawRect(ctx, position) {
    const drawSide = (x1, x2, x3, y1, y2, y3) => {
      let pointA = {
        x: (8 * x1 + 2 * x2) / 10,
        y: (8 * y1 + 2 * y2) / 10,
      };
      let pointB = {
        x: (8 * x1 + 2 * x3) / 10,
        y: (8 * y1 + 2 * y3) / 10,
      };
      ctx.moveTo(pointA.x, pointA.y);
      ctx.lineTo(x1, y1);
      ctx.lineTo(pointB.x, pointB.y);
    };
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = this.sourceWidth / 400;
    ctx.strokeStyle = "#4d87a8";
    drawSide(position[0].x, position[1].x, position[3].x, position[0].y, position[1].y, position[3].y);
    drawSide(position[1].x, position[0].x, position[2].x, position[1].y, position[0].y, position[2].y);
    drawSide(position[2].x, position[3].x, position[1].x, position[2].y, position[3].y, position[1].y);
    drawSide(position[3].x, position[2].x, position[0].x, position[3].y, position[2].y, position[0].y);
    // ctx.lineTo(position[1].x, position[1].y);
    // ctx.lineTo(position[2].x, position[2].y);
    // ctx.lineTo(position[3].x, position[3].y);
    // ctx.lineTo(position[0].x, position[0].y);
    ctx.stroke();
    ctx.restore();
  }

  // 繪製外接矩形
  drawBound(ctx, bound) {
    let x1 = bound[0] * ctx.canvas.width; // x1
    let y1 = bound[1] * ctx.canvas.height; // y1
    let x2 = bound[2] * ctx.canvas.width; // x2
    let y2 = bound[3] * ctx.canvas.height; // y2
    ctx.beginPath();
    ctx.lineWidth = this.sourceWidth / 200;
    ctx.strokeStyle = "#00a7bd";
    ctx.rect(x1, y1, x2 - x1, y2 - y1);
    ctx.stroke();
  }

  // 繪製箭頭
  drawArrow(ctx) {
    const draw = (ctx, fromx, fromy, tox, toy) => {
      //variables to be used when creating the arrow
      let headlen = 20;
      let angle = Math.atan2(toy - fromy, tox - fromx);

      ctx.save();

      ctx.strokeStyle = "rgba(255,255,0,1.0)";
      ctx.fillStyle = "rgba(255,255,0,1.0)";
      ctx.lineJoin = "miter";
      ctx.lineCap = "round";
      //starting path of the arrow from the start square to the end square
      //and drawing the stroke
      ctx.beginPath();
      ctx.moveTo(fromx, fromy);
      ctx.lineTo(tox, toy);
      ctx.stroke();

      ctx.lineJoin = "butt";
      //starting a new path from the head of the arrow to one of the sides of
      //the point
      ctx.beginPath();
      ctx.moveTo(tox, toy);
      ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 5), toy - headlen * Math.sin(angle - Math.PI / 5));

      //path from the side point of the arrow, to the other side point
      ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 5), toy - headlen * Math.sin(angle + Math.PI / 5));

      //path from the side point back to the tip of the arrow, and then
      //again to the opposite side point
      ctx.lineTo(tox, toy);
      ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 5), toy - headlen * Math.sin(angle - Math.PI / 5));
      ctx.fill();

      //draws the paths created above
      ctx.stroke();
      ctx.restore();
    };

    draw(
      ctx,
      this.directionInfo.begin.x,
      this.directionInfo.begin.y,
      this.directionInfo.apex.x,
      this.directionInfo.apex.y
    );
  }

  drawRegion(ctx) {
    ctx.save();

    ctx.fillStyle = ctx.strokeStyle;

    ctx.beginPath();
    ctx.moveTo(this.pointInfo.baseRight.x, this.pointInfo.baseRight.y);
    ctx.lineTo(this.pointInfo.exRight.x, this.pointInfo.exRight.y);
    ctx.lineTo(this.pointInfo.exLeft.x, this.pointInfo.exLeft.y);
    ctx.lineTo(this.pointInfo.baseLeft.x, this.pointInfo.baseLeft.y);
    ctx.lineTo(this.pointInfo.baseRight.x, this.pointInfo.baseRight.y);

    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawImage(ctx, data, px, py, size, mirror) {
    let ratio = data.width / data.height, sizex, sizey;
    if (ratio > 1) {
      sizex = size * ratio;
      sizey = size;
    }
    else {
      sizex = size;
      sizey = size / ratio;
    }
    if (mirror == true) {
      ctx.save();
      ctx.translate(px, 0)
      ctx.scale(-1, 1);
      //ctx.drawImage(data, -size, py, size, size*ratio);
      try {
        ctx.drawImage(data, -sizex, py, sizex, sizey);
      }
      catch (e) {
        console.log(e.message);
      }
      ctx.restore();
    }
    else {
      //ctx.drawImage(data, px, py, size, size*ratio);
      try {
        ctx.drawImage(data, px, py, sizex, sizey);
      }
      catch (e) {
        console.log(e.message);
      }
    }
  }

  drawRotateImage(ctx, data, px, py, size, mirror, angle) {
    let ratio = data.width / data.height, sizex, sizey;
    if (ratio > 1) {
      sizex = size * ratio;
      sizey = size;
    }
    else {
      sizex = size;
      sizey = size / ratio;
    }
    let TO_RADIANS = Math.PI/180;
    ctx.save();
    if (mirror == true) {
      let angleRotate = angle == 180 ? 180 : parseInt((angle - 180 + 360) % 360);
      ctx.translate(px, py);
      ctx.scale(-1, 1);
      ctx.rotate(angleRotate * TO_RADIANS);
      //ctx.drawImage(data, -size, 0, size, size*ratio);
      try {
        ctx.drawImage(data, -sizex, 0, sizex, sizey);
      }
      catch (e) {
        console.log(e.message);
      }
    }
    else {
      ctx.translate(px, py);
      ctx.rotate(angle * TO_RADIANS);
      //ctx.translate(-(px - size/2), -(py - size/2));
      //ctx.drawImage(data, 0, 0, size, size*ratio);
      try {
        ctx.drawImage(data, 0, 0, sizex, sizey);
      }
      catch (e) {
        console.log(e.message);
      }
    }
    ctx.restore();
  }

  drawAvatar(data, position) {
    let scale = SettingData["FN_1"]["FN_6"]["size"]["value"];
    if (this.forceRedraw) {
      this.drawCtx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
      this.forceRedraw = false;
    }
    else if (!this.positionToClose) {
      this.drawCtx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
    }
    else {
      return;
    }
    const getCenterPoint = (x1, y1, x2, y2) => {
      return {
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2,
      };
    };

    // body.location[0] => leftTop
    // body.location[1] => rightTop
    // body.location[2] => rightBottom
    // body.location[3] => leftBottom

    // split coord ratio
    let ratio = 0.7;

    // 上側中點(箭頭出發起點)
    let begin = getCenterPoint(position[0].x, position[0].y, position[1].x, position[1].y);

    // 下側中點
    let stand = getCenterPoint(position[3].x, position[3].y, position[2].x, position[2].y);

    // 上側中點和下側中點的延伸點
    let exCenter = this.getSplitPoint(stand.x, stand.y, begin.x, begin.y, 1, ratio);

    // 左側延伸點
    let exLeft = this.getSplitPoint(position[3].x, position[3].y, position[0].x, position[0].y, 1, ratio);

    // 右側延伸點
    let exRight = this.getSplitPoint(position[2].x, position[2].y, position[1].x, position[1].y, 1, ratio);

    // 上側中點和下側中點的中點
    let the_center = getCenterPoint(begin.x, begin.y, stand.x, stand.y);

    let center1 = getCenterPoint(begin.x, begin.y, the_center.x, the_center.y);
    let center = getCenterPoint(begin.x, begin.y, center1.x, center1.y);

    //let cx = parseInt((position[0].x + position[1].x + position[2].x + position[3].x) / 4),
    //    cy = parseInt((position[0].y + position[1].y + position[2].y + position[3].y) / 4);
    let length = Math.hypot( position[0].x - position[1].x, position[0].y - position[1].y);
    let size = length * parseFloat(scale) / 10, sizex, sizey;
    let w2h = data.width / data.height;
    if (w2h > 1) {
      sizex = size * w2h;
      sizey = size;
    }
    else {
      sizex = size;
      sizey = size / w2h;
    }
    //console.log(this.QRCodeToward);
    //console.log(this.pointInfo.exCenter.x + ", " + this.pointInfo.exCenter.y);
    if (this.QRCodeToward === "top") {
      if (this.drawCanvas.dataset.mirror == "") {
        //this.drawImage(this.drawCtx, data[2], cx - 120, cy - 500, size);
        if (this.transferInfo.rotate == 0)
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - size/2), parseInt(exCenter.y - size - 20), size, false);
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - sizex/2), parseInt(exCenter.y - sizey - 40), size, false);
          this.drawImage(this.drawCtx, data, parseInt(center.x - sizex/2), parseInt(center.y - sizey - 40), size, false);
        else if (this.transferInfo.rotate == 90)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - size - 30), parseInt(exCenter.y + size/2), size, false, 270);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - sizey - 30), parseInt(exCenter.y + sizex/2), size, false, 270);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x - sizey - 30), parseInt(center.y + sizex/2), size, false, 270);
        else if (this.transferInfo.rotate == 180)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - size/2 + size), parseInt(exCenter.y + size), size, false, 180);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + sizex/2), parseInt(exCenter.y + sizey + 20), size, false, 180);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + sizex/2), parseInt(center.y + sizey + 20), size, false, 180);
        else if (this.transferInfo.rotate == 270)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + size + 30), parseInt(exCenter.y - size/2), size, false, 90);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + sizey + 30), parseInt(exCenter.y - sizex/2), size, false, 90);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + sizey + 30), parseInt(center.y - sizex/2), size, false, 90);
      }
      else {  // mirror
        if (this.transferInfo.rotate == 0)
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - size/2), parseInt(exCenter.y - size - 20), size, true);
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - sizex/2), parseInt(exCenter.y - sizey - 40), size, true);
          this.drawImage(this.drawCtx, data, parseInt(center.x - sizex/2), parseInt(center.y - sizey - 40), size, true);
        else if (this.transferInfo.rotate == 90)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + size + 30), parseInt(exCenter.y - size/2), size, true, 90);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + sizey + 30), parseInt(exCenter.y - sizex/2), size, true, 90);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + sizey + 30), parseInt(center.y - sizex/2), size, true, 90);
        else if (this.transferInfo.rotate == 180)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - size/2 + size), parseInt(exCenter.y + size), size, true, 180);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + sizex/2), parseInt(exCenter.y + sizey + 20), size, true, 180);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + sizex/2), parseInt(center.y + sizey + 20), size, true, 180);
        else if (this.transferInfo.rotate == 270)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - size - 20), parseInt(exCenter.y + size/2), size, true, 270);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - sizey - 20), parseInt(exCenter.y + sizex/2), size, true, 270);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x - sizey - 20), parseInt(center.y + sizex/2), size, true, 270);
      }
    }
    else if (this.QRCodeToward === "leftTop") {
      //this.drawImage(this.drawCtx, data, cx - 320, cy - 480, size);
      if (this.drawCanvas.dataset.mirror == "") {
        if (this.transferInfo.rotate == 0)
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - size), parseInt(exCenter.y - size), size, false);
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - sizex), parseInt(exCenter.y - sizey), size, false);
          this.drawImage(this.drawCtx, data, parseInt(center.x - sizex), parseInt(center.y - sizey), size, false);
        else if (this.transferInfo.rotate == 90)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - size), parseInt(exCenter.y + size), size, false, 270);
          this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - sizey), parseInt(exCenter.y + sizex), size, false, 270);
          //this.drawRotateImage(this.drawCtx, data, parseInt(center.x - sizey), parseInt(center.y + sizex), size, false, 270);
        else if (this.transferInfo.rotate == 180)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + size), parseInt(exCenter.y + size), size, false, 180);
          this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + sizex), parseInt(exCenter.y + sizey), size, false, 180);
          //this.drawRotateImage(this.drawCtx, data, parseInt(center.x + sizex), parseInt(center.y + sizey), size, false, 180);
        else if (this.transferInfo.rotate == 270)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + size + 20), parseInt(exCenter.y - size), size, false, 90);
          this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + sizey + 20), parseInt(exCenter.y - sizex), size, false, 90);
          //this.drawRotateImage(this.drawCtx, data, parseInt(center.x + sizey), parseInt(center.y - sizex), size, false, 90);
      }
      else {  // mirror
        if (this.transferInfo.rotate == 0)
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x + 20), parseInt(exCenter.y - size), size, true);
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x + 20), parseInt(exCenter.y - sizey), size, true);
          this.drawImage(this.drawCtx, data, parseInt(center.x + 20), parseInt(center.y - sizey), size, true);
        else if (this.transferInfo.rotate == 90)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + size), parseInt(exCenter.y), size, true, 90);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + sizey), parseInt(exCenter.y), size, true, 90);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + sizey), parseInt(center.y), size, true, 90);
        else if (this.transferInfo.rotate == 180)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y + size), size, true, 180);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y + sizey), size, true, 180);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x), parseInt(center.y + sizey), size, true, 180);
        else if (this.transferInfo.rotate == 270)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - size), parseInt(exCenter.y), size, true, 270);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - sizey), parseInt(exCenter.y), size, true, 270);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x - sizey), parseInt(center.y), size, true, 270);
      }
    }
    else if (this.QRCodeToward === "rightTop") {
      //this.drawImage(this.drawCtx, data[3], cx + 100, cy - 450, size);
      if (this.drawCanvas.dataset.mirror == "") {
        if (this.transferInfo.rotate == 0)
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x + 20), parseInt(exCenter.y - size), size, true);
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x + 20), parseInt(exCenter.y - sizey), size, true);
          this.drawImage(this.drawCtx, data, parseInt(center.x + 20), parseInt(center.y - sizey), size, true);
        else if (this.transferInfo.rotate == 90)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - size), parseInt(exCenter.y), size, true, 270);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - sizey), parseInt(exCenter.y), size, true, 270);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x - sizey), parseInt(center.y), size, true, 270);
        else if (this.transferInfo.rotate == 180)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y + size), size, true, 180);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y + sizey), size, true, 180);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x), parseInt(center.y + sizey), size, true, 180);
        else if (this.transferInfo.rotate == 270)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + size), parseInt(exCenter.y), size, true, 90);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + sizey), parseInt(exCenter.y), size, true, 90);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + sizey), parseInt(center.y), size, true, 90);
      }
      else { // mirror
        if (this.transferInfo.rotate == 0)
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - size), parseInt(exCenter.y - size), size, false);
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - sizex), parseInt(exCenter.y - sizey), size, false);
          this.drawImage(this.drawCtx, data, parseInt(center.x - sizex), parseInt(center.y - sizey), size, false);
        else if (this.transferInfo.rotate == 90)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + size), parseInt(exCenter.y - size), size, false, 90);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + sizey), parseInt(exCenter.y - sizex), size, false, 90);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + sizey), parseInt(center.y - sizex), size, false, 90);
        else if (this.transferInfo.rotate == 180)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + size), parseInt(exCenter.y + size), size, false, 180);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + sizex), parseInt(exCenter.y + sizey), size, false, 180);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + sizex), parseInt(center.y + sizey), size, false, 180);
        else if (this.transferInfo.rotate == 270)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - size - 20), parseInt(exCenter.y + size), size, false, 270);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - sizey - 20), parseInt(exCenter.y + sizex), size, false, 270);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x - sizey - 20), parseInt(center.y + sizex), size, false, 270);
      }
    }
    else if (this.QRCodeToward === "bottom") {
      if (this.drawCanvas.dataset.mirror == "") {
        //this.drawImage(this.drawCtx, data[2], cx - 140, cy + 260, size);
        if (this.transferInfo.rotate == 0)
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - size/2), parseInt(exCenter.y + 20), size, false);
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - sizex/2), parseInt(exCenter.y + 20), size, false);
          this.drawImage(this.drawCtx, data, parseInt(center.x - sizex/2), parseInt(center.y + 20), size, false);
        else if (this.transferInfo.rotate == 90)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + 20), parseInt(exCenter.y + size/2), size, false, 270);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + 20), parseInt(exCenter.y + sizex/2), size, false, 270);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + 20), parseInt(center.y + sizex/2), size, false, 270);
        else if (this.transferInfo.rotate == 180)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + size/2), parseInt(exCenter.y), size, false, 180);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + sizex/2), parseInt(exCenter.y - 30), size, false, 180);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + sizex/2), parseInt(center.y - 30), size, false, 180);
        else if (this.transferInfo.rotate == 270)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y - size/2), size, false, 90);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - 30), parseInt(exCenter.y - sizex/2), size, false, 90);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x - 30), parseInt(center.y - sizex/2), size, false, 90);
      }
      else { // mirror
        if (this.transferInfo.rotate == 0)
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - size/2), parseInt(exCenter.y), size, true);
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - sizex/2), parseInt(exCenter.y + 20), size, true);
          this.drawImage(this.drawCtx, data, parseInt(center.x - sizex/2), parseInt(center.y + 20), size, true);
        else if (this.transferInfo.rotate == 90)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y - size/2), size, true, 90);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - 20), parseInt(exCenter.y - sizex/2), size, true, 90);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x - 20), parseInt(center.y - sizex/2), size, true, 90);
        else if (this.transferInfo.rotate == 180)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - size/2 + size), parseInt(exCenter.y), size, true, 180);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - sizex/2 + sizex), parseInt(exCenter.y - 30), size, true, 180);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x - sizex/2 + sizex), parseInt(center.y - 30), size, true, 180);
        else if (this.transferInfo.rotate == 270)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y + size/2), size, true, 270);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + 30), parseInt(exCenter.y + sizex/2), size, true, 270);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + 30), parseInt(center.y + sizex/2), size, true, 270);
      }
    }
    else if (this.QRCodeToward === "leftBottom") {
      //this.drawImage(this.drawCtx, data[2], cx - 260, cy + 200, size);
      if (this.drawCanvas.dataset.mirror == "") {
        if (this.transferInfo.rotate == 0)
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - size), parseInt(exCenter.y), size, false);
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - sizex), parseInt(exCenter.y), size, false);
          this.drawImage(this.drawCtx, data, parseInt(center.x - sizex), parseInt(center.y), size, false);
        else if (this.transferInfo.rotate == 90)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y + size), size, false, 270);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y + sizex), size, false, 270);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x), parseInt(center.y + sizex), size, false, 270);
        else if (this.transferInfo.rotate == 180)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + size), parseInt(exCenter.y), size, false, 180);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + sizex), parseInt(exCenter.y), size, false, 180);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + sizex), parseInt(center.y), size, false, 180);
        else if (this.transferInfo.rotate == 270)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y - size), size, false, 90);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y - sizex), size, false, 90);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x), parseInt(center.y - sizex), size, false, 90);
      }
      else { // mirror
        if (this.transferInfo.rotate == 0)
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y), size, true);
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y), size, true);
          this.drawImage(this.drawCtx, data, parseInt(center.x), parseInt(center.y), size, true);
        else if (this.transferInfo.rotate == 90)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y), size, true, 90);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y), size, true, 90);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x), parseInt(center.y), size, true, 90);
        else if (this.transferInfo.rotate == 180)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + 20), parseInt(exCenter.y), size, true, 180);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + 20), parseInt(exCenter.y), size, true, 180);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + 20), parseInt(center.y), size, true, 180);
        else if (this.transferInfo.rotate == 270)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y), size, true, 270);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y), size, true, 270);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x), parseInt(center.y), size, true, 270);
      }
    }
    else if (this.QRCodeToward === "rightBottom") {
      //this.drawImage(this.drawCtx, data[3], cx + 100, cy + 160, size);
      if (this.drawCanvas.dataset.mirror == "") {
        if (this.transferInfo.rotate == 0)
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y), size, true);
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y), size, true);
          this.drawImage(this.drawCtx, data, parseInt(center.x), parseInt(center.y), size, true);
        else if (this.transferInfo.rotate == 90)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - 20), parseInt(exCenter.y - 20), size, true, 270);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - 20), parseInt(exCenter.y - 20), size, true, 270);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x - 20), parseInt(center.y - 20), size, true, 270);
        else if (this.transferInfo.rotate == 180)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + 20), parseInt(exCenter.y + 20), size, true, 180);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - 20), parseInt(exCenter.y - 20), size, true, 180);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x - 20), parseInt(center.y - 20), size, true, 180);
        else if (this.transferInfo.rotate == 270)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y), size, true, 90);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y), size, true, 90);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x), parseInt(center.y), size, true, 90);
      }
      else { // mirror
        if (this.transferInfo.rotate == 0)
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - size), parseInt(exCenter.y), size, false);
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - sizex), parseInt(exCenter.y), size, false);
          this.drawImage(this.drawCtx, data, parseInt(center.x - sizex), parseInt(center.y), size, false);
        else if (this.transferInfo.rotate == 90)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y - size + 20), size, false, 90);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - 20), parseInt(exCenter.y - sizex), size, false, 90);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x - 20), parseInt(center.y - sizex), size, false, 90);
        else if (this.transferInfo.rotate == 180)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + size), parseInt(exCenter.y), size, false, 180);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + sizex - 20), parseInt(exCenter.y - 20), size, false, 180);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + sizex - 20), parseInt(center.y - 20), size, false, 180);
        else if (this.transferInfo.rotate == 270)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y + size), size, false, 270);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x), parseInt(exCenter.y + sizex), size, false, 270);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x), parseInt(center.y + sizex), size, false, 270);
      }
    }
    else if (this.QRCodeToward === "left") {
      //this.drawImage(this.drawCtx, data[2], cx - 530, cy - 120, size);
      if (this.drawCanvas.dataset.mirror == "") {
        if (this.transferInfo.rotate == 0)
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - size - 20), parseInt(exCenter.y - size/2), size, false);
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - sizex - 20), parseInt(exCenter.y - sizey/2), size, false);
          this.drawImage(this.drawCtx, data, parseInt(center.x - sizex - 20), parseInt(center.y - sizey/2), size, false);
        else if (this.transferInfo.rotate == 90)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - size/2), parseInt(exCenter.y + size + 20), size, false, 270);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - sizey/2), parseInt(exCenter.y + sizex + 20), size, false, 270);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x - sizey/2), parseInt(center.y + sizex + 20), size, false, 270);
        else if (this.transferInfo.rotate == 180)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + size + 50), parseInt(exCenter.y + size/2), size, false, 180);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + sizex + 50), parseInt(exCenter.y + sizey/2), size, false, 180);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + sizex + 50), parseInt(center.y + sizey/2), size, false, 180);
        else if (this.transferInfo.rotate == 270)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + size/2), parseInt(exCenter.y - size - 20), size, false, 90);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + sizey/2), parseInt(exCenter.y - sizex - 20), size, false, 90);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + sizey/2), parseInt(center.y - sizex - 20), size, false, 90);
      }
      else {  // mirror
        if (this.transferInfo.rotate == 0)
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x + 30), parseInt(exCenter.y - size/2), size, true);
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x + 30), parseInt(exCenter.y - sizey/2), size, true);
          this.drawImage(this.drawCtx, data, parseInt(center.x + 30), parseInt(center.y - sizey/2), size, true);
        else if (this.transferInfo.rotate == 90)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + size/2), parseInt(exCenter.y + 20), size, true, 90);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + sizey/2), parseInt(exCenter.y + 20), size, true, 90);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + sizey/2), parseInt(center.y + 20), size, true, 90);
        else if (this.transferInfo.rotate == 180)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - 20), parseInt(exCenter.y + size/2), size, true, 180);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - 20), parseInt(exCenter.y + sizey/2), size, true, 180);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x - 20), parseInt(center.y + sizey/2), size, true, 180);
        else if (this.transferInfo.rotate == 270)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - size/2), parseInt(exCenter.y - 20), size, true, 270);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - sizey/2), parseInt(exCenter.y - 20), size, true, 270);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x - sizey/2), parseInt(center.y - 20), size, true, 270);
      }
    }
    else if (this.QRCodeToward === "right") {
      //this.drawImage(this.drawCtx, data[3], cx + 290, cy - 120, size);
      if (this.drawCanvas.dataset.mirror == "") {
        if (this.transferInfo.rotate == 0)
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x + 30), parseInt(exCenter.y - size/2), size, true);
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x + 30), parseInt(exCenter.y - sizey/2), size, true);
          this.drawImage(this.drawCtx, data, parseInt(center.x + 30), parseInt(center.y - sizey/2), size, true);
        else if (this.transferInfo.rotate == 90)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - size/2), parseInt(exCenter.y - 20), size, true, 270);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - sizey/2), parseInt(exCenter.y - 20), size, true, 270);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x - sizey/2), parseInt(center.y - 20), size, true, 270);
        else if (this.transferInfo.rotate == 180)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - 20), parseInt(exCenter.y + size/2), size, true, 180);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - 20), parseInt(exCenter.y + sizey/2), size, true, 180);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x - 20), parseInt(center.y + sizey/2), size, true, 180);
        else if (this.transferInfo.rotate == 270)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + size/2), parseInt(exCenter.y + 20), size, true, 90);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + sizey/2), parseInt(exCenter.y + 20), size, true, 90);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + sizey/2), parseInt(center.y + 20), size, true, 90);
      }
      else {  // mirror
        if (this.transferInfo.rotate == 0)
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - size - 20), parseInt(exCenter.y - size/2), size, false);
          //this.drawImage(this.drawCtx, data, parseInt(exCenter.x - sizex - 20), parseInt(exCenter.y - sizey/2), size, false);
          this.drawImage(this.drawCtx, data, parseInt(center.x - sizex - 20), parseInt(center.y - sizey/2), size, false);
        else if (this.transferInfo.rotate == 90)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + size/2), parseInt(exCenter.y - size), size, false, 90);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + sizey/2), parseInt(exCenter.y - sizex - 30), size, false, 90);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + sizey/2), parseInt(center.y - sizex - 30), size, false, 90);
        else if (this.transferInfo.rotate == 180)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + size + 50), parseInt(exCenter.y + size/2), size, false, 180);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x + sizex + 50), parseInt(exCenter.y + sizey/2), size, false, 180);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x + sizex + 50), parseInt(center.y + sizey/2), size, false, 180);
        else if (this.transferInfo.rotate == 270)
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - size/2), parseInt(exCenter.y + size), size, false, 270);
          //this.drawRotateImage(this.drawCtx, data, parseInt(exCenter.x - sizey/2), parseInt(exCenter.y + sizex + 20), size, false, 270);
          this.drawRotateImage(this.drawCtx, data, parseInt(center.x - sizey/2), parseInt(center.y + sizex + 20), size, false, 270);
      }
    }
  }

  drawResult(data, ActionLabel) {
    this.LastActionLabel = ActionLabel;
    if (!this.positionToClose) {
      this.drawCtx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
      if (ActionLabel != "Avatar")
        this.drawRect(this.drawCtx, data.position);
    }
    // this.drawBound(this.drawCtx, body.bound);
    // this.drawRegion(this.drawCtx);
    // this.drawArrow(this.drawCtx);
  }
  
  setCalcSize(width, height) {
    this.calcWidth = width;
    this.calcHeight = height;
  }

  /**
   * 
   * @param {QRCodeResult.Info} data 
   */
  handleInfoPoint(data) {
    this.handlePositionToClose(data.position);
    // QRCode 位置移動後才重新計算座標資訊
    if (!this.positionToClose) {
      this.handleQRCodeToward(data.rotation); // 計算 QRCode 的指向方向
      this.handlePointInfo(data.position); // 顯示箭頭相關圖形需要的座標，現在用不到
      this.handleDirectionInfo(); // 設定箭頭座標，現在用不到
    }
  }

  /**
   * 顯示箭頭相關圖形需要的座標
   * @param {QRCodeResult.Position[]} position 
   */
  handlePointInfo(position) {
    const getCenterPoint = (x1, y1, x2, y2) => {
      return {
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2,
      };
    };

    // body.location[0] => leftTop
    // body.location[1] => rightTop
    // body.location[2] => rightBottom
    // body.location[3] => leftBottom

    // split coord ratio
    let ratio = 0.7;

    // 上側中點(箭頭出發起點)
    let begin = getCenterPoint(position[0].x, position[0].y, position[1].x, position[1].y);

    // 下側中點
    let stand = getCenterPoint(position[3].x, position[3].y, position[2].x, position[2].y);

    // 上側中點和下側中點的延伸點
    let exCenter = this.getSplitPoint(stand.x, stand.y, begin.x, begin.y, 1, ratio);

    // 左側延伸點
    let exLeft = this.getSplitPoint(position[3].x, position[3].y, position[0].x, position[0].y, 1, ratio);

    // 右側延伸點
    let exRight = this.getSplitPoint(position[2].x, position[2].y, position[1].x, position[1].y, 1, ratio);

    this.pointInfo.arrowBegin = begin;
    this.pointInfo.baseCenter = begin;
    this.pointInfo.baseRight = position[1];
    this.pointInfo.baseLeft = position[0];

    this.pointInfo.exCenter = exCenter;
    this.pointInfo.exLeft = exLeft;
    this.pointInfo.exRight = exRight;
  }
  /**
   * 根據方向設定座標
   */
  handleDirectionInfo() {
    if (
      this.QRCodeToward === "top" ||
      this.QRCodeToward === "bottom" ||
      this.QRCodeToward === "left" ||
      this.QRCodeToward === "right"
    ) {
      this.directionInfo.begin = this.pointInfo.arrowBegin;
      this.directionInfo.apex = this.pointInfo.exCenter;
    }
    if (this.QRCodeToward === "leftTop" || this.QRCodeToward === "rightBottom") {
      this.directionInfo.begin = this.pointInfo.arrowBegin;
      this.directionInfo.apex = this.pointInfo.exRight;
    }
    if (this.QRCodeToward === "rightTop" || this.QRCodeToward === "leftBottom") {
      this.directionInfo.begin = this.pointInfo.arrowBegin;
      this.directionInfo.apex = this.pointInfo.exLeft;
    }

    this.directionInfo.length = Math.sqrt(
      Math.pow(this.directionInfo.apex.x - this.directionInfo.begin.x, 2) +
        Math.pow(this.directionInfo.apex.y - this.directionInfo.begin.y, 2)
    );
  }
  // 取得分點座標
  getSplitPoint(x1, y1, x2, y2, m, n) {
    let total = m + n;
    return {
      x: (total * x2 - n * x1) / (total - n),
      y: (total * y2 - n * y1) / (total - n),
    };
  }
  // 取得延伸座標
  getPointExtend(x1, y1, length, angle) {
    angle = ((angle - 90) * Math.PI) / 180;
    let x2 = x1 + length * Math.cos(angle);
    let y2 = y1 + length * Math.sin(angle);
    return { x: x2, y: y2 };
  }
  // 沒有用到
  getBeginOnBound(QRCodeToward, x1, y1, x2, y2) {
    let offset = 15;
    let begin = {
      x: 0,
      y: 0,
      deg: 0,
    };
    if (QRCodeToward === "top") {
      begin.x = (x2 - x1) / 2 + x1;
      begin.y = y1 - offset;
      begin.deg = 0;
    }
    if (QRCodeToward === "bottom") {
      begin.x = (x2 - x1) / 2 + x1;
      begin.y = y2 + offset;
      begin.deg = 180;
    }
    if (QRCodeToward === "left") {
      begin.x = x1 - offset;
      begin.y = (y2 - y1) / 2 + y1;
      begin.deg = -90;
    }
    if (QRCodeToward === "right") {
      begin.x = x2 + offset;
      begin.y = (y2 - y1) / 2 + y1;
      begin.deg = 90;
    }
    if (QRCodeToward === "rightTop") {
      begin.x = x2 + offset;
      begin.y = y1 - offset;
      begin.deg = 45;
    }
    if (QRCodeToward === "rightBottom") {
      begin.x = x2 + offset;
      begin.y = y2 + offset;
      begin.deg = 135;
    }
    if (QRCodeToward === "leftBottom") {
      begin.x = x1 - offset;
      begin.y = y2 + offset;
      begin.deg = -135;
    }
    if (QRCodeToward === "leftTop") {
      begin.x = x1 - offset;
      begin.y = y1 - offset;
      begin.deg = -45;
    }
    return begin;
  }
  // 計算 QRCode 的指向方向
  handleQRCodeToward(rotate) {
    let rotation = Math.abs(rotate);
    let QRCodeToward = "top";
    // top,bottom,left,right
    // rightTop,rightBottom,leftTop,leftBottom
    if (rotation <= 20) {
      // 0 - 20
      QRCodeToward = "top";
    }
    if (rotation > 20 && rotation < 75) {
      // 21 - 74
      if (rotate > 0) {
        QRCodeToward = "rightTop";
      } else {
        QRCodeToward = "leftTop";
      }
    }
    if (rotation >= 75 && rotation <= 105) {
      // 75 - 105
      if (rotate > 0) {
        QRCodeToward = "right";
      } else {
        QRCodeToward = "left";
      }
    }
    if (rotation > 105 && rotation < 160) {
      // 106 - 159
      if (rotate > 0) {
        QRCodeToward = "rightBottom";
      } else {
        QRCodeToward = "leftBottom";
      }
    }
    if (rotation >= 160) {
      // 160 - 180
      QRCodeToward = "bottom";
    }
    this.QRCodeToward = QRCodeToward;
  }
  // 計算是否有連續辨識成功 QRCode 的位置
  setContinuous(FnLabel) {
    this.FnInfo.list.push(FnLabel);
    if (this.FnInfo.list.length > 10) {
      this.FnInfo.list.shift();
      let successTotal = this.FnInfo.list.reduce((prevVal, nowVal) => {
        if (nowVal) prevVal++;
        return prevVal;
      }, 0);
      if (successTotal / this.FnInfo.list.length >= 0.7) {
        this.FnInfo.continuous = true;
      } else {
        this.FnInfo.continuous = false;
      }
    }
  }
  // 辨識 QRCode 的位置是否太相近
  handlePositionToClose(nowPosition) {
    if (!this.prevPosition) {
      this.prevPosition = [...nowPosition];
      this.positionToClose = false;
      return true;
    }

    let xPointGap = Math.abs(this.prevPosition[0].x - nowPosition[0].x);
    let yPointGap = Math.abs(this.prevPosition[0].y - nowPosition[0].y);

    this.prevPosition = [...nowPosition];

    if (xPointGap > 2 || yPointGap > 2) {
      this.positionToClose = false;
    } else {
      this.positionToClose = true;
    }
  }
  // 設定需要被輸送到 WebWorker 的資料，wRatio，hRatio 已經用不到
  setTransfer(rotate, wRatio, hRatio, mirror) {
    this.transferInfo = {
      rotate: rotate,
      wRatio: wRatio,
      hRatio: hRatio,
      mirror: mirror,
    };
  }
  // 傳輸資料到 WebWorker 做辨識
  postImageBitmap() {
    let imageScale = 1;
    // 再 createImageBitmap 時縮小使用的參數
    if (this.sourceWidth > 1440) {
      imageScale = 1440 / this.sourceWidth;
    }
    // 要傳輸的資料
    this.postData = {
      type: "data",
      imageData: null,
      scaleRatio: imageScale,
      cropRegion: { // 用不到
        x: 0,
        y: 0,
      },
      cropBegin: { // 用不到
        x: 0,
        y: 0,
      },
      sourceInfo: {
        width: this.sourceWidth,
        height: this.sourceHeight,
      },
      scanInfo: {
        width: null,
        height: null,
        colorSpace: "srgb",
      },
      transferInfo: this.transferInfo,
    };

    createImageBitmap(this.videoSource, {
      resizeWidth: this.sourceWidth * imageScale,
      resizeHeight: this.sourceHeight * imageScale,
      resizeQuality: "high",
    })
      .then((imageBitmap) => {
        this.postData["imageData"] = imageBitmap;
        this.postData["scanInfo"]["width"] = imageBitmap.width;
        this.postData["scanInfo"]["height"] = imageBitmap.height;
        this.qrCodeWorker.postMessage(this.postData, [imageBitmap]);
        imageBitmap.close();
      })
      .catch(() => {
        setTimeout(() => {
          this.postImageBitmap();
        }, 100);
      });
  }
  // 從 webworker 來的資料
  init() {
    this.qrCodeWorker.onmessage = (event) => {
      const body = event.data;

      if (body.type === "ready" && this.process) {
        this.prevPosition = null;
        this.postImageBitmap();
      }

      if (body.type === "result" && this.process) {
        this.processIng = true;
        if (body.success) {
          this.dispatchResult(body);
        }
        if (!body.success) {
          this.dispatchResult(body);
        }
      }

      if (body.type === "result" && !this.process) {
        this.processIng = false;
        this.dispatchStop(true);
      }

      if (body.type === "frequency") {
        this.isSlowModel = body.isSlowModel;
        if (this.isSlowModel) {
          this.clearPreview();
        }
      }

      if (body.type === "preview") {
        tempCanvas.width = body.data.width;
        tempCanvas.height = body.data.height;
        tempCanvas.getContext("2d").putImageData(body.data, 0, 0);
      }
    };
  }
  // EventTarget dispatchEvent "result"
  dispatchResult(resultBody) {
    this.listener.dispatchEvent(
      new CustomEvent("result", {
        detail: {
          body: resultBody,
        },
      })
    );
  }
  // EventTarget dispatchEvent "isStop"
  dispatchStop(isStop) {
    this.listener.dispatchEvent(
      new CustomEvent("isStop", {
        detail: {
          body: {
            isStop: isStop,
          },
        },
      })
    );
  }
  /**
   * callback 取識別結果
   * @param {Function} callback 
   */
  onResult(callback) {
    this.listener.addEventListener("result", (event) => {
      const result = event.detail.body;
      /** @type {Result} */
      callback(result);
    });
  }
  // 當辨識停止時 Callback 監聽來自 listener(EventTarget物件) dispatchEvent
  onStop(callback) {
    this.listener.addEventListener("isStop", (event) => {
      const result = event.detail.body;
      callback(result);
    });
  }
  // 清除舊有座標資訊
  clearPreview() {
    if (this.LastActionLabel != "Avatar")
      this.drawCtx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
    this.prevPosition = null;
  }
  // 開始識別
  start() {
    this.process = true;
    this.qrCodeWorker.postMessage({ type: "init" });
  }
  // 停止識別
  stop() {
    this.process = false;
    this.drawCtx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
  }
}

export default QRCodeDetect;

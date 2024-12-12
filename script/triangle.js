import { toCartographic, toDegreesArray, addPoint } from "./utils.js";

export default class MeasureTriangle {
  constructor(viewer) {
    this.viewer = viewer;
    this.initEvents();
    this.positions = [];
    this.temPositions = [];
    this.measureHeight = 0;
    this.measureStraitLine = 0;
    this.measureHorizontalLine = 0;
    this.measureStraitLineLable = undefined;
    this.measureHeightLable = undefined;
    this.measureHorizontalLineLable = undefined;
    this.vertexPoints = [];
    this.entities = [];

    // Collections
    this.collection = new Cesium.PrimitiveCollection();
    this.billboardCollection = new Cesium.BillboardCollection();
    this.lableCollection = new Cesium.LabelCollection();
    this.pointCollection = new Cesium.PointPrimitiveCollection();

    this.collection.add(this.billboardCollection);
    this.collection.add(this.lableCollection);
    this.collection.add(this.pointCollection);
    this.viewer.scene.primitives.add(this.collection);
  }

  initEvents() {
    this.destroyHandler();
    this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);
    this.measureStartEvent = new Cesium.Event();
    this.measureEndEvent = new Cesium.Event();
  }

  leftClickEvent() {
    let that = this;
    this.handler.setInputAction((e) => {
      that.viewer._element.style.cursor = "pointer";
      let position = that.viewer.scene.pickPosition(e.position);
      if (!position) {
        position = that.viewer.scene.camera.pickEllipsoid(
          e.position,
          that.viewer.scene.globe.ellipsoid
        );
      }
      if (!position) return;

      that.positions.push(position);
      if (that.positions.length === 1) {
        that.creatStartPoint(position);
        that.createRightAnglePoints();
        that.createEndPoints();
        that.createHeightEntity();
        that.createTemMeasureLabels();
        return;
      }

      // Second point finishes the shape
      const rightpos = that.getRightAnglePos(that.positions[0], position);
      const poss = that.positions.concat([rightpos, that.positions[0]]);

      that.polyline.polyline = {
        positions: poss,
        width: 2,
        material: Cesium.Color.GREEN,
        depthFailMaterial: Cesium.Color.GREEN,
      };

      that.endBillboard.position = position;
      that.rightAnglePoint.position = rightpos;
      that.createEndMeasureLabels(poss);

      that.measureEnd();
      that.activate();
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  moveEvent() {
    this.handler.setInputAction((e) => {
      if (!this.isMeasure) return;
      this.viewer._element.style.cursor = "default";
      let position = this.viewer.scene.pickPosition(e.endPosition);
      if (!position) {
        position = this.viewer.scene.camera.pickEllipsoid(
          e.endPosition,
          this.viewer.scene.globe.ellipsoid
        );
      }
      if (!position) return;
      if (this.positions.length < 1) return;
      const rightpos = this.getRightAnglePos(this.positions[0], position);
      this.temPositions = this.positions.concat([
        position,
        rightpos,
        this.positions[0],
      ]);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  rightClickEvent() {
    this.handler.setInputAction((e) => {
      if (!this.isMeasure || this.positions.length < 1) {
        this.deactivate();
      } else {
        this.measureEnd();
        this.viewer.entities.clearAll();
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }

  measureEnd() {
    this.deactivate();
  }

  createHeightEntity() {
    this.polyline = this.viewer.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          return this.temPositions;
        }, false),
        width: 3,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.GREEN,
        }),
        depthFailMaterial: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.GREEN,
        }),
      },
    });
    this.entities.push(this.polyline);
  }

  creatStartPoint(position) {
    const cartographic = toCartographic(position);
    const [longitude, latitude] = toDegreesArray(cartographic);

    // Add a billboard for the start point
    const startBillboard = this.billboardCollection.add({
      position: Cesium.Cartesian3.fromDegrees(
        longitude,
        latitude,
        cartographic.height
      ),
      image: "./img/start.png",
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      eyeOffset: new Cesium.Cartesian3(0, 0, 5),
    });
    this.vertexPoints.push(startBillboard);

    // Add a point using utils
    const startPoint = addPoint(
      this.viewer,
      Cesium.Cartesian3.fromDegrees(
        longitude,
        latitude,
        cartographic.height + 0.5
      ),
      Cesium.Color.RED,
      5
    );
    this.entities.push(startPoint);
    this.vertexPoints.push(startPoint);
  }

  createVertexPoints(position) {
    const cartographic = toCartographic(position);
    const [longitude, latitude] = toDegreesArray(cartographic);

    const vertexPoint = addPoint(
      this.viewer,
      Cesium.Cartesian3.fromDegrees(
        longitude,
        latitude,
        cartographic.height + 0.5
      ),
      Cesium.Color.RED,
      5
    );
    this.entities.push(vertexPoint);
    return vertexPoint;
  }

  createEndPoints() {
    this.endBillboard = this.viewer.entities.add({
      position: new Cesium.CallbackProperty(() => {
        if (this.temPositions && this.temPositions[1]) {
          return this.temPositions[1];
        }
      }, false),
      billboard: {
        image: "./img/end.png",
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        eyeOffset: new Cesium.Cartesian3(0, 0, 3),
      },
      point: {
        color: Cesium.Color.RED,
        pixelSize: 5,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
      },
    });
    this.entities.push(this.endBillboard);
  }

  getRightAnglePos(start, end) {
    const wgsStart = this.getPositionDegrees(start);
    const wgsEnd = this.getPositionDegrees(end);
    return Cesium.Cartesian3.fromDegrees(
      wgsEnd.lng,
      wgsEnd.lat,
      wgsStart.height + 0.5
    );
  }

  createRightAnglePoints() {
    const wgsStart = this.getPositionDegrees(this.positions[0]);
    this.rightAnglePoint = this.viewer.entities.add({
      position: new Cesium.CallbackProperty(() => {
        if (this.temPositions[1]) {
          const wgsEnd = this.getPositionDegrees(this.temPositions[1]);
          return Cesium.Cartesian3.fromDegrees(
            wgsEnd.lng,
            wgsEnd.lat,
            wgsStart.height + 0.5
          );
        }
      }, false),
      point: {
        color: Cesium.Color.RED,
        pixelSize: 5,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
      },
    });
    this.entities.push(this.rightAnglePoint);
  }

  createTemMeasureLabels() {
    let that = this;

    // Straight line label
    this.measureStraitLineLable = this.viewer.entities.add({
      position: new Cesium.CallbackProperty(() => {
        if (that.temPositions.length > 1) {
          return that.getLabelPosition(
            that.temPositions[0],
            that.temPositions[1]
          );
        }
      }),
      label: {
        text: new Cesium.CallbackProperty(() => {
          if (that.temPositions.length > 1) {
            return (
              "直线:" +
              that.getLengthText(that.temPositions[0], that.temPositions[1])
            );
          }
        }),
        font: "normal 13px Microsoft YaHei",
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(20, 0),
        outlineWidth: 9,
        outlineColor: Cesium.Color.GOLD,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    // Vertical label
    this.measureHeightLable = this.viewer.entities.add({
      position: new Cesium.CallbackProperty(() => {
        if (that.temPositions.length > 2) {
          return that.getLabelPosition(
            that.temPositions[1],
            that.temPositions[2]
          );
        }
      }),
      label: {
        text: new Cesium.CallbackProperty(() => {
          if (that.temPositions.length > 2) {
            return (
              "垂直:" +
              that.getLengthText(that.temPositions[1], that.temPositions[2])
            );
          }
        }),
        font: "normal 13px Microsoft YaHei",
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(-20, 0),
        outlineWidth: 9,
        outlineColor: Cesium.Color.GOLD,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    // Horizontal label
    this.measureHorizontalLineLable = this.viewer.entities.add({
      position: new Cesium.CallbackProperty(() => {
        if (that.temPositions.length > 2) {
          return that.getLabelPosition(
            that.temPositions[0],
            that.temPositions[2]
          );
        }
      }),
      label: {
        text: new Cesium.CallbackProperty(() => {
          if (that.temPositions.length > 2) {
            return (
              "水平:" +
              that.getLengthText(that.temPositions[0], that.temPositions[2])
            );
          }
        }),
        font: "normal 13px Microsoft YaHei",
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(-20, 0),
        outlineWidth: 9,
        outlineColor: Cesium.Color.GOLD,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    this.entities.push(this.measureHorizontalLineLable);
    this.entities.push(this.measureStraitLineLable);
    this.entities.push(this.measureHeightLable);
  }

  createEndMeasureLabels(pos) {
    if (pos.length > 2) {
      this.measureStraitLineLable.position = this.getLabelPosition(
        pos[0],
        pos[1]
      );
      this.measureStraitLineLable.label.text = `直线:${this.getLengthText(
        pos[0],
        pos[1]
      )}`;

      this.measureHeightLable.position = this.getLabelPosition(pos[2], pos[1]);
      this.measureHeightLable.label.text = `垂直:${this.getLengthText(
        pos[2],
        pos[1]
      )}`;

      this.measureHorizontalLineLable.position = this.getLabelPosition(
        pos[2],
        pos[0]
      );
      this.measureHorizontalLineLable.label.text = `水平:${this.getLengthText(
        pos[2],
        pos[0]
      )}`;
    }
  }

  getLabelPosition(p1, p2) {
    return Cesium.Cartesian3.midpoint(p1, p2, new Cesium.Cartesian3());
  }

  registerEvent() {
    this.leftClickEvent();
    this.rightClickEvent();
    this.moveEvent();
  }

  unRegisterEvent() {
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  activate() {
    console.log("active");
    this.deactivate();
    this.registerEvent();
    this.viewer.enableCursorStyle = true;
    this.viewer._element.style.cursor = "pointer";
    this.isMeasure = true;

    this.measureHeight = 0;
    this.measureStraitLine = 0;
    this.measureHorizontalLine = 0;
  }

  deactivate() {
    this.unRegisterEvent();
    this.viewer._element.style.cursor = "default";
    this.viewer.enableCursorStyle = false;
    this.isMeasure = false;
    this.temPositions = [];
    this.positions = [];
  }

  destroyHandler() {
    this.handler = this.handler && this.handler.destroy();
  }

  clear() {
    this.vertexPoints.forEach((item) => {
      this.viewer.entities.remove(item);
    });
    this.entities.forEach((item) => {
      this.viewer.entities.remove(item);
    });
    this.viewer.entities.remove(this.polyline);
    this.billboardCollection.removeAll();
    this.lableCollection.removeAll();
    this.pointCollection.removeAll();
    this.collection.removeAll();
    this.viewer.scene.primitives.remove(this.collection);

    this.positions = [];
    this.temPositions = [];
    this.measureHeight = 0;
    this.measureStraitLine = 0;
    this.measureHorizontalLine = 0;
    this.measureStraitLineLable = undefined;
    this.measureHeightLable = undefined;
    this.measureHorizontalLineLable = undefined;
    this.vertexPoints = [];
    this.entities = [];
    this.destroyHandler();
  }

  getPositionDegrees(position) {
    const cartographic = toCartographic(position);
    const [longitude, latitude] = toDegreesArray(cartographic);
    return { lng: longitude, lat: latitude, height: cartographic.height };
  }

  getLengthText(firstPoint, secondPoint) {
    // Calculate the distance between two points
    let length = Cesium.Cartesian3.distance(firstPoint, secondPoint);
    return this.formatDistance(length);
  }

  formatDistance(length) {
    if (length > 1000) {
      return (length / 1000).toFixed(2) + " 公里";
    } else {
      return length.toFixed(2) + " 米";
    }
  }
}

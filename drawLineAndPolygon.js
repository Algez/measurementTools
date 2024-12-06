/* ___________________________________________________________________________________ */
// 直线距离测量功能
function measureLine(viewer) {
  // 禁用双击事件，避免冲突
  viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
  );

  // 初始化变量
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  const positions = []; // 存储点击的点坐标
  let polyline = null; // 绘制的折线对象
  let distance = 0; // 累计测量的距离

  // 动态更新折线
  function updatePolyline() {
    if (!polyline) {
      polyline = new PolyLinePrimitive(positions); // 初始化折线
    }
  }

  // 更新浮动标签
  function addFloatingPoint(position, distanceText) {
    viewer.entities.add({
      position: position,
      point: {
        pixelSize: 5,
        color: Cesium.Color.RED,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 1,
      },
      label: {
        text: distanceText, // 显示距离
        font: "18px sans-serif",
        fillColor: Cesium.Color.GOLD,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 1,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(20, -20),
      },
    });
  }

  // 鼠标移动事件：动态绘制折线
  handler.setInputAction((movement) => {
    const ray = viewer.camera.getPickRay(movement.endPosition);
    const cartesian = viewer.scene.globe.pick(ray, viewer.scene);

    if (Cesium.defined(cartesian) && positions.length > 1) {
      positions[positions.length - 1] = cartesian; // 更新最后一个点
      distance = calculateDistance(positions); // 计算距离
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  // 鼠标左键点击事件：记录新点并更新距离
  handler.setInputAction((movement) => {
    const ray = viewer.camera.getPickRay(movement.position);
    const cartesian = viewer.scene.globe.pick(ray, viewer.scene);

    if (Cesium.defined(cartesian)) {
      if (positions.length === 0) {
        positions.push(cartesian.clone()); // 添加第一个点
      }
      positions.push(cartesian); // 添加新的点
      updatePolyline(); // 更新折线
      addFloatingPoint(cartesian, `${distance} 米`); // 显示当前距离
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // 鼠标右键点击事件：结束测量
  handler.setInputAction(() => {
    handler.destroy(); // 移除事件处理器
    positions.pop(); // 移除最后一个动态点
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

  // 折线绘制类
  class PolyLinePrimitive {
    constructor(positions) {
      this.positions = positions;
      this.options = {
        name: "直线",
        polyline: {
          show: true,
          positions: new Cesium.CallbackProperty(() => this.positions, false),
          material: Cesium.Color.GREEN,
          width: 5,
          clampToGround: false, // 不贴地
        },
      };
      viewer.entities.add(this.options); // 添加折线到场景
    }
  }

  // 计算两点之间的空间距离
  function calculateDistance(positions) {
    let totalDistance = 0;

    for (let i = 0; i < positions.length - 1; i++) {
      const point1 = Cesium.Cartographic.fromCartesian(positions[i]);
      const point2 = Cesium.Cartographic.fromCartesian(positions[i + 1]);

      // 计算两点间的表面距离
      const geodesic = new Cesium.EllipsoidGeodesic();
      geodesic.setEndPoints(point1, point2);
      const surfaceDistance = geodesic.surfaceDistance;

      // 加上高度差，计算实际距离
      const heightDifference = point2.height - point1.height;
      totalDistance += Math.sqrt(surfaceDistance ** 2 + heightDifference ** 2);
    }

    return totalDistance.toFixed(2); // 返回保留两位小数的总距离
  }
}
/* ___________________________________________________________________________________ */
// 贴地距离测量函数
function getTerrainDistance(viewer, start, end) {
  return new Promise((resolve) => {
    // 计算起点和终点之间的分割点数
    let splitNum = Math.max(
      1,
      Math.floor(Cesium.Cartesian3.distance(start, end))
    );

    // 将起点和终点转换为地理坐标（经纬度和高度）
    let startCartographic = Cesium.Cartographic.fromCartesian(start);
    let endCartographic = Cesium.Cartographic.fromCartesian(end);

    let lerpArray = [];
    // 将起点添加到插值数组
    lerpArray.push(
      new Cesium.Cartographic(
        startCartographic.longitude,
        startCartographic.latitude
      )
    );

    // 根据分割点数插值生成中间点
    for (let i = 1; i <= splitNum - 1; i++) {
      let t = i / splitNum;
      // 经度线性插值
      let lon = Cesium.Math.lerp(
        startCartographic.longitude,
        endCartographic.longitude,
        t
      );
      // 纬度线性插值
      let lat = Cesium.Math.lerp(
        startCartographic.latitude,
        endCartographic.latitude,
        t
      );
      lerpArray.push(new Cesium.Cartographic(lon, lat));
    }

    // 采样地形高度，生成高精度的地形坐标
    Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, lerpArray).then(
      (cartographicArr) => {
        // 计算贴地距离
        getDetailedTerrainDistance(cartographicArr).then((distance) => {
          resolve(distance);
        });
      }
    );
  });
}

// 计算点数组中相邻点之间的贴地距离
function getDetailedTerrainDistance(cartographicArr) {
  return new Promise((resolve) => {
    let terrainDistance = 0;
    for (let i = 0; i < cartographicArr.length - 1; i++) {
      let current = cartographicArr[i];
      let next = cartographicArr[i + 1];
      // 根据经纬度和高度生成笛卡尔坐标点
      let currentPosition = Cesium.Cartesian3.fromRadians(
        current.longitude,
        current.latitude,
        current.height
      );
      let nextPosition = Cesium.Cartesian3.fromRadians(
        next.longitude,
        next.latitude,
        next.height
      );
      // 计算相邻两点之间的距离并累加
      terrainDistance += Cesium.Cartesian3.distance(
        currentPosition,
        nextPosition
      );
    }
    resolve(terrainDistance); // 返回总距离
  });
}

// 修改后的贴地测量函数
function measureClampedLine(viewer) {
  // 禁用双击事件以避免冲突
  viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
  );

  var handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  var positions = []; // 存储测量点的坐标数组
  var poly = null; // 绘制的线对象
  var distance = 0; // 累计距离
  var floatingPoint; // 浮动标签，用于显示当前测量的距离

  // 更新折线的绘制
  function updatePolyline() {
    if (!Cesium.defined(poly)) {
      poly = new PolyLinePrimitive(positions);
    } else {
      poly.positions = positions;
    }
  }

  // 异步计算贴地距离
  async function calculateTerrainDistance() {
    let totalDistance = 0;
    for (let i = 0; i < positions.length - 1; i++) {
      let start = positions[i];
      let end = positions[i + 1];
      // 计算分段距离
      let segmentDistance = await getTerrainDistance(viewer, start, end);
      totalDistance += segmentDistance;
    }
    distance = totalDistance;

    // 更新浮动标签显示的距离
    if (Cesium.defined(floatingPoint) && positions.length > 0) {
      floatingPoint.position = positions[positions.length - 1];
    } else if (positions.length > 0 && !floatingPoint) {
      floatingPoint = viewer.entities.add({
        name: "贴地距离",
        position: positions[positions.length - 1],
        point: {
          pixelSize: 5,
          color: Cesium.Color.RED,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1,
        },
        label: {
          text: distance.toFixed(2) + " 米", // 显示贴地距离
          font: "18px sans-serif",
          fillColor: Cesium.Color.GOLD.withAlpha(0.0),
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineWidth: 1,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(20, -20),
        },
      });
    }
  }

  // 鼠标移动事件，实时更新折线和测量距离
  handler.setInputAction(function (movement) {
    let ray = viewer.camera.getPickRay(movement.endPosition);
    let cartesian = viewer.scene.globe.pick(ray, viewer.scene);
    if (Cesium.defined(cartesian) && positions.length >= 1) {
      positions[positions.length - 1] = cartesian; // 更新最后一个点
      updatePolyline();
      calculateTerrainDistance();
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  // 鼠标左键点击事件，添加测量点
  handler.setInputAction(function (movement) {
    let ray = viewer.camera.getPickRay(movement.position);
    let cartesian = viewer.scene.globe.pick(ray, viewer.scene);
    if (Cesium.defined(cartesian)) {
      if (positions.length == 0) {
        positions.push(cartesian.clone()); // 添加第一个点
        viewer.entities.add({
          name: "距离点",
          position: cartesian.clone(),
          point: {
            pixelSize: 5,
            color: Cesium.Color.BLUE,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1,
          },
        });
        positions.push(cartesian); // 再次添加第一个点，作为动态更新的基础
      } else {
        positions.push(cartesian.clone()); // 添加新的测量点
        updatePolyline();
        calculateTerrainDistance().then(() => {
          viewer.entities.add({
            name: "距离点",
            position: cartesian.clone(),
            point: {
              pixelSize: 5,
              color: Cesium.Color.BLUE,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 1,
            },
            label: {
              text: "贴地距离：" + distance.toFixed(2) + " 米",
              font: "18px sans-serif",
              fillColor: Cesium.Color.WHITE,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              outlineWidth: 1,
              verticalOrigin: Cesium.VerticalOrigin.LEFT,
              pixelOffset: new Cesium.Cartesian2(20, -50),
            },
          });
        });
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // 鼠标右键点击事件，结束测量
  handler.setInputAction(function () {
    handler.destroy(); // 销毁事件处理器
    if (positions.length > 0) {
      positions.pop(); // 移除最后一个点
      updatePolyline();
      calculateTerrainDistance();
    }
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

  // 定义 PolyLinePrimitive 类，用于绘制贴地折线
  function PolyLinePrimitive(initialPositions) {
    this.positions = initialPositions;
    this.options = {
      name: "贴地线",
      polyline: {
        show: true,
        positions: new Cesium.CallbackProperty(() => this.positions, false),
        material: Cesium.Color.GREEN,
        width: 5,
        clampToGround: true, // 折线贴地
      },
    };
    viewer.entities.add(this.options);
  }
}

/* ___________________________________________________________________________________ */
// 平面面积测量功能
function drawPolygonAndCalculateArea(viewer) {
  let positions = []; // 存储点击的点
  let polygonEntity = null; // 多边形实体
  let lineEntities = []; // 存储线段实体
  let areaLabel = null; // 面积标签
  const screenSpaceEventHandler = new Cesium.ScreenSpaceEventHandler(
    viewer.canvas
  );

  // 添加一个点到场景
  function addPoint(position) {
    viewer.entities.add({
      position: position,
      point: {
        color: Cesium.Color.BLUE,
        pixelSize: 5,
        heightReference: Cesium.HeightReference.NONE,
      },
    });
  }

  // 添加一条线段到场景
  function addLine(positions) {
    return viewer.entities.add({
      polyline: {
        positions: positions,
        width: 2,
        material: Cesium.Color.YELLOW,
        clampToGround: false, // 不贴地
      },
    });
  }

  // 添加或更新多边形
  function addOrUpdatePolygon(positions) {
    if (polygonEntity) {
      viewer.entities.remove(polygonEntity);
    }
    polygonEntity = viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(positions),
        material: Cesium.Color.GREEN.withAlpha(0.6),
        classificationType: Cesium.ClassificationType.NONE,
        heightReference: Cesium.HeightReference.NONE, // 不贴地
        perPositionHeight: true, // 使用点的高度
      },
    });
  }

  // 显示点击点的坐标信息
  function displayCoordinates(cartesian) {
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    const latitude = Cesium.Math.toDegrees(cartographic.latitude).toFixed(6); // 纬度
    const longitude = Cesium.Math.toDegrees(cartographic.longitude).toFixed(6); // 经度
    const height = cartographic.height.toFixed(2); // 高度

    viewer.entities.add({
      position: cartesian,
      label: {
        text: `纬度：${latitude}, 经度：${longitude}, 高度：${height} 米`,
        font: "12px sans-serif",
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: Cesium.Color.WHITE,
        showBackground: true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
        pixelOffset: new Cesium.Cartesian2(0, -50),
      },
    });
  }

  // 计算并显示多边形面积
  function calculateAndDisplayArea(positions) {
    const coordinates = positions.map((pos) => {
      const cartographic = Cesium.Cartographic.fromCartesian(pos);
      return [
        Cesium.Math.toDegrees(cartographic.longitude),
        Cesium.Math.toDegrees(cartographic.latitude),
      ];
    });

    // 如果多边形未闭合，则自动闭合
    if (
      coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
      coordinates[0][1] !== coordinates[coordinates.length - 1][1]
    ) {
      coordinates.push(coordinates[0]);
    }

    // 使用 Turf.js 计算面积
    const turfPolygon = turf.polygon([coordinates]);
    const area = turf.area(turfPolygon); // 面积单位为平方米

    // 获取多边形的重心
    const center = getCenterOfGravityPoint(positions);

    // 如果已存在面积标签，则移除
    if (areaLabel) {
      viewer.entities.remove(areaLabel);
    }

    // 添加面积标签
    areaLabel = viewer.entities.add({
      position: center,
      label: {
        text: `水平面积： ${(area / 1000000).toFixed(2)} 平方公里`, // 转换为平方公里
        font: "14px sans-serif",
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: Cesium.Color.GOLD,
        showBackground: true,
        backgroundColor: Cesium.Color.GRAY.withAlpha(0.8),
        backgroundPadding: new Cesium.Cartesian2(6, 6),
        pixelOffset: new Cesium.Cartesian2(0, -25),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
  }

  // 计算多边形的重心
  function getCenterOfGravityPoint(points) {
    let center = points[0];
    for (let i = 1; i < points.length; i++) {
      center = Cesium.Cartesian3.midpoint(
        center,
        points[i],
        new Cesium.Cartesian3()
      );
    }
    return center;
  }

  // 鼠标左键点击事件：添加点和更新多边形
  screenSpaceEventHandler.setInputAction((clickEvent) => {
    const cartesian = viewer.scene.pickPosition(clickEvent.position);

    if (!cartesian) return;

    positions.push(cartesian);
    addPoint(cartesian); // 添加点
    displayCoordinates(cartesian); // 显示坐标信息

    // 添加线段连接当前点和上一个点
    if (positions.length > 1) {
      const line = addLine([positions[positions.length - 2], cartesian]);
      lineEntities.push(line);
    }

    // 如果有至少3个点，更新多边形
    if (positions.length >= 3) {
      addOrUpdatePolygon(positions);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // 鼠标右键点击事件：结束绘制并计算面积
  screenSpaceEventHandler.setInputAction(() => {
    if (positions.length >= 3) {
      positions.push(positions[0]); // 闭合多边形
      addLine([positions[positions.length - 2], positions[0]]); // 添加最后一条线
      addOrUpdatePolygon(positions); // 更新多边形

      calculateAndDisplayArea(positions); // 计算并显示面积
    }

    // 移除事件处理器
    screenSpaceEventHandler.removeInputAction(
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    );
    screenSpaceEventHandler.removeInputAction(
      Cesium.ScreenSpaceEventType.RIGHT_CLICK
    );
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
}
/* ___________________________________________________________________________________ */
// 贴地面积测量
function measurePolygn(viewer) {
  // 创建事件处理器，用于捕获鼠标事件
  var handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  var positions = []; // 存储鼠标点击的点的世界坐标
  var tempPoints = []; // 存储鼠标点击的点的经纬度和高度信息
  var polygon = null; // 多边形对象
  var cartesian = null; // 当前鼠标位置的世界坐标
  var floatingPoint; // 临时显示的点信息（标签和样式）

  // 鼠标移动事件，用于动态绘制多边形
  handler.setInputAction(function (movement) {
    let ray = viewer.camera.getPickRay(movement.endPosition); // 获取鼠标位置的射线
    cartesian = viewer.scene.globe.pick(ray, viewer.scene); // 获取射线与地球表面的交点
    positions.pop(); // 移除最后一个点（动态更新的点）
    positions.push(cartesian); // 添加当前鼠标位置
    if (positions.length >= 2) {
      // 动态更新多边形的顶点
      var dynamicPositions = new Cesium.CallbackProperty(function () {
        return new Cesium.PolygonHierarchy(positions);
      }, false);
      // 绘制或更新多边形
      polygon = PolygonPrimitive(dynamicPositions);
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  // 鼠标左键点击事件，添加多边形顶点
  handler.setInputAction(function (movement) {
    let ray = viewer.camera.getPickRay(movement.position); // 获取点击位置的射线
    cartesian = viewer.scene.globe.pick(ray, viewer.scene); // 获取射线与地球表面的交点
    if (positions.length == 0) {
      positions.push(cartesian.clone()); // 添加第一个点
    }
    positions.push(cartesian); // 添加新的顶点
    // 获取点的经纬度和高度
    var cartographic = Cesium.Cartographic.fromCartesian(
      positions[positions.length - 1]
    );
    var longitudeString = Cesium.Math.toDegrees(cartographic.longitude); // 经度
    var latitudeString = Cesium.Math.toDegrees(cartographic.latitude); // 纬度
    var heightString = cartographic.height; // 高度
    var labelText =
      "(" + longitudeString.toFixed(2) + "," + latitudeString.toFixed(2) + ")"; // 显示坐标信息
    tempPoints.push({
      lon: longitudeString,
      lat: latitudeString,
      hei: heightString,
    });
    // 在场景中添加一个标记点
    floatingPoint = viewer.entities.add({
      name: "多边形面积",
      position: positions[positions.length - 1],
      point: {
        pixelSize: 5,
        color: Cesium.Color.RED,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      label: {
        text: labelText,
        font: "18px sans-serif",
        fillColor: Cesium.Color.GOLD,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 2,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(20, -20),
      },
    });
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // 鼠标右键点击事件，结束多边形绘制并计算面积
  handler.setInputAction(function (movement) {
    handler.destroy(); // 销毁事件处理器，停止监听鼠标事件
    positions.pop(); // 移除最后一个临时点
    var textArea = "贴地面积：" + getArea(tempPoints) + "平方公里"; // 计算多边形面积
    // 添加面积显示标签
    viewer.entities.add({
      name: "多边形面积",
      position: positions[positions.length - 1],
      label: {
        text: textArea,
        font: "18px sans-serif",
        fillColor: Cesium.Color.GOLD,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 2,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(20, -40),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

  var radiansPerDegree = Math.PI / 180.0; // 角度转弧度
  var degreesPerRadian = 180.0 / Math.PI; // 弧度转角度

  // 计算多边形的贴地面积
  function getArea(points) {
    var res = 0; // 初始化面积
    // 将多边形拆分成三角形，逐一计算每个三角形的面积
    for (var i = 0; i < points.length - 2; i++) {
      var j = (i + 1) % points.length;
      var k = (i + 2) % points.length;
      var totalAngle = Angle(points[i], points[j], points[k]); // 计算角度
      var dis_temp1 = distance(positions[i], positions[j]); // 计算边长1
      var dis_temp2 = distance(positions[j], positions[k]); // 计算边长2
      res += dis_temp1 * dis_temp2 * Math.abs(Math.sin(totalAngle)); // 计算三角形面积并累加
    }
    return (res / 1000000.0).toFixed(4); // 返回面积（单位：平方公里）
  }

  // 计算三个点的夹角
  function Angle(p1, p2, p3) {
    var bearing21 = Bearing(p2, p1); // 点2到点1的方向
    var bearing23 = Bearing(p2, p3); // 点2到点3的方向
    var angle = bearing21 - bearing23; // 计算方向差
    if (angle < 0) {
      angle += 360;
    }
    return angle;
  }

  // 计算两点之间的方向
  function Bearing(from, to) {
    var lat1 = from.lat * radiansPerDegree; // 起点纬度（弧度）
    var lon1 = from.lon * radiansPerDegree; // 起点经度（弧度）
    var lat2 = to.lat * radiansPerDegree; // 终点纬度（弧度）
    var lon2 = to.lon * radiansPerDegree; // 终点经度（弧度）
    var angle = -Math.atan2(
      Math.sin(lon1 - lon2) * Math.cos(lat2),
      Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2)
    );
    if (angle < 0) {
      angle += Math.PI * 2.0;
    }
    angle = angle * degreesPerRadian; // 转为角度
    return angle;
  }

  // 创建多边形实体
  function PolygonPrimitive(positions) {
    polygon = viewer.entities.add({
      polygon: {
        hierarchy: positions,
        material: Cesium.Color.GREEN.withAlpha(0.5),
      },
    });
  }

  // 计算两点之间的距离
  function distance(point1, point2) {
    var point1cartographic = Cesium.Cartographic.fromCartesian(point1); // 点1的经纬度
    var point2cartographic = Cesium.Cartographic.fromCartesian(point2); // 点2的经纬度

    // 通过经纬度计算表面距离
    var geodesic = new Cesium.EllipsoidGeodesic();
    geodesic.setEndPoints(point1cartographic, point2cartographic);
    var s = geodesic.surfaceDistance;

    // 加上高度差计算三维距离
    s = Math.sqrt(
      Math.pow(s, 2) +
        Math.pow(point2cartographic.height - point1cartographic.height, 2)
    );
    return s; // 返回距离
  }
}
/* ___________________________________________________________________________________ */

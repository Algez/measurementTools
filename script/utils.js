/* 工具和辅助函数 */
/* ___________________________________________________________________________________ */

// 将 Cartesian 坐标转换为 Cartographic（地理坐标）
export function toCartographic(cartesian) {
  return Cesium.Cartographic.fromCartesian(cartesian);
}
/* ___________________________________________________________________________________ */

// 将 Cartographic（地理坐标）转换为弧度数组 [longitudeRadians, latitudeRadians]
export function toRadiansArray(cartographic) {
  return [cartographic.longitude, cartographic.latitude];
}
/* ___________________________________________________________________________________ */

// 将 Cartographic（地理坐标）转换为角度数组 [longitudeDegrees, latitudeDegrees]
export function toDegreesArray(cartographic) {
  return [
    Cesium.Math.toDegrees(cartographic.longitude),
    Cesium.Math.toDegrees(cartographic.latitude),
  ];
}
/* ___________________________________________________________________________________ */

// 根据一组位置计算总距离
export function calculateDistance(positions) {
  let totalDistance = 0;
  for (let i = 0; i < positions.length - 1; i++) {
    const p1 = toCartographic(positions[i]);
    const p2 = toCartographic(positions[i + 1]);
    const geodesic = new Cesium.EllipsoidGeodesic(p1, p2); // 计算椭球面两点间的测地线
    const surfaceDistance = geodesic.surfaceDistance; // 获取表面距离
    const heightDiff = p2.height - p1.height; // 高度差
    totalDistance += Math.sqrt(surfaceDistance ** 2 + heightDiff ** 2); // 计算总距离（考虑高度差）
  }
  return totalDistance.toFixed(2); // 返回保留两位小数的距离
}
/* ___________________________________________________________________________________ */

// 对地形进行采样以获取精确的贴地距离
export async function getTerrainDistance(viewer, start, end) {
  const segmentLength = Cesium.Cartesian3.distance(start, end); // 计算两点间的直线距离
  const splitNum = Math.max(1, Math.floor(segmentLength)); // 根据距离确定分割数

  const startC = toCartographic(start);
  const endC = toCartographic(end);

  // 生成用于地形采样的中间地理位置
  const lerpArray = [
    new Cesium.Cartographic(startC.longitude, startC.latitude),
  ];
  for (let i = 1; i < splitNum; i++) {
    const t = i / splitNum; // 线性插值比例
    const lon = Cesium.Math.lerp(startC.longitude, endC.longitude, t); // 插值经度
    const lat = Cesium.Math.lerp(startC.latitude, endC.latitude, t); // 插值纬度
    lerpArray.push(new Cesium.Cartographic(lon, lat));
  }

  const sampledPositions = await Cesium.sampleTerrainMostDetailed(
    viewer.terrainProvider,
    lerpArray
  ); // 使用地形采样位置
  return getDetailedTerrainDistance(sampledPositions); // 返回计算的贴地距离
}
/* ___________________________________________________________________________________ */

// 根据采样的地形坐标数组计算贴地总距离
export function getDetailedTerrainDistance(cartographicArr) {
  let terrainDistance = 0;
  for (let i = 0; i < cartographicArr.length - 1; i++) {
    const c1 = cartographicArr[i];
    const c2 = cartographicArr[i + 1];
    const p1 = Cesium.Cartesian3.fromRadians(
      c1.longitude,
      c1.latitude,
      c1.height
    ); // 将地理坐标转换为笛卡尔坐标
    const p2 = Cesium.Cartesian3.fromRadians(
      c2.longitude,
      c2.latitude,
      c2.height
    );
    terrainDistance += Cesium.Cartesian3.distance(p1, p2); // 累加两点间的距离
  }
  return terrainDistance;
}
/* ___________________________________________________________________________________ */

// 将一组 Cartesian 坐标转换为 [经度, 纬度] 数组
export function positionsToLngLatArray(positions) {
  return positions.map((pos) => {
    const cartographic = toCartographic(pos);
    return toDegreesArray(cartographic); // 转换为角度
  });
}
/* ___________________________________________________________________________________ */

// 添加标签实体
export function addLabel(
  viewer,
  position,
  text,
  offset = new Cesium.Cartesian2(20, -20) // 默认偏移量
) {
  return viewer.entities.add({
    position,
    label: {
      text, // 标签内容
      font: "18px sans-serif", // 字体
      fillColor: Cesium.Color.GOLD, // 字体颜色
      style: Cesium.LabelStyle.FILL_AND_OUTLINE, // 样式（填充加描边）
      outlineWidth: 1, // 描边宽度
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM, // 垂直对齐方式
      pixelOffset: offset, // 像素偏移量
    },
  });
}
/* ___________________________________________________________________________________ */

// 添加点实体
export function addPoint(viewer, position, color, size) {
  return viewer.entities.add({
    position,
    point: {
      pixelSize: size, // 点的大小
      color, // 点的颜色
      outlineColor: Cesium.Color.WHITE, // 描边颜色
      outlineWidth: 1, // 描边宽度
    },
  });
}

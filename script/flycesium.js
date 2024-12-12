var bxmap = bxmap || {};
bxmap.FlyCesium = {
  cesiumViewer: null,
  draw3DObj: null,
  drawHelper: null,
  isDrawFly: false, //设定路线模式
  drawPolyline: null, //飞行绘制路线
  parentID: null,
  node: null,
  data: [], //漫游路径信息模拟数据
  Init: function (cesiumViewer, drawHelper, parentID) {
    this.cesiumViewer = cesiumViewer; //cesium对象
    this.drawHelper = drawHelper; //drawHelper对象
    this.parentID = parentID; //父容器
    this.InitHtml();
    this.InitEvent();
    this.loadData();
  },
  InitHtml: function () {
    var parent = document.getElementById(bxmap.FlyCesium.parentID);
    bxmap.FlyCesium.node = `<div id= "fly3DPaths" class="fly3DPaths">
        <div class="fly3DPaths_title">操作菜单 <span id="fly3DClose" class="fly3DClose"></span></div>
        <!--新增-->
        <!-- tab导航部分 -->
        <div class='fly3DPaths_tab'>
            <ul style='margin-left:0;' class="fly3DPaths_tab_ul">
                <li id="overFlyClick"><span><span class='flss'></span><a href='javascript:void(0)'>预设路线</a></span></li>
                <li id="drawFlyCilck" class="select"><span><span class='flss'></span><a href='javascript:void(0);'>手动绘制</a></span></li>
            </ul>
        </div>
        <!-- tab内容部分 -->
        <!-- 预设路线 -->
        <div id='overFlyPage' style='height: 100%;; display:none'>
            <div style="padding: 5px;margin-top: 5px;">
                <div class='ydph-table-wrap'>
                    <div class='ydph-talbe-head'>
                        <table id='overFly_table' class='table table-bordered'>
                            <thead>
                            <tr>
                                <!--<th class='colspan1'><input type='checkbox' onchange=''/></th>-->
                                <th class='colspan4'>名称</th>
                                <th class='colspan2'>操作</th>
                                <th class='colspan2'>修改</th>
                                <th class='colspan2'>删除</th>
                            </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        <!-- 手动绘制 -->
        <div id='drawFlyPage' style='height: 100%'>
            <div class="fly3DPaths_content">
                <input id="start_Fly3DPaths" class="fly3DPaths_model_id" type="button" value="开始飞行">
                <input id="pause_Fly3DPaths" class="fly3DPaths_model_id" type="button" value="暂停飞行">
                <input id="playForward_Fly3DPaths" class="fly3DPaths_model_id" type="button" value="向前飞行">
                <input id="playReverse_Fly3DPaths" class="fly3DPaths_model_id" type="button" value="向后飞行">
                <input id="draw_Fly3DPaths" class="fly3DPaths_model_id" type="button" value="设定路线">
                <input id="save_Fly3DPaths" class="fly3DPaths_model_id" type="button" value="保存路线">
                <input id="clear_Fly3DPaths" class="fly3DPaths_model_id" type="button" value="清空路线">
                <input id="stop_Fly3DPaths" class="fly3DPaths_model_id" type="button" value="退出飞行">
            </div>
        </div>

    </div>`;
    $(parent).append(bxmap.FlyCesium.node);
  },
  InitEvent: function () {
    //飞行路径顶端部分的切换事件
    $(".fly3DPaths_tab li").on("click", function () {
      $(".fly3DPaths_tab_ul>li").each(function (index) {
        $(".fly3DPaths_tab_ul>li").eq(index).removeClass("select");
      });
      var $overFlyPage = $("#overFlyPage");
      var $drawFlyPage = $("#drawFlyPage");
      //三角形标识切换
      switch ($(this).index()) {
        case 0: //预设路线
          $("#overFlyClick").addClass("select");
          $overFlyPage.css({ display: "block" });
          $drawFlyPage.css({ display: "none" });
          bxmap.FlyCesium.loadData();
          break;
        case 1: //手动绘制
          $("#drawFlyCilck").addClass("select");
          $overFlyPage.css({ display: "none" });
          $drawFlyPage.css({ display: "block" });
          break;
      }
    });
    //开始飞行
    $("#start_Fly3DPaths").on("click", function () {
      //debugger;
      if (bxmap.FlyCesium.draw3DObj) {
        bxmap.FlyCesium.showFly3DPaths(bxmap.FlyCesium.draw3DObj);
      } else {
        jDialog.dialog({
          title: "提示信息",
          modal: true, // 非模态，即不显示遮罩层
          autoClose: 1500,
          content: "漫游路线不存在",
        });
      }
    });
    //暂停飞行
    $("#pause_Fly3DPaths").on("click", function () {
      bxmap.FlyCesium.pauseFly3DPaths();
    });
    //向前飞行
    $("#playForward_Fly3DPaths").on("click", function () {
      bxmap.FlyCesium.playForwardFly3DPaths();
    });
    //向后飞行
    $("#playReverse_Fly3DPaths").on("click", function () {
      bxmap.FlyCesium.playReverseFly3DPaths();
    });
    //退出飞行
    $("#stop_Fly3DPaths").on("click", function () {
      $("#cesiumFly3DPaths").on("click");
      bxmap.FlyCesium.stopFly3DPaths();
    });
    //清空路线
    $("#clear_Fly3DPaths").on("click", function () {
      bxmap.FlyCesium.clearFly3DPaths();
    });
    //设定路线
    $("#draw_Fly3DPaths").on("click", function () {
      if (!bxmap.FlyCesium.drawHelper) {
        bxmap.FlyCesium.drawHelper = new DrawHelper(
          bxmap.FlyCesium.cesiumViewer
        );
      }
      bxmap.FlyCesium.draw3DObj = bxmap.FlyCesium.DrawFly3DPaths(
        bxmap.FlyCesium.drawHelper
      );
    });
    //保存路线
    $("#save_Fly3DPaths").on("click", function () {
      if (bxmap.FlyCesium.draw3DObj && bxmap.FlyCesium.isDrawFly) {
        jDialog.dialog({
          title: "保存路线",
          content:
            '<div><span>名称:</span><input type="text" id="FlyAdd_name" value="' +
            name +
            '"></div>',
          width: 300,
          height: 120,
          modal: true, // 非模态，即不显示遮罩层
          buttons: [
            {
              text: "确定",
              handler: function (button, dialog) {
                var draw3DObj = JSON.stringify(bxmap.FlyCesium.draw3DObj); //将JSON对象转化为JSON字符
                var TbFly = {
                  id: Math.random().toString(36).substring(2),
                  name: $("#FlyAdd_name").val(),
                  geojson: draw3DObj,
                };
                bxmap.FlyCesium.data.push(TbFly);
                $("#overFlyClick").on("click");
                dialog.close();
                bxmap.FlyCesium.clearFly3DPaths();
              },
            },
            {
              text: "取消",
              handler: function (button, dialog) {
                dialog.close();
              },
            },
          ],
        });
      } else {
        jDialog.dialog({
          title: "提示信息",
          modal: true, // 非模态，即不显示遮罩层
          autoClose: 1500,
          content: "设定的漫游路线不存在，请绘制再保存",
        });
      }
    });
    //关闭界面
    $("#fly3DClose").on("click", function () {
      var $fly3DPaths = $("#fly3DPaths");
      bxmap.FlyCesium.clearFly3DPaths();
      $fly3DPaths.hide(1000, function () {
        $fly3DPaths.remove();
      });
    });
  },
  //飞行路径列表表格监听事件
  flyTableOnclick: function () {
    $("#overFly_table td").on("click", function () {
      var trSeq = $(this).parent().parent().find("tr").index($(this).parent()); //选中的哪行
      var geojson = $(
        "#overFly_table tr:gt(0):eq(" + trSeq + ") td:eq(5)"
      ).text(); //获取选中行的geojson列值
      var name = $("#overFly_table tr:gt(0):eq(" + trSeq + ") td:eq(0)").text(); //获取选中行的name列值
      var id = $("#overFly_table tr:gt(0):eq(" + trSeq + ") td:eq(4)").text(); //获取选中行的id列值
      geojson = eval("(" + geojson + ")");
      var tdSeq = $(this).parent().find("td").index($(this)); //选中哪一列
      switch (tdSeq) {
        case 0: //名称
          break;
        case 1: //飞行
          bxmap.FlyCesium.draw3DObj = geojson;
          //bxmap.FlyCesium.cesium.showFly3DPaths(geojson);
          bxmap.FlyCesium.showFly3DPaths(geojson);
          $("#drawFlyCilck").on("click");
          break;
        case 2: //修改
          jDialog.dialog({
            title: "修改路线",
            content:
              '<div><span>名称:</span><input type="text" id="Fly_name" value="' +
              name +
              '"></div>',
            width: 300,
            height: 120,
            modal: true, // 非模态，即不显示遮罩层
            buttons: [
              {
                text: "确定",
                handler: function (button, dialog) {
                  bxmap.FlyCesium.data = bxmap.FlyCesium.modifyElement(
                    bxmap.FlyCesium.data,
                    id,
                    $("#Fly_name").val()
                  );
                  $("#overFlyClick").on("click");
                  dialog.close();
                },
              },
              {
                text: "取消",
                handler: function (button, dialog) {
                  dialog.close();
                },
              },
            ],
          });
          break;
        case 3: //删除
          //删除
          jDialog.dialog({
            title: "删除路线",
            modal: true, // 非模态，即不显示遮罩层
            content: "确定要删除该漫游路线?",
            buttons: [
              {
                text: "确定",
                handler: function (button, dialog) {
                  bxmap.FlyCesium.data = bxmap.FlyCesium.delElement(
                    bxmap.FlyCesium.data,
                    id
                  );
                  $("#overFlyClick").on("click");
                  dialog.close();
                },
              },
              {
                text: "取消",
                handler: function (button, dialog) {
                  dialog.close();
                },
              },
            ],
          });
          break;
      }
    });
  },
  /**
     * 从数组中移除指定的元素,要是存在的话
     @ serviceArray筛选数组
     @ id移除元素id
     */
  delElement: function (serviceArray, id) {
    var array = [];
    for (var i = 0; i < serviceArray.length; i++) {
      if (serviceArray[i].id !== id) {
        array.push(serviceArray[i]);
      }
    }
    return array;
  },
  /**
     * 从数组中修改指定的元素,要是存在的话
     @ serviceArray筛选数组
     @ id修改元素id
     @ name修改元素名称
     */
  modifyElement: function (serviceArray, id, name) {
    var array = [];
    for (var i = 0; i < serviceArray.length; i++) {
      if (serviceArray[i].id === id) {
        serviceArray[i].name = name;
      }
      array.push(serviceArray[i]);
    }
    return array;
  },
  loadData: function () {
    var data = bxmap.FlyCesium.data;
    var html = "";
    var $overFly_table = $("#overFly_table");
    if (data.length >= 0) {
      for (var i = 0; i < data.length; i++) {
        var flydata = data[i];
        html +=
          "<tr>" +
          '<td><a style="color:#fff;text-decoration:none;font-size:12px;">' +
          flydata.name +
          "</a></td>" +
          '<td><button class="btn btn-default btn-xs" style="color:#fff;">飞行</button></td>' +
          '<td><button class="btn btn-default btn-xs" style="color:#fff;">修改</button></td>' +
          '<td><button class="btn btn-default btn-xs" style="color:#fff;">删除</button></td>' +
          "<td><a style='color:black;text-decoration:none;font-size:13px;'>" +
          flydata.id +
          "</a></td>" +
          "<td><a style='color:black;text-decoration:none;font-size:13px;'>" +
          flydata.geojson +
          "</a></td>" +
          "<td><a style='color:black;text-decoration:none;font-size:13px;'>" +
          flydata.position +
          "</a></td>" +
          "<td><a style='color:black;text-decoration:none;font-size:13px;'>" +
          flydata.orientation +
          "</a></td>" +
          "</tr>";
      }
      $("#overFly_table tbody").html(html);
      $overFly_table.find("td:eq(4)").hide(); //隐藏id字段列
      $overFly_table.find("td:eq(5)").hide(); //隐藏geojson字段列
      $overFly_table.find("td:eq(6)").hide(); //隐藏position字段列
      $overFly_table.find("td:eq(7)").hide(); //隐藏orientation字段列
      //表格---行点击事件
      bxmap.FlyCesium.flyTableOnclick();
    }
  },
  /**
   * 清空漫游路径
   * @method stopFly3DPaths
   * @return
   */
  clearFly3DPaths: function () {
    this.cesiumViewer.trackedEntity = undefined;
    bxmap.FlyCesium.isDrawFly = false;
    bxmap.FlyCesium.draw3DObj = null;
    this.cesiumViewer.entities.removeAll(); //清空所有模型
    //清空绘制飞行路线
    if (this.drawPolyline) {
      this.cesiumViewer.scene.primitives.remove(this.drawPolyline);
      this.drawPolyline = null;
    }
  },
  /**
   * 飞行漫游路径
   * @param pathsData
   */
  showFly3DPaths: function (pathsData) {
    var T = this;
    this.clearFly3DPaths();
    T.cesiumViewer.camera.setView({
      destination: pathsData.position,
      orientation: pathsData.orientation,
    });
    setTimeout(function () {
      executeFly3D();
    }, 200);
    function executeFly3D() {
      if (pathsData && pathsData.geometry) {
        var positionA = pathsData.geometry.coordinates;
        var position = [];
        if (positionA.length > 0) {
          for (var i = 0; i < positionA.length; i++) {
            var x = positionA[i][0];
            var y = positionA[i][1];
            position.push({ x: x, y: y });
          }
        } else {
          return;
        }
        function computeCirclularFlight() {
          var property = new Cesium.SampledPositionProperty();
          for (var i = 0; i < position.length; i++) {
            if (i === 0) {
              var time = Cesium.JulianDate.addSeconds(
                start,
                i,
                new Cesium.JulianDate()
              );
              //var _position = Cesium.Cartesian3.fromDegrees(position[i].x, position[i].y, 1170);
              var _position = Cesium.Cartesian3.fromDegrees(
                position[i].x,
                position[i].y,
                0
              );
              property.addSample(time, _position);
            }
            if (i < 10000 && i > 0) {
              var position_a = new Cesium.Cartesian3(
                property._property._values[i * 3 - 3],
                property._property._values[i * 3 - 2],
                property._property._values[i * 3 - 1]
              );
              if (i < 976) {
                var _position = Cesium.Cartesian3.fromDegrees(
                  position[i].x,
                  position[i].y,
                  0
                );
              } else if (i > 975 && i < 986) {
                var _position = Cesium.Cartesian3.fromDegrees(
                  position[i].x,
                  position[i].y,
                  0
                );
              } else if (i > 985) {
                var _position = Cesium.Cartesian3.fromDegrees(
                  position[i].x,
                  position[i].y,
                  0
                );
              }

              var positions = [
                Cesium.Ellipsoid.WGS84.cartesianToCartographic(position_a),
                Cesium.Ellipsoid.WGS84.cartesianToCartographic(_position),
              ];
              var a = new Cesium.EllipsoidGeodesic(positions[0], positions[1]);
              var long = a.surfaceDistance;
              var _time = long / 50;
              var time = Cesium.JulianDate.addSeconds(
                property._property._times[i - 1],
                _time,
                new Cesium.JulianDate()
              );

              property.addSample(time, _position);
            }
          }
          return property;
        }
        var start = Cesium.JulianDate.fromDate(new Date());
        var stop = Cesium.JulianDate.addSeconds(
          start,
          30000,
          new Cesium.JulianDate()
        );
        T.cesiumViewer.clock.startTime = start.clone();
        T.cesiumViewer.clock.stopTime = stop.clone();
        T.cesiumViewer.clock.currentTime = start.clone();
        T.cesiumViewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
        T.cesiumViewer.clock.multiplier = 5; //值越大，飞行越快
        T.cesiumViewer.clock.canAnimate = false;
        T.cesiumViewer.clock.shouldAnimate = true; //设置时间轴动态效果

        var _position = computeCirclularFlight();

        T.entityFly = T.cesiumViewer.entities.add({
          availability: new Cesium.TimeIntervalCollection([
            new Cesium.TimeInterval({
              start: start,
              stop: stop,
            }),
          ]),
          position: _position,
          orientation: new Cesium.VelocityOrientationProperty(_position),
          point: {
            color: Cesium.Color.BLUE,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            pixelSize: 15,
          },
          //Show the path as a pink line sampled in 1 second increments.
          path: {
            resolution: 1,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.1,
              color: Cesium.Color.YELLOW,
            }),
            //width: 30
            width: 10,
          },
        });
        T.cesiumViewer.trackedEntity = T.entityFly;
        setTimeout(function () {
          T.cesiumViewer.camera.zoomOut(20000.0); //缩小地图，避免底图没有数据
        }, 100);
      } else {
        return;
      }
    }
  },
  /**
   * 暂停飞行漫游路径
   * @method pauseFly3DPaths
   * @return
   */
  pauseFly3DPaths: function () {
    var clockViewModel = this.cesiumViewer.clockViewModel;
    if (clockViewModel.shouldAnimate) {
      clockViewModel.shouldAnimate = false;
    } else if (this.cesiumViewer.clockViewModel.canAnimate) {
      clockViewModel.shouldAnimate = true;
    }
  },
  /**
   * 向前飞行漫游路径
   * @method playForwardFly3DPaths
   * @return
   */
  playForwardFly3DPaths: function () {
    var clockViewModel = this.cesiumViewer.clockViewModel;
    var multiplier = clockViewModel.multiplier;
    if (multiplier < 0) {
      clockViewModel.multiplier = -multiplier;
    }
    clockViewModel.shouldAnimate = true;
  },
  /**
   * 向后飞行漫游路径
   * @method playForwardFly3DPaths
   * @return
   */
  playReverseFly3DPaths: function () {
    var clockViewModel = this.cesiumViewer.clockViewModel;
    var multiplier = clockViewModel.multiplier;
    if (multiplier > 0) {
      clockViewModel.multiplier = -multiplier;
    }
    clockViewModel.shouldAnimate = true;
  },
  /**
   * 设定飞行漫游路径
   * @method DrawFly3DPaths
   * @return
   */
  DrawFly3DPaths: function (drawHelper) {
    var T = this;
    this.clearFly3DPaths();
    drawHelper.startDrawingPolyline({
      callback: function (positions) {
        T.drawPolyline = new DrawHelper.PolylinePrimitive({
          positions: positions,
          width: 5,
          type: "plot",
          geodesic: true,
          clampToGround: true, // 是否贴地
        });
        T.cesiumViewer.scene.primitives.add(T.drawPolyline);
        T.drawPolyline.setEditable();
        //构造设定路线的返回信息
        var coordinates = [];
        var position = null;
        var heading = null;
        var pitch = null;
        var roll = null;
        for (var i = 0; i < positions.length; i++) {
          var cartographic = Cesium.Cartographic.fromCartesian(positions[i]); //世界坐标转地理坐标（弧度）
          var point = [
            (cartographic.longitude / Math.PI) * 180,
            (cartographic.latitude / Math.PI) * 180,
          ]; //地理坐标（弧度）转经纬度坐标
          //console.log(point);
          coordinates.push(point);
        }
        //orientation":{"heading":2.411783930363565,"pitch":-0.21097267398444197,"roll":0.0015622392231300353},"position": {"x":-2206260.239730831,"y":5510911.392077349,"z":2331987.10863007},
        position = drawHelper._cameraPosition;
        heading = drawHelper._cameraHeading;
        pitch = drawHelper._cameraPitch;
        roll = drawHelper._cameraRoll;
        var pathsData = {
          orientation: { heading: heading, pitch: pitch, roll: roll },
          position: position,
          geometry: { type: "LineString", coordinates: coordinates },
        };
        if (bxmap.FlyCesium) {
          bxmap.FlyCesium.draw3DObj = T.draw3DObj = pathsData;
          bxmap.FlyCesium.isDrawFly = true;
        }
        //return T.draw3DObj;
      },
    });
  },
  /**
   * 退出飞行漫游路径
   * @method stopFly3DPaths
   * @return
   */
  stopFly3DPaths: function () {
    var start = Cesium.JulianDate.fromDate(new Date());
    this.cesiumViewer.clock.startTime = start.clone();
    var stop = Cesium.JulianDate.addSeconds(
      start,
      300000000,
      new Cesium.JulianDate()
    );
    this.cesiumViewer.clock.stopTime = stop.clone();
    //this.cesiumViewer.entities.remove(this.entityFly);
    this.clearFly3DPaths();
  },
};

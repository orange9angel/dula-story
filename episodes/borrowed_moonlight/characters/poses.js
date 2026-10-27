// 《借走月光的女孩》命名姿势集（spec 数据，buildPose 直接消费）。
// 覆盖圣经表演锁定的最小集：站立 / 走（艾琳短而急步伐）/ 抬头望 / 抱瓶 / 递灯 /
// 摸怀表 / 夫人王座坐姿 / 缓慢抬手。check 工具与 P5 表演谱共用同一数据源。
// 道具态内联在 spec（lamp/bottle 字段由调用方转 setLamp/setBottle，buildPose 忽略）。
import {V} from './rig.js';

export const POSES={
  Eileen:{
    stand:{left:V(-.115,.82,.05),right:V(.13,.865,.055),gR:{fist:.55},headPitch:.02,
      lamp:{hand:'right'}},
    // 走：短而急（strideFactor .55 已在 DIMS），0.8m 直线路径中取中步
    walk:{walk:{from:[0,-.4],to:[0,.4]},rootZ:0,
      left:V(-.11,.84,.10),right:V(.13,.86,-.02),gR:{fist:.55},headPitch:.03,
      lamp:{hand:'right'}},
    look_up:{left:V(-.115,.82,.05),right:V(.13,.865,.055),gR:{fist:.55},
      headPitch:-.38,lean:-.03,lamp:{hand:'right'}},
    // 抱瓶：双手胸前捧瓶（灯先落地——取瓶镜头灯不在手）
    hold_bottle:{left:V(-.075,.95,.16),right:V(.075,.95,.16),
      gL:{open:.35},gR:{open:.35},headPitch:.10,
      lamp:{ground:[.28,0,.10]},bottle:{at:[0,.95,.185]}},
    // 双手递灯（最难姿势：双臂前伸捧起，灯在两手之间，微躬身）
    offer_lamp:{left:V(-.055,.87,.245),right:V(.055,.87,.245),
      leftPole:V(-.3,-.4,-.3),rightPole:V(.3,-.4,-.3),
      gL:{open:.5},gR:{open:.5},headPitch:.14,lean:.08,
      lamp:{at:[0,.80,.28]}},
  },
  Alder:{
    stand:{left:V(-.155,.90,.10),right:V(.155,.90,.10),headPitch:.12},
    // 摸怀表：右手按胸前表串，低头看表（习惯动作）
    touch_watch:{right:V(.075,1.06,.20),rightPole:V(.4,-.3,-.2),gR:{open:.4},
      left:V(-.155,.90,.10),headPitch:.24,headYaw:-.08},
  },
  LadyMoon:{
    stand:{left:V(-.14,1.16,.06),right:V(.14,1.16,.06),gL:{open:.2},gR:{open:.2},headPitch:.02},
    // 王座坐姿（check 工具配 .55 高座凳；viewer 月宫拍 y=.9 由 drive 内置坐姿）
    sit:{sit:{hipY:.10,footY:-.30,footZ:.30},
      left:V(-.13,.42,.10),right:V(.13,.42,.10),gL:{open:.25},gR:{open:.25},
      headPitch:.06,lean:.04},
    // 缓慢抬手（水中飘）：右手极缓抬起到胸前偏上
    slow_raise:{left:V(-.14,1.16,.06),right:V(.10,1.38,.22),
      rightPole:V(.35,-.5,-.3),gR:{open:.45},headPitch:-.06},
  },
};

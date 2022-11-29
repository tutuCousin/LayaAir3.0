
import { Stat } from "../utils/Stat";
import { AnimatorControllerLayer2D } from "./AnimatorControllerLayer2D";
import { AnimatorPlayState2D } from "./AnimatorPlayState2D";
import { AnimatorState2D } from "./AnimatorState2D";
import { Component } from "./Component";
import { KeyframeNode2D } from "./KeyframeNode2D";
import { Node } from "../../laya/display/Node";
import { ClassUtils } from "../utils/ClassUtils";
import { Animation2DParm } from "./Animation2DParm";
import { AnimatorUpdateMode } from "../d3/component/Animator/Animator";
import { AnimatorController2D } from "./AnimatorController2D";
import { AniParmType } from "./AnimatorControllerParse";
import { AnimatorTransition2D } from "./AnimatorTransition2D";
import { KeyframeNodeOwner2D } from "./KeyframeNodeOwner2D";

export class Animator2D extends Component {
    private _speed = 1;

    _controllerLayers: AnimatorControllerLayer2D[];
    /**更新模式*/
    private _updateMode = AnimatorUpdateMode.Normal;
    /**降低更新频率调整值*/
    private _lowUpdateDelty = 20;

    private _isPlaying = true;

    _parameters: Record<string, Animation2DParm>;


    _controller: AnimatorController2D;


    constructor() {
        super();
        this._controllerLayers = [];
        this._parameters = {};
    }


    set controller(val: AnimatorController2D) {
        this._controller = val;
        if (val) {
            val.updateTo(this);
        }
    }
    get controller() {
        return this._controller;
    }

    set parameters(val: Record<string, Animation2DParm>) {
        this._parameters = val;
    }
    get parameters() {
        return this._parameters;
    }


    set speed(num: number) {
        this._speed = num;
    }

    get speed() {
        return this._speed;
    }
    play(name?: string, layerIndex = 0, normalizedTime: number = Number.NEGATIVE_INFINITY) {
        this._isPlaying = true;
        var controllerLayer = this._controllerLayers[layerIndex];
        if (controllerLayer) {
            var defaultState = controllerLayer.defaultState;
            if (!name && !defaultState)
                throw new Error("Animator:must have default clip value,please set clip property.");

            var playStateInfo = controllerLayer._playStateInfo!;
            var curPlayState = playStateInfo._currentState!;
            var animatorState = name ? controllerLayer.getStateByName(name) : defaultState;

            if (!animatorState._clip)
                return;



            var clipDuration = animatorState._clip!._duration;
            var calclipduration = animatorState._clip!._duration * (animatorState.clipEnd - animatorState.clipStart);

            // this.resetDefOwerVal();
            // playStateInfo._resetPlayState(0.0, calclipduration);
            // if (curPlayState != animatorState) {
            //     playStateInfo._currentState = animatorState;
            // }
            // controllerLayer._playType = 0;



            if (curPlayState !== animatorState) {
                if (normalizedTime !== Number.NEGATIVE_INFINITY)
                    playStateInfo._resetPlayState(clipDuration * normalizedTime, calclipduration);
                else
                    playStateInfo._resetPlayState(0.0, calclipduration);
                (curPlayState !== null && curPlayState !== animatorState) && (this._revertDefaultKeyframeNodes(curPlayState));
                controllerLayer._playType = 0;
                playStateInfo._currentState = animatorState;
            } else {
                if (normalizedTime !== Number.NEGATIVE_INFINITY) {
                    playStateInfo._resetPlayState(clipDuration * normalizedTime, calclipduration);
                    controllerLayer._playType = 0;
                }
            }
            animatorState._eventStart();






        }
        var scripts = animatorState._scripts!;
        if (scripts) {
            for (var i = 0, n = scripts.length; i < n; i++)
                scripts[i].onStateEnter();
        }
    }

    /**
     * @internal
     */
    private _revertDefaultKeyframeNodes(clipStateInfo: AnimatorState2D): void {
        //TODO...
    }

    stop() {
        this._isPlaying = false;
    }

    /**
     * 是否正在播放中
     */
    get isPlaying() {
        return this._isPlaying;
    }

    onUpdate(): void {
        if (!this._isPlaying) return;
        var delta = this.owner.timer._delta / 1000.0;
        delta = this._applyUpdateMode(delta);
        if (0 == this.speed || 0 == delta) return;
        var needRender = true;//TODO:有渲染节点才可将needRender变为true

        for (var i = 0, n = this._controllerLayers.length; i < n; i++) {
            var controllerLayer = this._controllerLayers[i];
            if (!controllerLayer.enable)
                continue;


            var playStateInfo = controllerLayer._playStateInfo!;
            //var crossPlayStateInfo = controllerLayer._crossPlayStateInfo!;
            var addtive = controllerLayer.blendingMode != AnimatorControllerLayer2D.BLENDINGMODE_OVERRIDE;
            switch (controllerLayer._playType) {
                case 0:
                    var animatorState = playStateInfo._currentState!;
                    var speed = this._speed * animatorState.speed;
                    var finish = playStateInfo._finish;

                    var loop = animatorState.loop;
                    if (-1 >= loop) {
                        var clip = animatorState._clip!;
                        if (clip.islooping) {
                            loop = 0;
                        } else {
                            loop = 1;
                        }
                    }

                    let dir = 1;
                    if (!playStateInfo._frontPlay) {
                        dir = -1;
                    }


                    finish || this._updatePlayer(animatorState, playStateInfo, delta * speed * dir, loop, i);
                    if (needRender) {
                        this._updateClipDatas(animatorState, addtive, playStateInfo);
                        this._setClipDatasToNode(animatorState, addtive, controllerLayer.defaultWeight, i == 0, controllerLayer);//多层动画混合时即使动画停止也要设置数据
                    }




                    break;
            }

        }

    }
    set debug(b: boolean) {
        this._isPlaying = b;

        if (b) {
            this.owner.timer.frameLoop(1, this, this.onUpdate);
            this.onEnable();
        } else {
            this.stop();
        }
    }











    /**
     * 添加控制器层。
     */
    addControllerLayer(controllderLayer: AnimatorControllerLayer2D): void {
        this._controllerLayers.push(controllderLayer);
    }



    /**
   * 赋值Node数据
   * @param stateInfo 动画状态
   * @param additive 是否为addtive
   * @param weight state权重
   * @param isFirstLayer 是否是第一层
   */
    private _setClipDatasToNode(stateInfo: AnimatorState2D, additive: boolean, weight: number, isFirstLayer: boolean, controllerLayer: AnimatorControllerLayer2D = null): void {
        var realtimeDatas = stateInfo._realtimeDatas;
        var nodes = stateInfo._clip!._nodes!;
        for (var i = 0, n = nodes.count; i < n; i++) {
            var node = nodes.getNodeByIndex(i);
            var o = this.getOwner(node);
            o && this._applyFloat(o, additive, weight, isFirstLayer, realtimeDatas[i]);
        }
    }
    private _applyFloat(o: { ower: Node, pro?: { ower: any, key: string, defVal: any } }, additive: boolean, weight: number, isFirstLayer: boolean, data: string | number | boolean): void {
        var pro = o.pro;
        if (pro && pro.ower) {
            if (additive && "number" == typeof data) {
                pro.ower[pro.key] = pro.defVal + weight * data;
            } else if ("number" == typeof data) {
                pro.ower[pro.key] = weight * data;
            } else {
                pro.ower[pro.key] = data;
            }
        }


        // for (var i = pro.length - 1; i >= 0; i--) {

        //     if (additive && "number" == typeof data) {
        //         (o.ower as any)[pro[i].name] = pro[i].defVal + data;
        //     } else
        //         (o.ower as any)[pro[i].name] = data;
        // }
    }

    private resetDefOwerVal() {
        if (this._ownerMap) {
            this._ownerMap.forEach((val, key) => {
                var pro = val.pro;
                if (pro.ower) {
                    pro.defVal = pro.ower[pro.key];
                }

                // for (var i = pro.length - 1; i >= 0; i--) {
                //     pro[i].defVal = (ower as any)[pro[i].name]
                // }
            })
        }
    }


    private _ownerMap: Map<KeyframeNode2D, { ower: Node, pro?: { ower: any, key: string, defVal: any } }>
    private getOwner(node: KeyframeNode2D) {
        var ret: { ower: Node, pro?: { ower: any, key: string, defVal: any } };
        if (this._ownerMap) {
            ret = this._ownerMap.get(node);
            if (ret) {
                return ret;
            }
        }



        var property = this.owner;
        for (var j = 0, m = node.ownerPathCount; j < m; j++) {
            var ownPat = node.getOwnerPathByIndex(j);
            if ("" == ownPat) {
                continue;
            } else {
                property = property.getChildByName(ownPat);
                if (!property)
                    break;
            }
        }

        ret = { ower: property };

        if (property) {
            var pobj: any = property;
            var propertyCount = node.propertyCount;

            if (1 == propertyCount) {
                var pname = node.getPropertyByIndex(0);
                ret.pro = { ower: property, key: pname, defVal: (property as any)[pname] };
            } else {
                for (var i = 0; i < propertyCount; i++) {
                    var pname = node.getPropertyByIndex(i);

                    if (i == propertyCount - 1 || null == pobj) {
                        ret.pro = { ower: pobj, key: pname, defVal: pobj ? pobj[pname] : null }
                        break;
                    }

                    if (null == pobj[pname] && property == pobj) {
                        //有可能是组件,查找组件逻辑
                        pobj = null;
                        var classObj = ClassUtils.getClass(pname);
                        if (classObj) {
                            pobj = property.getComponent(classObj);
                        }

                    } else {
                        pobj = pobj[pname];
                    }
                }
            }

        }
        if (null == this._ownerMap) {
            this._ownerMap = new Map();
        }
        this._ownerMap.set(node, ret);
        return ret;


    }

    // private _addKeyframeNodeOwner(node: KeyframeNode2D, propertyOwner: any): void {
    // }



    /**
  * 更新clip数据
  * @internal
  */
    private _updateClipDatas(animatorState: AnimatorState2D, addtive: boolean, playStateInfo: AnimatorPlayState2D): void {
        var clip = animatorState._clip;
        var clipDuration = clip!._duration;

        var curPlayTime = animatorState.clipStart * clipDuration + playStateInfo._normalizedPlayTime * playStateInfo._duration;
        var currentFrameIndices = animatorState._currentFrameIndices;
        //var frontPlay = playStateInfo._frontPlay;
        let frontPlay = true;
        clip!._evaluateClipDatasRealTime(curPlayTime, currentFrameIndices, addtive, frontPlay, animatorState._realtimeDatas);
    }


    private _updatePlayer(animatorState: AnimatorState2D, playState: AnimatorPlayState2D, elapsedTime: number, loop: number, layerIndex: number): void {

        let isReplay = false;
        var clipDuration = animatorState._clip!._duration * (animatorState.clipEnd - animatorState.clipStart);


        var lastElapsedTime = playState._elapsedTime;

        let pAllTime = playState._playAllTime;

        playState._playAllTime += Math.abs(elapsedTime);


        //动画播放总时间
        elapsedTime = lastElapsedTime + elapsedTime;
        //动画播放的上次总时间
        playState._lastElapsedTime = lastElapsedTime;
        playState._elapsedTime = elapsedTime;
        var normalizedTime = elapsedTime / clipDuration;



        //总播放次数
        let pTime = playState._playAllTime / clipDuration;

        if (Math.floor(pAllTime / clipDuration) < Math.floor(pTime)) {
            isReplay = true;
        }




        var playTime = normalizedTime % 1.0;
        playState._normalizedPlayTime = playTime < 0 ? playTime + 1.0 : playTime;
        playState._duration = clipDuration;




        animatorState._eventStateUpdate(playState._normalizedPlayTime);
        let ret = this._applyTransition(layerIndex, animatorState._eventtransition(playState._normalizedPlayTime, this.parameters, isReplay));

        if (!ret && isReplay) {
            if (0 < loop && loop <= normalizedTime) {
                playState._finish = true;

                playState._elapsedTime = clipDuration;
                playState._normalizedPlayTime = 1;

                animatorState._eventExit();
                return;
            }
        } else if (ret) {
            //是否应该先exit？
            animatorState._eventExit();
        }



        // var isPlayFin = false;

        // if (elapsedTime >= clipDuration) {
        //     if (animatorState.yoyo) {
        //         if (!playState._frontPlay) {
        //             if (elapsedTime >= clipDuration * 2) {
        //                 playState._elapsedTime = 0;
        //                 playState._normalizedPlayTime = 0;
        //                 playState._frontPlay = true;
        //                 playState._playNum += 1;
        //                 isPlayFin = true;
        //             }
        //         } else {
        //             playState._frontPlay = false;
        //             if (!playState._frontPlay) {
        //                 playState._elapsedTime = clipDuration;
        //                 playState._normalizedPlayTime = 1;
        //             }
        //         }

        //     } else {
        //         playState._playNum += 1;
        //         isPlayFin = true;
        //         playState._elapsedTime = clipDuration;
        //         playState._normalizedPlayTime = 1;
        //     }
        // }

        // if (!playState._frontPlay && playState._elapsedTime != clipDuration) {
        //     playState._normalizedPlayTime = 1 - playState._normalizedPlayTime;
        // }


        // if (isPlayFin) {
        //     if (0 != loop && playState._playNum >= loop) {
        //         playState._finish = true;
        //     } else {
        //         playState._elapsedTime = 0;
        //         playState._normalizedPlayTime = 0;
        //     }

        // }
        // var scripts = animatorState._scripts;
        // if (scripts) {
        //     for (var i = 0, n = scripts.length; i < n; i++) {
        //         if (isPlayFin) {
        //             scripts[i].onStateExit();
        //         } else {
        //             scripts[i].onStateUpdate();
        //         }
        //     }
        // }




    }

    /**
     * 启用过渡
     * @param layerindex 
     * @param transition 
     * @returns 
     */
    private _applyTransition(layerindex: number, transition: AnimatorTransition2D) {
        if (!transition)
            return false;
        return this.crossFade(transition.destState.name, transition.transduration, layerindex, transition.transstartoffset);
    }


    /**
     * 在当前动画状态和目标动画状态之间进行融合过渡播放。
     * @param	name 目标动画状态。
     * @param	transitionDuration 过渡时间,该值为当前动画状态的归一化时间，值在0.0~1.0之间。
     * @param	layerIndex 层索引。
     * @param	normalizedTime 归一化的播放起始时间。
     */
    crossFade(name: string, transitionDuration: number, layerIndex: number = 0, normalizedTime: number = Number.NEGATIVE_INFINITY) {
        var controllerLayer = this._controllerLayers[layerIndex];
        if (controllerLayer) {
            var destAnimatorState = controllerLayer.getStateByName(name);
            if (destAnimatorState) {

                this.play(name, layerIndex, normalizedTime);
                return true;

            }
            else {
                console.warn("Invalid layerIndex " + layerIndex + ".");
            }
        }
        return false;
    }



    private _applyUpdateMode(delta: number): number {
        let ret;
        switch (this._updateMode) {
            case AnimatorUpdateMode.Normal:
                ret = delta;
                break;
            case AnimatorUpdateMode.LowFrame:
                ret = (Stat.loopCount % this._lowUpdateDelty == 0) ? delta * this._lowUpdateDelty : 0;
                break;
            case AnimatorUpdateMode.UnScaleTime:
                ret = 0;
                break;
        }
        return ret;
    }

    /** @internal */
    onAfterDeserialize(): void {
        let arr = (<any>this).controllerLayers;
        if (!arr || null != this.controller)
            return;
        delete (<any>this).controllerLayers;
        this._controllerLayers.length = 0;
        for (let layer of arr) {
            this.addControllerLayer(layer);
        }
    }

    onEnable() {
        if (this._isPlaying) {
            for (var i = 0, n = this._controllerLayers.length; i < n; i++) {
                if (this._controllerLayers[i].playOnWake) {
                    var defaultClip = this.getDefaultState(i);
                    (defaultClip) && (this.play(null, i));
                }
            }
        }
    }
    getDefaultState(layerIndex = 0) {
        var controllerLayer = this._controllerLayers[layerIndex];
        return controllerLayer.defaultState;
    }

    setParamsTrigger(name: string) {
        this._parameters[name] = { name: name, type: AniParmType.Trigger, value: true };
    }
    setParamsNumber(name: string, value: number) {
        this._parameters[name] = { name: name, type: AniParmType.Float, value: value };
    }
    setParamsBool(name: string, value: boolean) {
        this._parameters[name] = { name: name, type: AniParmType.Float, value: value };
    }
    getParamsvalue(name: number) {
        let parm = this._parameters[name];
        if (parm) {
            return parm.value;
        }
        return null;
    }



    onDestroy() {
        for (var i = 0, n = this._controllerLayers.length; i < n; i++)
            this._controllerLayers[i].destroy();
        this._controllerLayers.length = 0;
        this._isPlaying = false;
        this._parameters = null;
    }
}
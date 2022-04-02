import { SingletonList } from "../../../d3/component/SingletonList";
import { BufferState } from "../../../d3/core/BufferState";
import { DrawType } from "../../RenderEnum/DrawType";
import { IndexFormat } from "../../RenderEnum/IndexFormat";
import { MeshTopology } from "../../RenderEnum/RenderPologyMode";

export interface IRenderGeometryElement{
    bufferState:BufferState;
    mode:MeshTopology;
    drawType:DrawType;
    drawParams:SingletonList<number>;
    instanceCount:number;
    indexFormat:IndexFormat;
    setDrawArrayParams(first: number, count: number):void;
    setDrawElemenParams(count: number, offset: number):void;
    clearRenderParams():void;
    destroy():void;
}